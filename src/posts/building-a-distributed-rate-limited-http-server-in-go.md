---
title: "building a distributed rate-limited http server in go"
date: "2026-06-11"
description: "i built a go http server with distributed rate limiting via redis and lua, context timeouts, prometheus metrics, graceful shutdown, and load tested it at ~7,600 rps."
---

i wanted to understand what happens inside a normal http api after the route matches but before the response leaves the process.

using a framework would have hidden too much. i needed a server small enough to hold in my head, but real enough to make me deal with concurrency, distributed state, request limits, bad input, shutdown, and tests.

so i built a user api in go with a redis-backed rate limiter, prometheus metrics, and enough load testing to prove it works under pressure.

[source code](https://github.com/sYanXO/http-server-scratch).

## the shape of the server

four routes, plus a prometheus metrics endpoint:

```go
mux.Handle("/", wrap(http.HandlerFunc(handlers.HandleRoot)))
mux.Handle("POST /users", wrap(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    handlers.CreateUser(w, r, userStore)
})))
mux.Handle("GET /users/{id}", wrap(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    handlers.GetUser(w, r, userStore)
})))
mux.Handle("DELETE /users/{id}", wrap(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    handlers.DeleteUser(w, r, userStore)
})))
mux.Handle("/metrics", promhttp.Handler())
```

small surface area. the interesting part is where each responsibility lives:

- `cmd/server`: process startup, route wiring, shutdown
- `internal/handlers`: http input and output
- `internal/store`: shared in-memory user state
- `internal/middleware`: rate limit enforcement with fail-open/fail-closed
- `internal/rate-limiter`: redis client, lua script, `Limiter` interface
- `internal/metrics`: prometheus counters, histograms, and a response-capturing middleware

that split gave me enough structure without turning the project into a ceremony generator.

## routing stayed boring on purpose

go's `http.ServeMux` is good enough here.

recent go versions support method-aware patterns like `POST /users` and path values like `/users/{id}`. that means i could write normal handlers without pulling in a router package just to extract one integer.

```go
id, err := strconv.Atoi(r.PathValue("id"))
if err != nil {
    http.Error(w, "invalid user id", http.StatusBadRequest)
    return
}
```

dependencies should earn their place. for this project, the standard library already had the routing features i needed.

## concurrency shows up at the store

the user store is a map:

```go
type UserStore struct {
    mu     sync.RWMutex
    users  map[int]User
    nextID int
}
```

a map is fine until more than one request touches it at once.

`POST /users` writes. `GET /users/{id}` reads. `DELETE /users/{id}` writes. under concurrent traffic, the store needs a lock.

i used an `RWMutex` because reads can share the lock while writes need exclusive access:

```go
func (s *UserStore) Get(id int) (User, bool) {
    s.mu.RLock()
    defer s.mu.RUnlock()

    user, ok := s.users[id]
    return user, ok
}
```

without the mutex, the code can panic or return nonsense under load. with the mutex, the boundary is obvious. shared state needs a rule. the lock is the rule.

## request bodies deserve suspicion

the create handler does more than decode json. it limits the body size:

```go
r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
```

it rejects unknown fields:

```go
dec := json.NewDecoder(r.Body)
dec.DisallowUnknownFields()
```

and it rejects multiple json objects in one request body:

```go
if err := dec.Decode(&struct{}{}); err != io.EOF {
    http.Error(w, "body must contain a single JSON object", http.StatusBadRequest)
    return
}
```

that last check feels tiny, but it changes the contract. the handler accepts one user object, not one user object plus extra junk after it.

input validation is where a server decides how much weirdness it is willing to accept.

## the rate limiter moved to redis

my first version used an in-memory token bucket. it worked fine for a single process, then became fake the moment you imagined two instances.

instance A would allow a request because its local counter looked fine. instance B would do the same a millisecond later. both were technically correct. operationally the limiter was a suggestion.

so i pushed the bucket into redis and made the whole check-and-consume atomic with a lua script. i wrote about the lua script in detail in a [separate post](/blog/redis-token-bucket-rate-limiter-in-go). the short version:

```lua
local bucket = redis.call("HMGET", key, "tokens", "last_refill")
local tokens = capacity
local last_refill = now

if bucket[1] then
    tokens = tonumber(bucket[1])
    last_refill = tonumber(bucket[2])
end

local elapsed = (now - last_refill) / 1000.0
local tokens_to_add = elapsed * refill_rate
tokens = math.min(capacity, tokens + tokens_to_add)

local allowed = 0
if tokens >= 1 then
    tokens = tokens - 1
    allowed = 1
end

redis.call("HMSET", key, "tokens", tokens, "last_refill", now)
redis.call("EXPIRE", key, ttl)
```

redis runs the entire script as one atomic operation. no other command can interleave. two concurrent requests from the same IP can never both see `tokens = 1` and both pass.

the rate limiter is behind a `Limiter` interface, so swapping implementations (or mocking in tests) is straightforward:

```go
type Limiter interface {
    Allow(ctx context.Context, identifier string) (bool, error)
}
```

the `RedisLimiter` implements this by computing `now` in milliseconds, building the redis key, and running the lua script:

```go
func (rl *RedisLimiter) Allow(ctx context.Context, identifier string) (bool, error) {
    now := time.Now().UnixMilli()
    key := fmt.Sprintf("rate_limit:%s", identifier)

    result, err := rl.luaScript.Run(ctx, rl.client, []string{key},
        rl.capacity, rl.refillRate, now).Result()
    if err != nil {
        return false, fmt.Errorf("redis rate limit check failed: %w", err)
    }

    allowed, ok := result.(int64)
    if !ok {
        return false, fmt.Errorf("unexpected redis response")
    }

    return allowed == 1, nil
}
```

one method, one question, one answer. the middleware never needs to know about refill math, redis hashes, or lua.

## context timeouts prevent cascading failures

the middleware wraps every redis call with a strict 50ms context deadline:

```go
ctx, cancel := context.WithTimeout(r.Context(), 50*time.Millisecond)
defer cancel()

allowed, err := l.Allow(ctx, ip)
```

without that, a redis network hang would block the handler goroutine indefinitely. under load, blocked goroutines pile up, memory climbs, and eventually the server stops responding to anyone (including requests that never needed redis).

50ms is generous for a local redis call that normally takes sub-millisecond. if it takes longer than that, something is wrong and the server should make a decision rather than wait.

## failing open is a policy decision

when redis is unreachable and the context deadline fires, the middleware has to pick: block the request or let it through?

the middleware takes a `failOpen` boolean so the caller controls the policy:

```go
if err != nil {
    if failOpen {
        next.ServeHTTP(w, r)
        return
    }
    http.Error(w, "Rate limiting service unavailable", http.StatusServiceUnavailable)
    return
}
```

right now it fails open. if redis is down, requests pass through unthrottled.

that is acceptable for a general api where availability matters more than strict fairness. for auth endpoints, billing routes, or anything abuse-prone, you would fail closed instead. denying some good traffic is often cheaper than allowing unbounded bad traffic.

the code change is one boolean. the hard part is deciding what failure mode your product can tolerate.

## prometheus metrics

i wanted to know what the server was doing under load without tailing logs. so i added prometheus instrumentation.

three metrics cover the important questions:

```go
HttpRequestsTotal = promauto.NewCounterVec(
    prometheus.CounterOpts{
        Name: "http_requests_total",
        Help: "Total number of HTTP requests",
    },
    []string{"method", "endpoint", "status_code"},
)

RateLimitRejectionsTotal = promauto.NewCounter(
    prometheus.CounterOpts{
        Name: "rate_limit_rejections_total",
        Help: "Total number of requests rejected by the rate limiter",
    },
)

HttpRequestDuration = promauto.NewHistogramVec(
    prometheus.HistogramOpts{
        Name:    "http_request_duration_seconds",
        Help:    "HTTP request latency in seconds",
        Buckets: prometheus.DefBuckets,
    },
    []string{"method", "endpoint"},
)
```

`http_requests_total` tells me how much traffic each endpoint gets and how it responds. `rate_limit_rejections_total` tracks how aggressively the limiter is firing. `http_request_duration_seconds` gives latency percentiles per endpoint.

the metrics middleware wraps the entire mux and uses a custom `responseWriter` to capture status codes without changing how handlers behave:

```go
handler := metrics.MetricsMiddleware(mux)
```

scraping `/metrics` with prometheus (or just curling it during a load test) gives real numbers instead of guesses.

## graceful shutdown

the server starts in a goroutine:

```go
go func() {
    if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
        fmt.Println(err)
    }
}()
```

then the main goroutine waits for `SIGINT` or `SIGTERM`.

```go
quit := make(chan os.Signal, 1)
signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
<-quit
```

on shutdown, it gives the server five seconds to stop accepting new work and finish active requests:

```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

server.Shutdown(ctx)
```

during load testing this mattered a lot. i could stop the server mid-benchmark without dropping connections or corrupting state.

## tests

the handler tests use `httptest`, which means they run without opening a real port. that forced the design into cleaner pieces: handlers accept a `UserStore`, middleware accepts a `Limiter`, and the mux assembles the same way in a test as in `main`.

```go
req := httptest.NewRequest(http.MethodPost, "/users", strings.NewReader(`{"name":"Alice"}`))
rr := httptest.NewRecorder()
mux.ServeHTTP(rr, req)
```

handler tests cover the full user lifecycle (create, fetch, delete, fetch again and expect `404`) plus input validation: empty names, unknown fields, multiple json objects, invalid IDs.

the store tests exercise CRUD and verify that deleting a missing user returns false.

the rate limiter tests hit real redis. one test exhausts the bucket and confirms the next request gets denied. another drains the bucket, sleeps just over a second, and confirms the refill let one more request through:

```go
for i := 0; i < 5; i++ {
    rl.Allow(ctx, key, 5, 1, 1)
}

allowed, _ := rl.Allow(ctx, key, 5, 1, 1)
if allowed {
    t.Error("should be denied when bucket is empty")
}

time.Sleep(1100 * time.Millisecond)

allowed, err := rl.Allow(ctx, key, 5, 1, 1)
if !allowed {
    t.Error("should be allowed after refill")
}
```

integration tests like these are slower, but they test what actually matters: the lua script running inside real redis, not a mock pretending to be redis.

## load testing with k6

i used [k6](https://k6.io/) to simulate 50 concurrent virtual users hammering the api for 30 seconds:

```js
export default function () {
  let res = http.get('http://localhost:8080/users/1');

  check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
  });
}
```

the results:

| metric | value |
|---|---|
| total requests | ~252,000 |
| throughput | ~7,660 RPS |
| median latency | 4.72 ms |
| p95 latency | 13.65 ms |
| error rate | 0% |

rate-limited responses came back as proper `429`s with `Retry-After` headers. no dropped connections, no crashes, no goroutine leaks. even when the server was actively rejecting ~90% of incoming traffic, latency stayed low. the bottleneck was redis round-trip time, not lock contention in go.

## what stuck with me

moving the rate limiter from in-memory to redis forced me to think about atomicity at a different level: not mutex locks in a single process, but transactional guarantees across a network boundary. the lua script is maybe 20 lines, but it eliminates an entire class of race conditions that no amount of careful go code could fix alone.

the context timeout was a small addition that changed how i think about external dependencies. every call across a network is a promise that might not come back. putting a deadline on it turns an unbounded risk into a bounded one.

and the load test turned speculation into numbers. the server handles ~7,600 requests per second with sub-5ms median latency, and i know exactly where it starts to push back.

the full source is [here](https://github.com/sYanXO/http-server-scratch).
