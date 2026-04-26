---
title: "redis token bucket rate limiting in go"
date: "2026-04-26"
description: "i needed a real per-ip limiter across multiple go instances, so i pushed the bucket into redis and made refill + consume atomic with lua."
---

my api needed a hard per-ip limit, and the usual in-memory middleware stopped being useful the moment i ran more than one instance.

instance A would happily allow a request because *its* local counter looked fine. instance B would do the same a millisecond later. technically both were correct. operationally the limiter was fake.

the requirement was simple:

- one shared view of rate limit state
- low latency on the hot path
- no race conditions under concurrent requests

that pushed the bucket into redis.

[source code](https://github.com/sYanXO/rate-limiter).

## why i picked a token bucket

the shape of the limit mattered more than the limit itself.

fixed windows are easy, but they produce weird edges. a client can send 5 requests at `12:00:59` and another 5 at `12:01:00` and still stay within a *5 requests per minute* rule. the graph looks like a cliff.

what i actually wanted was: let small bursts through, then refill steadily.

that is exactly what a **token bucket** does.

you define:

- **capacity**: max tokens the bucket can hold
- **refill rate**: how fast tokens come back
- **cost per request**: usually `1`

every request spends a token. if the bucket is empty, the request gets rejected. if the client goes idle, tokens accumulate again up to the cap.

for a limit like *5 requests burst, then 1 request per second*, the bucket model maps directly onto the policy.

## the real problem was not math

the refill math is boring. the concurrency bug is the interesting part.

my first version did the obvious thing from go:

1. read `tokens` and `last_refill` from redis
2. compute the new token balance
3. decide allow or deny
4. write the updated state back

that works in light traffic. it falls apart the second two requests race on the same key.

both requests can read `tokens = 1` before either writes back. both conclude the request should be allowed. both decrement. one token turns into two successful requests.

once you see that, separate redis calls are dead on arrival.

## what state the bucket stores

each client gets one redis hash with two fields:

- `tokens`: current token balance
- `last_refill`: timestamp of the last refill calculation

that is enough to reconstruct the bucket on every request. there is no background refill job. nothing ticks every second. the bucket updates lazily when traffic arrives.

that part is worth calling out because it keeps the system cheap. idle clients cost basically nothing.

## lua makes the whole decision atomic

redis runs a lua script as one atomic operation. no other command can interleave in the middle of it.

that means one request can:

1. load the current bucket state
2. compute refill based on elapsed time
3. decide allow or deny
4. write the new state

all inside one script call.

the core of the script looks like this:

```lua
local state = redis.call("HMGET", key, "tokens", "last_refill")
local tokens = tonumber(state[1])
local last_refill = tonumber(state[2])

if tokens == nil then
  tokens = max_tokens
  last_refill = now
else
  local elapsed = math.max(0, now - last_refill)
  local refill = elapsed * refill_rate
  tokens = math.min(max_tokens, tokens + refill)
  last_refill = now
end

local allowed = 0
if tokens >= requested then
  tokens = tokens - requested
  allowed = 1
end
```

if the key does not exist yet, the client starts with a full bucket.

if the key does exist, the script computes how much time elapsed since the last refill, adds the recovered tokens, caps at `max_tokens`, and then tries to spend `requested`.

the syntax is ordinary. the useful part is atomicity. no second request can sneak in between the read and the write.

## the write-back matters too

after the decision, the script stores the updated balance and timestamp back into redis.

it also sets an expiry:

```lua
redis.call("EXPIRE", key, math.ceil(max_tokens / refill_rate) + 60)
```

without that line, every client that ever touched the API leaves a key behind forever.

with it, inactive buckets disappear after enough time to fully refill, plus a small buffer. redis keeps state only for clients who are still relevant.

this is one of those tiny details that turns a neat demo into something you can actually leave running.

## the go side stays small

the go wrapper exposes one method:

```go
func (rl *RedisRateLimiter) Allow(
    ctx context.Context,
    key string,
    maxTokens, refillRate, requested float64,
) (bool, error)
```

`Allow` computes `now`, calls `script.Run(...)`, and interprets the redis return value as allowed or denied.

in my code, `now` is passed as:

```go
now := float64(time.Now().UnixNano()) / 1e9
```

that gives the lua script sub-second precision while still letting the refill math stay in seconds. the comment in the code calls it hacky. that is fair. it works, though.

that small interface is doing a lot of work for the rest of the application.

middleware does not need to know about refill math, redis hashes, or lua. it asks one question and gets one answer.

## plugging it into middleware

the middleware extracts the client IP from `r.RemoteAddr` with `net.SplitHostPort`, falls back to the raw `RemoteAddr` string if parsing fails, prefixes that with `ratelimit:`, and checks the bucket before the handler runs.

the policy i used here was:

- bucket size: `5`
- refill rate: `1 token/sec`
- request cost: `1`

that gives a client a short burst of 5 requests, then settles into roughly one request per second if they keep hammering the endpoint.

the useful thing about this model is that the numbers are intuitive. you can explain them to yourself six months later without reading code.

## one policy decision you cannot dodge

what happens if redis is down?

the answer depends on policy.

right now, this limiter **fails open**. if redis is unavailable, it logs the error with `fmt.Printf`, calls `next(w, r)`, and lets the request through anyway.

that is acceptable for a general API where availability matters more than strict fairness.

for auth endpoints, billing-sensitive routes, or anything abuse-prone, i would probably fail closed instead. denying some good traffic is often cheaper than allowing unbounded bad traffic.

the implementation is easy either way. the current code picked availability over enforcement. the hard part is deciding what failure mode your product can tolerate.

## things i would improve next

three obvious upgrades are still pending.

first, trust `X-Forwarded-For` correctly when the service sits behind a reverse proxy. using `RemoteAddr` blindly is fine for local testing and wrong in production.

second, return a proper `429` response with a `Retry-After` header. the bucket already knows enough to estimate when a token will be available again.

third, move from one global per-ip policy to route-specific limits. a login endpoint and a public read endpoint should not share the same budget.

the limiter itself is stable now. the next interesting step is testing traffic shapes that are actually annoying: short bursts, synchronized clients, and mixed hot keys under concurrency.
