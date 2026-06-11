---
title: "building a small http server in go"
date: "2026-06-11"
description: "i built a small go http server to understand routing, middleware, graceful shutdown, and the parts that get weird once requests overlap."
---

i wanted to understand what happens inside a normal http api after the route matches but before the response leaves the process.

using a framework would have hidden too much. i did not need another todo api with magic sprinkled on top. i needed a server small enough to hold in my head, but real enough to make me deal with concurrency, request limits, bad input, shutdown, and tests.

so i built a tiny user api in go.

[source code](https://github.com/sYanXO/http-server-scratch).

## the shape of the server

The server has four routes:

```go
mux.Handle("/", wrap(http.HandlerFunc(handlers.HandleRoot)))
mux.Handle("POST /users", wrap(http.HandlerFunc(createUser)))
mux.Handle("GET /users/{id}", wrap(http.HandlerFunc(getUser)))
mux.Handle("DELETE /users/{id}", wrap(http.HandlerFunc(deleteUser)))
```

That is not a lot of surface area, which is the point.

The interesting part is not CRUD. The interesting part is where each responsibility lives:

- `cmd/server`: process startup, route wiring, shutdown
- `internal/handlers`: http input and output
- `internal/store`: shared in-memory user state
- `internal/middleware`: cross-cutting request behavior
- `internal/rate-limiter`: per-client token buckets

That split gave me enough structure without turning the project into a ceremony generator.

## routing stayed boring on purpose

Go's `http.ServeMux` is good enough here.

Recent Go versions support method-aware patterns like `POST /users` and path values like `/users/{id}`. That means I could write normal handlers without pulling in a router package just to extract one integer.

```go
id, err := strconv.Atoi(r.PathValue("id"))
if err != nil {
    http.Error(w, err.Error(), http.StatusBadRequest)
    return
}
```

There is a small lesson here: dependencies should earn their place.

For this project, the standard library already had the routing features I needed. Adding a router would have made the code look more familiar, not more useful.

## the store is where concurrency shows up first

The user store is just a map:

```go
type UserStore struct {
    mu     sync.RWMutex
    users  map[int]User
    nextID int
}
```

A map is fine until more than one request touches it at once.

`POST /users` writes. `GET /users/{id}` reads. `DELETE /users/{id}` writes. Under concurrent traffic, that means the store needs a lock.

I used an `RWMutex` because reads can share the lock, while writes need exclusive access:

```go
func (s *UserStore) Get(id int) (User, bool) {
    s.mu.RLock()
    defer s.mu.RUnlock()

    user, ok := s.users[id]
    return user, ok
}
```

This is the part I like about small projects. The bug is not abstract. Without the mutex, the code can panic or return nonsense under load. With the mutex, the boundary is obvious.

Shared state needs a rule. The lock is the rule.

## request bodies deserve suspicion

The create handler does more than decode JSON.

It limits the body size:

```go
r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
```

It rejects unknown fields:

```go
dec := json.NewDecoder(r.Body)
dec.DisallowUnknownFields()
```

It also rejects multiple JSON objects in one request body:

```go
if err := dec.Decode(&struct{}{}); err != io.EOF {
    http.Error(w, "body must contain a single JSON object", http.StatusBadRequest)
    return
}
```

That last check feels tiny, but it changes the contract. The handler accepts one user object. Not one user object plus extra junk after it.

I used to treat decoding as the boring part. It is not. Input validation is where a server decides how much weirdness it is willing to accept.

## middleware is just function wrapping

The rate limiter sits in middleware because every route should get the same protection.

```go
func RateLimitMiddleware(l *Limiter) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            ip, _, err := net.SplitHostPort(r.RemoteAddr)
            if err != nil {
                http.Error(w, "unable to get client ip", http.StatusInternalServerError)
                return
            }

            if !l.Allow(ip) {
                http.Error(w, "too many requests", http.StatusTooManyRequests)
                return
            }

            next.ServeHTTP(w, r)
        })
    }
}
```

That is the whole pattern.

A middleware receives a handler, returns another handler, and decides whether the request gets to continue.

Once I wrote it by hand, the framework version stopped feeling magical. It is just a stack of functions passing the request along until one of them says no.

## the rate limiter is a token bucket

Each IP gets a bucket.

```go
type Bucket struct {
    tokens         int
    lastRefillTime time.Time
}
```

The limiter has a capacity and a refill rate. New requests spend one token. Time adds tokens back.

```go
elapsed := now.Sub(b.lastRefillTime).Seconds()
refilled := int(elapsed * l.refillRate)
```

If the bucket has no tokens, the middleware returns `429 Too Many Requests`.

The important bit is that the limiter has its own mutex:

```go
l.mu.Lock()
defer l.mu.Unlock()
```

Without that, two requests from the same IP could observe the same token count and both pass. Rate limiters are tiny concurrency systems. If the decision is not atomic, the limit is a suggestion.

This version is in-memory, so it only works inside one server process. That is fine for this project. If I ran multiple instances, I would move the bucket state somewhere shared, like Redis, and make the consume step atomic there.

## graceful shutdown is not optional once handlers can be mid-flight

The server starts in a goroutine:

```go
go func() {
    if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
        fmt.Println(err)
    }
}()
```

Then the main goroutine waits for `SIGINT` or `SIGTERM`.

```go
quit := make(chan os.Signal, 1)
signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
<-quit
```

On shutdown, it gives the server five seconds to stop accepting new work and finish active requests:

```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

server.Shutdown(ctx)
```

This is one of those features that looks boring until you do not have it.

Killing a server immediately is easy. Stopping it without cutting off active requests is the part that makes it feel like a real service.

## tests made the seams better

The tests use `httptest`, which means the handlers can run without opening a real port.

That forced the design into cleaner pieces. The handlers accept a `UserStore`. The middleware accepts a limiter. The mux can be assembled in a test the same way it is assembled in `main`.

```go
req := httptest.NewRequest(http.MethodPost, "/users", strings.NewReader(`{"name":"Alice"}`))
rr := httptest.NewRecorder()
mux.ServeHTTP(rr, req)
```

The tests cover the full user flow: create, fetch, delete, then fetch again and expect `404`.

They also cover validation, rate limiting, and basic server wiring.

That gave me confidence in the boring parts. Boring parts are where regressions love to hide.

## what i would build next

The next step is benchmarking.

I want to measure how the server behaves when many clients hit it at once, especially around the mutex-protected store and the limiter. The current design is correct for a small in-memory service, but correctness is only the first question.

After that, I would add structured logging and request IDs. `fmt.Println` is fine while learning. It gets old fast when you need to understand one request across multiple lines of output.

For now, this project did what I wanted: it made the hidden parts of an http server visible. Routing was the easy part. The useful lessons were around ownership, shared state, input boundaries, and shutting down without being rude about it.
