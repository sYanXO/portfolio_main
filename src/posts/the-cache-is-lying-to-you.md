---
title: "the cache is lying to you"
date: "2026-04-21"
description: "why the most common performance optimization in distributed systems is also one of its most dangerous failure modes"
---

*note: this post is derived from marc brooker's original piece [here](https://brooker.co.za/blog/2021/08/27/caches.html).*

caching is the default fix for a slow system. your database is slow, your API is hammered, or your latency is high: you throw Redis or Memcached in front of it. and it works, right up until the system falls over and refuses to get back up.

these kinds of failures are called metastable failures. they are behind some of the longest, most painful outages at scale, and they are almost impossible to catch with standard load tests.

## how we think caches work

when we think about caching, we picture a simple flow. a request comes in, we check the cache, and if it's a hit, we return immediately. if it's a miss, we fetch from the database, write to the cache, and return. as traffic flow continues, the cache warms up, database load drops, and everything runs fast. this is a stable state.

this model isn't wrong, but it only describes one stable state. there is another.

## two stable states

adding a cache changes how your system behaves under load. it introduces feedback loops that can lock you into a completely different operating mode.

when the cache is warm, the feedback loop works for you:

- the cache is warm
- responses are fast
- database concurrency stays low
- the few misses are handled quickly
- the cache stays warm

as long as nothing breaks, the system stays here.

if the cache gets wiped or restarted, a different feedback loop takes over:

- the cache is cold
- all requests hit the database
- database concurrency spikes
- the database gets overwhelmed
- database responses slow down, timing out before they can populate the cache
- the cache stays cold

this bad loop is just as stable as the good one. once you fall into it, the system won't recover on its own.

## what is metastability

the term comes from physics. a metastable state is locally stable but isn't the lowest energy state. think of a ball sitting in a shallow dip on a hillside. it stays there until a push rolls it down the hill into a deeper, permanent valley.

in software, a metastable failure happens when a temporary trigger pushes the system into a bad state, and the system stays broken even after the trigger is gone. the HotOS paper [*metastable failures in distributed systems*](https://sigops.org/s/conferences/hotos/2021/papers/hotos21-s11-bronson.pdf) defines it this way.

that last part is what hurts. if a traffic spike causes a crash, you usually wait for the spike to end. but in a metastable failure, when the spike ends, the system stays down. the feedback loop keeps the failure alive. the database is too busy timing out on cold-cache misses to write anything back to the cache, so the cache stays empty, and the database stays broken.

the trigger is gone, but the system is still dead. standard incident playbooks fail here because finding the original cause doesn't help you fix the running system.

## why load tests miss this

most load tests ramp up traffic slowly against a warm cache. this doesn't show you what happens when the cache disappears.

metastable failures are usually triggered by a combination of two things: a cache disruption like a restart or eviction, and a shift in traffic shape, like a sudden wave of requests for rare, uncached keys. individually, neither event causes a crash. together, they push the ball down the hill. caches work because we assume some keys are much more popular than others. when that assumption breaks, the system enters the bad loop before your monitoring even alerts you.

## the thundering herd and the doom loop

two mechanisms drive this failure.

the **thundering herd** is the trigger. when a popular cache entry expires, thousands of clients notice at once. they all query the database for the same key at the same millisecond, forcing the database to do the same heavy query over and over.

the **doom loop** is the sustaining feedback. when the database slows down under this load, client requests start timing out. the clients retry. now you have double or triple the traffic hitting an already struggling database. the extra queries make it slower, causing more timeouts and more retries. the system is stuck.

## a numbers example

say your database handles 1,000 queries per second before it slows down. your service gets 5,000 requests per second. you put a cache in front of it with a 90% hit rate. the database only sees 500 queries per second, and everything runs smoothly.

then you restart the cache.

all 5,000 requests hit the database at once. that's five times what it can handle. latency goes through the roof, and clients start timing out. those clients retry. with a 1.5x retry multiplier, you now have 7,500 requests per second hitting a dead database.

the database cannot process queries fast enough to write anything back to the cache. the cache stays empty, the database stays saturated, and the system stays down.

the original cache outage might have lasted two seconds, but the failure will last until someone manually intervenes: rate limiting the traffic, waiting for the database to clear its queue, warming the cache, and slowly ramping load back up.

if your service only works when the cache is warm, the cache isn't an optimization. you've just built a load-bearing wall out of Redis.

## how do you stop this from happening

you can't just stop caching, but you have to build for the cold start.

here are a few ways to protect the system:

first, **design for a cold start**. if your system cannot survive with an empty cache, you don't have a cache, you have a capacity problem.

second, **isolate the cache**. engines like Amazon Aurora keep the page cache in a separate process from the database itself. if the database restarts, the cache stays warm, eliminating a major trigger.

third, **limit concurrency**. set a hard limit on in-flight database queries and reject excess traffic early. returning a fast error is better than letting requests queue until clients time out and retry.

fourth, **jitter your ttls**. add a random offset to your expiration times so popular keys don't all expire at the same second.

fifth, **track the right metrics**. cache hit rate is a lagging indicator. by the time it drops, the database is already dead. monitor database concurrency and queue depth instead.

finally, **force clients to back off**. client retries multiply load. clients must use exponential backoff with random jitter, otherwise their retries will synchronize and create a secondary thundering herd.

## breaking the loop

the root cause of a metastable failure is the feedback loop, not the trigger. you can patch the specific trigger that caused today's outage, but a different trigger will trip the same loop next month.

the only real fix is to make sure the loop can't sustain itself. when a cache gets wiped, the system needs a way to recover on its own.

this means looking at your retry policies, setting concurrency limits, and sizing the database for minimum acceptable performance. most long-lasting outages at scale are metastability events. once you learn to recognize them, you start designing systems that fail gracefully instead of locking up.

i've learned to treat caches as bonuses, not load-bearing walls. if your database can't handle the baseline load without a cache, you need a bigger database, not a bigger Redis cluster.