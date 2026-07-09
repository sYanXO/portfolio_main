---
title: "building a distributed rate-limited http server in go"
date: "2026-06-11"
description: "i built a go http server with distributed rate limiting via redis and lua, context timeouts, prometheus metrics, graceful shutdown, and load tested it at ~7,600 rps."
---

most web frameworks hide how requests flow through a server. to understand what happens between routing a request and returning a response, i built a simple user api in go from scratch. i wanted to deal with concurrent state, distributed rate limiting, timeouts, and graceful shutdown myself.

here is the [source code](https://github.com/sYanXO/http-server-scratch).

## the shape of the server

the server exposes four routes and a metrics endpoint:

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

the project structure keeps responsibilities separated:

- `cmd/server` handles startup, route wiring, and shutdown.
- `internal/handlers` processes incoming requests and formats responses.
- `internal/store` manages shared user state in memory.
- `internal/middleware` enforces rate limits.
- `internal/rate-limiter` talks to redis and runs rate-limit checks.
- `internal/metrics` tracks performance data for prometheus.

this layout provides organization without unnecessary boilerplate.

## using standard library routing

the standard `http.ServeMux` works well enough. recent go releases support method-aware patterns and path values, so i could write standard handlers without importing a routing library just to extract integers.

```go
id, err := strconv.Atoi(r.PathValue("id"))
if err != nil {
    http.Error(w, "invalid user id", http.StatusBadRequest)
    return
}
```

the standard library had all the routing features needed for this.

## protecting shared state

the user store uses a basic map:

```go
type UserStore struct {
    mu     sync.RWMutex
    users  map[int]User
    nextID int
}
```

since multiple requests read and write concurrently, the map needs a lock to prevent race conditions and panics. i used an `RWMutex` so multiple reads can run concurrently while writes get exclusive access.

```go
func (s *UserStore) Get(id int) (User, bool) {
    s.mu.RLock()
    defer s.mu.RUnlock()

    user, ok := s.users[id]
    return user, ok
}
```

this lock ensures all state updates remain safe under load.

## validating request bodies

the handler limits the request body to 1MB and rejects unexpected json fields to prevent memory bloat and API contract drift:

```go
r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
dec := json.NewDecoder(r.Body)
dec.DisallowUnknownFields()
```

it also checks that the body contains only one json object:

```go
if err := dec.Decode(&struct{}{}); err != io.EOF {
    http.Error(w, "body must contain a single JSON object", http.StatusBadRequest)
    return
}
```

this stops clients from trailing extra payload after the valid json object.

## rate limiting with redis and lua

an in-memory token bucket works for a single process, but it fails once you run multiple instances. if a load balancer routes requests across different nodes, each node only tracks its local bucket, allowing clients to bypass the limit.

to fix this, i moved the bucket state to redis. running the check-and-refill logic in a lua script makes the entire operation atomic:

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

redis runs this script atomically, preventing concurrent requests from racing to read and update the same key.

the rate limiter is behind an interface, which makes it easy to mock in tests:

```go
type Limiter interface {
    Allow(ctx context.Context, identifier string) (bool, error)
}
```

the implementation computes the current time, constructs the redis key, and executes the lua script:

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

the middleware just calls `Allow` and gets a true or false answer, hiding all redis details.

## timeouts for redis queries

to prevent redis latency from blocking server threads, the middleware wraps every rate-limit check in a 50ms context deadline:

```go
ctx, cancel := context.WithTimeout(r.Context(), 50*time.Millisecond)
defer cancel()

allowed, err := l.Allow(ctx, ip)
```

without a timeout, a slow redis query or network lag would block handler goroutines indefinitely. under load, these blocked routines pile up, consume memory, and can crash the process. 50ms is plenty of time for a normal redis query; if it takes longer, the server needs to stop waiting and handle the failure.

## choosing a failure policy

if redis times out or fails, the middleware must decide whether to let the request pass or reject it. a `failOpen` flag configures this choice:

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

failing open keeps the api responsive during redis outages, which is usually fine for public resource endpoints. for auth or payment endpoints, failing closed is safer because it prevents abuse when rate limiting is down.

## tracking metrics

i added prometheus metrics to track behavior under load without parsing logs. three metrics cover the server:

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

a custom response writer wraps standard response writers to record status codes without altering handler behavior, and a middleware uses this wrapper around the main router:

```go
handler := metrics.MetricsMiddleware(mux)
```

scraping the `/metrics` endpoint during load testing shows actual throughput and latency percentiles.

## shutting down cleanly

the server starts in a separate goroutine:

```go
go func() {
    if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
        fmt.Println(err)
    }
}()
```

the main thread blocks on operating system signals:

```go
quit := make(chan os.Signal, 1)
signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
<-quit
```

on interrupt, the server gets five seconds to finish processing active requests before shutting down completely:

```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

server.Shutdown(ctx)
```

this prevents dropped connections or state corruption if the server restarts under load.

## running tests

handler tests run using the standard `httptest` package, which simulates requests without opening network ports. passing dependencies (like the store and limiter) into the handlers and middleware makes this layout simple to test:

```go
req := httptest.NewRequest(http.MethodPost, "/users", strings.NewReader(`{"name":"Alice"}`))
rr := httptest.NewRecorder()
mux.ServeHTTP(rr, req)
```

the handler tests cover routing, validation errors, and lifecycle paths. the rate limiter tests talk to a real redis container to verify that the bucket refills and enforces limits as expected:

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

testing with real redis ensures that the lua script runs correctly.

## load testing results

i used k6 to run a benchmark with 50 concurrent clients requesting a single user endpoint for 30 seconds:

```js
export default function () {
  let res = http.get('http://localhost:8080/users/1');

  check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
  });
}
```

the metrics:

| metric | value |
|---|---|
| total requests | ~252,000 |
| throughput | ~7,660 RPS |
| median latency | 4.72 ms |
| p95 latency | 13.65 ms |
| error rate | 0% |

rate-limited requests returned `429` responses with `Retry-After` headers. the server handled the load without crashing or leaking goroutines. latency stayed low because the primary bottleneck was redis network latency rather than lock contention in the go application.

## next steps

the rate limiter currently runs against a single redis instance. scaling the server further requires testing a clustered redis setup or a cluster-aware rate-limiting library to see how the connection pool behaves under heavier load.

the repository with the complete server and benchmark scripts is on [github](https://github.com/sYanXO/http-server-scratch).
