---
title: "the cache is lying to you"
date: "2026-04-21"
description: "why the most common performance optimization in distributed systems is also one of its most dangerous failure modes"
---



*note: this post is derived from the original work by marc brooker. you can read his original piece [here](https://brooker.co.za/blog/2021/08/27/caches.html).*

your database is slow. you add a cache. your api is getting hammered. you add a cache. your latency is too high. you cache it.

this is standard advice in software engineering. it works. until one day it fails catastrophically.

this post explores the failure mode that load tests miss. it is the reason for some of the longest outages at massive internet companies. it is called metastability.

## the problem you think you have

here is the mental model most engineers carry.

your service receives requests. it checks a cache. on a hit, it returns fast. on a miss, it fetches data from the database, writes it back to the cache, and returns. the cache warms up. database load drops. the dashboard is green.

this model is not wrong. it describes one stable state. the problem is that it describes only one stable state. there is another.

## the problem you actually have

a cache is not just a performance optimization. it introduces a new mode. it creates fundamentally different operating regimes with their own feedback dynamics.

when the cache is warm, a self-reinforcing loop operates in your favor.

1. cache is warm
2. responses are fast
3. database concurrency stays low
4. the few misses are handled quickly
5. the cache stays warm

this loop is stable. without external disturbance, the system stays in it forever.

now consider what happens when the cache is cold. maybe you deployed a new version, restarted the cache, or faced a weird traffic spike. a different loop kicks in.

1. cache is cold
2. all requests hit the database
3. database concurrency spikes
4. database is overwhelmed
5. responses are too slow to repopulate the cache
6. the cache stays cold

this loop is also stable. without external intervention, the system stays in this state forever too.

two stable states. one good, one bad.

## understanding metastability

the concept comes from physics. a metastable state is locally stable but not the lowest energy state. think of a ball balanced on top of a hill. it stays there until disturbed. a small push, and it rolls down to a different stable state and stays there.

a research paper titled [*Metastable Failures in Distributed Systems*](https://sigops.org/s/conferences/hotos/2021/papers/hotos21-s11-bronson.pdf) defines it clearly. metastable failures occur in systems with uncontrolled load where a trigger causes the system to enter a bad state that persists even when the trigger is removed.

the last part is the crucial detail. the system stays broken even when the trigger is removed.

the restart is done. the traffic spike has passed. the system is still broken. the standard incident playbook of finding the cause and fixing it fails here because the cause is already gone.

the feedback loop is sustaining the failure. the database is too overwhelmed by cold-cache misses to respond fast enough to repopulate the cache. the cache stays cold. the database stays overwhelmed.

## why load tests miss this

this failure mode is not triggered by more load than usual. it is triggered by differently shaped load combined with a cache disruption.

your standard load test ramps up requests against a warm cache. it will not find this issue.

the pattern that triggers cache-induced metastability involves two things. first, you get unusual traffic. maybe it is a different key distribution or a bunch of long-tail keys all at once. second, you have a cache disruption event like a restart or eviction.

neither of these alone is fatal. together, they lock your system into the bad loop. caches assume that your key access distribution is non-uniform. when that assumption becomes false, your monitoring might not even notice.

## the thundering herd and the doom loop

there are two well-known mechanisms at play here.

the **thundering herd** happens at the moment of cache eviction. a popular cache entry expires. a hundred thousand clients notice simultaneously. they all race to the database at the same instant. the database is asked to serve the entire population at once.

the **doom loop** is what happens next. the database is slow, so clients time out. clients retry. now you have double or triple the original request volume hitting a saturated system. the retries make the database slower. the slower database causes more timeouts. the system enters a self-amplifying spiral.

the thundering herd is the trigger. the doom loop is the sustaining mechanism.

## a practical example

i want to walk through a thought experiment.

imagine a database that can handle 1000 queries per second before latency degrades. your service receives 5000 requests per second. you add a cache with a 90 percent hit rate. the database now sees 500 queries per second. everything is fine.

then your cache gets wiped.

all 5000 requests hit the database. it is asked to serve five times its capacity. latency spikes. clients time out. they retry with a 1.5x factor. now you have 7500 requests per second hitting the database.

the database cannot serve requests fast enough to repopulate the cache. the cache stays empty. the database stays saturated. you are in the bad loop.

the trigger might have lasted two seconds. the failure will last until you manually intervene by killing the traffic, letting the database drain, warming the cache offline, and slowly reintroducing load.

the underlying truth is that the database was never capable of running your service. the cache was load-bearing infrastructure.

## solving the problem

the answer is not to stop using caches. the answer is changing how you think about them.

**design for the cold start.** ask if your system could cope if the cache were empty right now. if no, you have a capacity problem disguised by a cache.

**isolate the cache.** some modern database engines (AuroraDB) move their page cache out of the main database process. when the database restarts, the cache is still warm. this removes a common trigger.

**limit concurrency explicitly.** put a hard cap on the number of in-flight requests. shed load early. return an error to the client instead of queuing indefinitely. a fast error is better than a client waiting 30 seconds to time out and retry.

**jitter your ttls.** do not let all your cache entries expire at the same time. add randomness to expiry times so misses spread over time.

**monitor the sustaining mechanisms.** cache hit rate is a lagging indicator. the leading indicators are database concurrency and queue depth. when those climb, you are watching the loop form.

**treat retries as load multiplication.** every retry adds load to a struggling system. exponential backoff with jitter is mandatory. without jitter, retries synchronize and create their own thundering herd.

## breaking the loop

the root cause of a metastable failure is the sustaining feedback loop, not the trigger. there are many possible triggers. if you only patch the specific trigger, the feedback loop will catch you the next time something else goes wrong.

the durable fix is to break the loop. ask why the system could not recover when the cache was wiped.

this implicates your capacity planning, your retry logic, your backpressure mechanisms, and your database sizing. most long outages are metastability events. learning to read that signature and break the loop is how you build resilient systems.

the honest version of the cache advice is this. add a cache to speed up a system that can handle its load without one. jitter your ttls. design clients with backoff and jitter. set explicit concurrency limits. monitor queue depth. assume the cache will be cold sometimes and verify the system survives it.