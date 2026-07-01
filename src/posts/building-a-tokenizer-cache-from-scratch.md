---
title: "building a tokenizer cache from scratch"
date: "2026-07-01"
description: "a dict, a linked list, and a lock walk into an LLM pipeline. the result is a 10x speedup on repeated tokenization."
---

every time you call an LLM api, the same system prompt gets tokenized. every single time. the same few-shot examples, the same prefix, the same boilerplate. tiktoken does the work, returns the tokens, and forgets it ever happened.

on a single call that costs maybe 50 microseconds. across a pipeline that processes thousands of requests, each re-tokenizing the same handful of strings, it adds up to real wall-clock time.

so i built a caching layer. it sits between your code and your tokenizer, remembers what it has seen, and skips the redundant work. this post walks through how it works, the design decisions i made along the way, and the parts that were less obvious than i expected.

## the interface

the cache wraps any tokenizer function. you pass it a callable that takes a string and returns a sequence of ints. tiktoken, huggingface, sentencepiece, a hand-rolled `ord()` loop. anything.

```python
import tiktoken
from tokenizer_cache.cache import TokenizerCache

enc = tiktoken.get_encoding("cl100k_base")
cache = TokenizerCache(enc.encode, maxsize=128)

tokens = cache.tokenize("Hello world")   # miss, calls tiktoken
tokens = cache.tokenize("Hello world")   # hit, returns from cache
```

dependency injection keeps the cache decoupled from any specific tokenizer library. no hard dependencies, no import-time coupling. you bring the tokenizer, the cache brings the memory.

## starting simple

the first version was embarrassingly simple. a dict mapping strings to token tuples, a hit counter, a miss counter.

```python
def tokenize(self, text):
    if text in self.cache:
        self.hits += 1
        return self.cache[text]
    self.misses += 1
    tokens = self.tokenizer(text)
    self.cache[text] = tokens
    return tokens
```

this works. it also grows without bound. every unique string you tokenize stays in memory forever. for a long-running service with varied inputs, that is a memory leak wearing a trench coat.

## adding lru eviction

the fix is a `maxsize` parameter with LRU (least-recently-used) eviction. when the cache is full and a new entry arrives, the oldest untouched entry gets dropped.

the standard approach is `collections.OrderedDict` or `functools.lru_cache`. i went with a manual implementation: a dict for O(1) key lookup, plus a doubly-linked list for O(1) reordering and eviction.

```text
Most-recently-used                              Least-recently-used
       v                                                v
  +--------+    +--------+    +--------+    +--------+
  | HEAD   |--->| "sys"  |--->| "hello"|--->|  TAIL  |
  |sentinel|<---| prompt |<---| world" |<---|sentinel|
  +--------+    +--------+    +--------+    +--------+
```

the linked list node is minimal:

```python
class _Node:
    __slots__ = ("key", "tokens", "prev", "next")

    def __init__(self, key=None, tokens=None):
        self.key = key
        self.tokens = tokens
        self.prev = None
        self.next = None
```

`__slots__` saves a few bytes per node by skipping the instance `__dict__`. the sentinel head and tail nodes simplify edge cases. you never have to check for `None` when unlinking or inserting, because there is always a node on both sides.

on a cache hit, the node gets unlinked from its current position and re-inserted right after head. on a miss, a new node is created and inserted after head. if the cache exceeds `maxsize`, `tail.prev` gets evicted. all of these operations are O(1) pointer swaps.

```python
def _move_to_front(self, node):
    self._remove(node)
    self._add_front(node)

def _evict_lru(self):
    lru_node = self._tail.prev
    self._remove(lru_node)
    del self.cache[lru_node.key]
    self.evictions += 1
```

## the concurrency problem

a plain dict with a linked list works fine in a single thread. the moment you add concurrency, things get interesting.

the naive instinct is to use a read-write lock. readers (cache hits) can run concurrently, writers (cache misses that insert new entries) get exclusive access. but LRU breaks this model. a cache hit is not read-only. it mutates the linked list by moving the accessed node to the front. every access is a write.

i built a readers-writer lock anyway (it was a good exercise), but in practice every `tokenize()` call takes the write lock because of the LRU reorder. the read path is unused.

```python
class RWLock:
    def __init__(self):
        self._readers = 0
        self._lock = threading.Lock()
        self._read_ready = threading.Condition(self._lock)

    def acquire_write(self):
        self._lock.acquire()
        while self._readers > 0:
            self._read_ready.wait()
```

a future optimization would be an approximate-LRU policy (like clock or second-chance) that could restore genuine read concurrency. but for the current access patterns, the write lock on every call is fine.

## double-checked locking

here is the subtlety that took the most thought. when a cache miss happens, you need to call the actual tokenizer. tokenizer calls are expensive (that is the whole reason we are caching). you do not want to hold the lock while the tokenizer runs, because that serializes all concurrent callers.

so the flow looks like this:

1. acquire write lock
2. check the cache. if hit, return. release lock.
3. release the lock
4. call the tokenizer (expensive, no lock held)
5. acquire write lock again
6. check the cache again (another thread might have computed the same key while we were unlocked)
7. if still a miss, insert the new entry
8. release the lock

step 6 is the double-check. without it, two threads computing the same key at the same time would both insert, creating duplicate nodes in the linked list. the second check catches this and treats the late arrival as a hit instead.

```python
def tokenize(self, text):
    self._lock.acquire_write()
    try:
        if text in self.cache:
            node = self.cache[text]
            self._move_to_front(node)
            self.hits += 1
            return node.tokens
    finally:
        self._lock.release_write()

    tokens = tuple(self.tokenizer(text))

    self._lock.acquire_write()
    try:
        if text in self.cache:       # double-check
            node = self.cache[text]
            self._move_to_front(node)
            self.hits += 1
            return node.tokens

        self.misses += 1
        node = _Node(text, tokens)
        self.cache[text] = node
        self._add_front(node)

        if len(self.cache) > self.maxsize:
            self._evict_lru()
        return tokens
    finally:
        self._lock.release_write()
```

i wrote a specific test for this: 20 threads all calling `tokenize("same key for everyone")` simultaneously. the assertion checks that the cache contains exactly one entry and that `hits + misses == 20`. it passes.

## benchmarking (and why single runs lie)

the first version of the benchmark ran a single timed loop and printed the result. the numbers varied by over 4x between runs. same machine, same code, wildly different results.

the problem is OS-level noise. scheduler jitter, background processes, CPU frequency scaling. a single wall-clock measurement captures the workload plus whatever else the system was doing at that moment.

the fix is running multiple trials and reporting `min` alongside `median`. the minimum is the least noise-contaminated sample (noise can only add time, never remove it). i settled on 7 trials per measurement.

```python
def bench_latency_cached(texts, repeats=1000, trials=7):
    elapsed_times = []
    for _ in range(trials):
        cache = TokenizerCache(enc.encode)
        start = time.perf_counter()
        for _ in range(repeats):
            for text in texts:
                cache.tokenize(text)
        elapsed_times.append(time.perf_counter() - start)
    return elapsed_times
```

the results with tiktoken's `cl100k_base` encoding:

| metric | uncached | cached | speedup |
|--------|----------|--------|---------|
| best (min) | 42.8 ms | 5.7 ms | 7.5x |
| typical (median) | 58.2 ms | 5.8 ms | ~10x |

per-call hit latency: **0.624 microseconds** mean, **0.734 microseconds** p99. sub-microsecond for the median. the cache lookup (dict access, pointer swap, lock acquire/release) is roughly 100x faster than re-calling tiktoken.

## testing the edges

the test suite covers 17 cases across four categories: basic functional correctness, edge cases, LRU eviction, and concurrency.

the edge cases were the ones i worried about least and learned from most. empty strings work (they produce an empty tuple, which caches normally). a 100k-character string works (the cache does not care about value size, only entry count). unicode with emoji, CJK characters, and escape sequences works because the cache is keyed on the raw string, not on any transformed representation.

the LRU tests verify that accessing an entry promotes it and protects it from eviction. `maxsize=1` is a degenerate case that exercises every code path: every new key evicts the previous one.

the structural integrity check walks the linked list forward and backward, verifies both traversals are exact reverses, and confirms the list length matches the dict size. this catches broken pointers that would otherwise silently corrupt the ordering.

## what i would do differently

the readers-writer lock was the right thing to build for learning, but it is mostly wasted here. since every LRU access takes the write lock, a plain `threading.Lock()` would give the same behavior with less code. i kept the RWLock because if i ever switch to an approximate-LRU that does not reorder on hits, the read path becomes useful again.

the cache is also not size-aware. `maxsize` counts entries, not bytes. a cache holding 128 short strings and a cache holding 128 novel-length strings use the same eviction policy but very different amounts of memory. for my use case (caching system prompts and few-shot examples) this is fine, but a general-purpose library would want a byte budget.

## the code

the full implementation is on [github](https://github.com/sYanXO/tokenizer-cache). it is pure python, zero dependencies, and about 140 lines of actual logic across three files. if you are building LLM pipelines and re-tokenizing the same strings, try dropping it in and checking the hit rate. the numbers might surprise you.
