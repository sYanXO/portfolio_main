---
title: "url shortening without the database"
date: "2026-07-09"
description: "how a bloom filter, redis cache, and celery task queue keep redirect latencies low when sqlite gets overwhelmed."
---

if you build a url shortener, the database is usually the first thing to fail. every redirect requires a lookup, and if a path gets hot, you spend all your time querying the disk. if a path does not exist, you query the database anyway just to return a 404.

i built a simple url shortener in python to see how much load we can keep off the database. it uses a process-local bloom filter for negative lookups, redis to cache successful redirects, and celery to handle click logging. here is the request flow.

```text
request
   │
   ▼
┌────────────────────────┐
│  bloom filter          │ ──(no)──► 404
│  (in-memory)           │
└────────────────────────┘
   │
  yes
   │
   ▼
┌────────────────────────┐
│  redis cache           │ ──(hit)──► queue click ──► redirect
└────────────────────────┘
   │
  miss
   │
   ▼
┌────────────────────────┐
│  sqlite database       │ ──► write cache ──► queue click ──► redirect
└────────────────────────┘
```

## generating codes and handling collisions

to create a short code, i used secrets.token_urlsafe(6). it is random and url safe, but since we are not using auto-incrementing integer ids, there is always a small chance of a collision in the database.

to handle this, the app uses a retry loop. if a write fails due to a duplicate key error, the server rolls back the database session and tries again. it retries up to five times before giving up.

```python
def generate_short_code_with_retry(db: Session, max_retries: int = 5):
    for attempt in range(max_retries):
        short_code = secrets.token_urlsafe(6)
        try:
            existing = db.query(URLMapping).filter(URLMapping.short_code == short_code).first()
            if not existing:
                return short_code
        except IntegrityError:
            db.rollback()
    raise HTTPException(status_code=500, detail="failed to generate unique short code")
```

## bypassing lookups with a bloom filter

the most expensive lookup is for a key that does not exist. in a typical setup, a request for a missing key hits redis, misses, hits sqlite, misses, and finally returns a 404. if someone runs a script requesting thousands of random codes, your database is going to struggle.

i added a pybloom-live filter to the application. when the app starts, it initializes a filter with a capacity of one million items and an error rate of 0.001. when we create a short code, we add it to the filter.

when a redirect request arrives, the server checks the filter first. if the filter says the code is not there, we raise a 404 immediately. the request never touches redis or sqlite.

```python
if short_code not in bloom_filter:
    logger.warning(f"bloom filter rejected: {short_code}")
    raise HTTPException(status_code=404, detail="short code not found")
```

## caching redirects in redis

if the filter confirms the code might exist, the server checks redis next. if we have resolved the code before, redis returns the destination url immediately.

on a cache miss, the server queries sqlite. if the code exists, we save it to redis to bypass the database on the next hit. here is the lookup block.

```python
cached_url = redis_client.get(short_code)
if cached_url:
    log_click.delay(short_code)
    return RedirectResponse(url=cached_url)

mapping = db.query(URLMapping).filter(URLMapping.short_code == short_code).first()
if not mapping:
    raise HTTPException(status_code=404, detail="short code not found")

redis_client.set(short_code, mapping.original_url)
```

## background click logging

logging clicks for analytics is a write operation, which makes it slow. if we write directly to the database during the redirect, we force the user to wait for our logging database write to finish before they get redirected.

i offloaded this work to celery. when a redirect is successful, the app calls log_click.delay(short_code) to queue the click event in redis. the celery worker picks it up and logs it asynchronously, keeping the main redirect request fast.

```python
@celery_app.task
def log_click(short_code: str):
    logger.info(f"click logged for: {short_code}")
```

## what the load tests showed

i ran a load test using k6 with 20 virtual users over 30 seconds. the test mixed creates, cached redirects, cold redirects, and missing paths. the workload completed 1,504 iterations, which translates to 6,016 total requests (198.4 requests per second).

caching keeps the redirect latency low. while the overall p95 request duration was 280.23ms (mostly driven by sqlite writes during creation), cached redirects returned in 64.85ms at p95, staying well under the 100ms budget.

the bottleneck is write throughput. because sqlite is a single file, write contention blocks concurrent creates. celery also adds dispatch overhead on high request rates, even for small logging tasks.

## next steps

to scale this setup, i need to swap sqlite for postgresql to handle concurrent writes. the bloom filter is currently process-local and resets on restart, so i will also need to populate it from the database when the server boots.
