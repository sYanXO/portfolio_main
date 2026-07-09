---
title: "redis token bucket rate limiting in go"
date: "2026-04-26"
description: "i needed a real per-ip limiter across multiple go instances, so i pushed the bucket into redis and made refill + consume atomic with lua."
---

my api needed a hard per-ip limit, and the usual in-memory middleware stopped being useful the moment i ran more than one instance.

instance a would allow a request because its local counter was fine. instance b would do the same a millisecond later. they were both technically right, but the limit was broken.

i needed a shared view of the rate limit, low latency, and no race conditions under concurrent requests. that meant putting the state in redis.

[source code](https://github.com/sYanXO/rate-limiter).

## why i picked a token bucket

the shape of the limit mattered more than the limit itself.

fixed windows are simple but have weird edges. a client can send five requests at 12:00:59 and another five at 12:01:00, staying within a five-request limit while dumping ten requests in two seconds. the graph looks like a cliff.

i wanted to allow small bursts but refill the budget steadily. a **token bucket** does this naturally.

you define three things:

- **capacity**: max tokens the bucket can hold
- **refill rate**: how fast tokens come back
- **cost per request**: usually `1`

each request costs a token. when the bucket is empty, the request fails. when the client is idle, tokens refill up to the capacity.

a policy like five requests burst, then one request per second maps directly to this model.

## the concurrency bug

refill math is simple. concurrency is where it gets tricky.

my first go prototype did the obvious thing:

1. read `tokens` and `last_refill` from redis
2. compute the new token balance
3. decide allow or deny
4. write the updated state back

this works under light load. it breaks when two requests hit the same key at once.

both read `tokens = 1` before either writes back, allowing both requests. one token pays for two.

running separate redis commands for read and write cannot work here.

## bucket state

each client gets one redis hash with two fields:

- `tokens`: current token balance
- `last_refill`: timestamp of the last refill calculation

this is enough to reconstruct the bucket on every request. there are no background timers or cron jobs; the state updates lazily when a request arrives.

this keeps the system cheap. idle clients consume no CPU, just a few bytes of memory.

## atomic updates with lua

redis runs lua scripts atomically. no other command can run in the middle of one.

a single script can load the state, calculate the refill, decide to allow or deny, and write the new state.

here is the core logic:

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

if the key is missing, the client starts with a full bucket.

if the key exists, the script calculates the elapsed time, adds the new tokens, caps them at `max_tokens`, and subtracts the `requested` amount.

the syntax is standard lua, but the atomicity prevents race conditions. no concurrent request can sneak between the read and the write.

## setting key ttl

the script writes the new balance and timestamp back to redis.

it also sets a ttl:

```lua
redis.call("EXPIRE", key, math.ceil(max_tokens / refill_rate) + 60)
```

without this, every client that ever hits the api leaves a key in redis forever.

expiring the key after the bucket refills removes inactive clients. redis only holds state for active users.

this keeps redis memory usage from growing indefinitely.

## the go interface

the go wrapper is one method:

```go
func (rl *RedisRateLimiter) Allow(
    ctx context.Context,
    key string,
    maxTokens, refillRate, requested float64,
) (bool, error)
```

`Allow` gets the current time, runs the script, and returns a boolean.

the timestamp needs sub-second precision:

```go
now := float64(time.Now().UnixNano()) / 1e9
```

dividing unix nanoseconds by 1e9 gives the lua script sub-second precision while keeping the refill math in seconds. it is a bit hacky but simple.

this keeps the calling middleware simple. it does not know about lua scripts or redis hashes; it just asks for permission and gets a boolean.

## go middleware integration

the middleware extracts the client ip using `net.SplitHostPort` on `r.RemoteAddr`, prefixes it with `ratelimit:`, and checks the bucket before running the next handler.

i configured it with:

- bucket size: `5`
- refill rate: `1 token/sec`
- request cost: `1`

this allows a burst of five requests, then throttles the client to one per second.

the math is easy to reason about six months later.

## handling redis failures

if redis goes down, you have to decide whether to fail open or closed.

this implementation fails open. if redis is offline, it logs the error and lets the request through.

this makes sense for general endpoints where keeping the api up is more important than strict limits.

for login or billing routes, i fail closed. blocking a few legitimate users is better than letting someone script a brute force attack.

the code is easy to change either way; the decision depends on what kind of failure your service can tolerate.

## future improvements

a few things are missing for a production deploy:

support `X-Forwarded-For`. using `r.RemoteAddr` directly fails when the app sits behind a reverse proxy.

return a `429 Too Many Requests` status code with a `Retry-After` header. the lua script can calculate exactly when the next token refills.

support route-specific budgets so a login page and a public GET endpoint do not share the same limit.

the basic limiter works. next, i want to benchmark it against synchronized clients and high-concurrency hotspots.
