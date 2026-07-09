---
title: "building a tokenizer cache from scratch"
date: "2026-07-01"
description: "a dict, a linked list, and a lock walk into an LLM pipeline. the result is a 10x speedup on repeated tokenization."
---

every time you call an LLM api, you re-tokenize the exact same system prompt. the same few-shot examples, the same prefix, the same boilerplate. tiktoken does the work, returns the tokens, and forgets it ever happened.

for a single request, that takes maybe 50 microseconds. but when you run a pipeline processing thousands of requests, those microseconds add up to real wall-clock time.

so i built a caching layer. it sits between your code and your tokenizer, remembers what it has seen, and skips the redundant work. here is how it works, the design choices i made, and the parts that turned out to be tricky.

## the interface

the cache wraps any tokenizer function. you pass it a callable that takes a string and returns a sequence of ints. it works with tiktoken, huggingface, sentencepiece, or even a basic ord() loop.

```python
import tiktoken
from tokenizer_cache.cache import TokenizerCache

enc = tiktoken.get_encoding("cl100k_base")
cache = TokenizerCache(enc.encode, maxsize=128)

tokens = cache.tokenize("Hello world")   # miss, calls tiktoken
tokens = cache.tokenize("Hello world")   # hit, returns from cache
```

dependency injection keeps the cache decoupled from any specific tokenizer library. there are no hard dependencies or import-time coupling. it only handles the memory.

## starting simple

the first version was simple. a dict mapping strings to token tuples, a hit counter, and a miss counter.

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

this works, but it grows without bound. every unique string you tokenize stays in memory forever. in a long-running service with varied inputs, that becomes a memory leak.

## adding lru eviction

the fix is adding a maxsize parameter with LRU (least-recently-used) eviction. when the cache is full and a new entry arrives, the oldest untouched entry gets dropped.

you could use collections.OrderedDict or functools.lru_cache, but i wrote a manual implementation. it uses a dict for O(1) key lookup and a doubly-linked list for O(1) reordering and eviction.

```text
Most-recently-used                              Least-recently-used
       v                                                v
  +--------+    +--------+    +--------+    +--------+
  | HEAD   |--->| "sys"  |--->| "hello"|--->|  TAIL  |
  |sentinel|<---| prompt |<---| world" |<---|sentinel|
  +--------+    +--------+    +--------+    +--------+
```

the node definition is simple:

```python
class _Node:
    __slots__ = ("key", "tokens", "prev", "next")

    def __init__(self, key=None, tokens=None):
        self.key = key
        self.tokens = tokens
        self.prev = None
        self.next = None
```

__slots__ saves some bytes per node by skipping the instance __dict__. sentinel head and tail nodes simplify the edge cases. you do not need to check for None when unlinking or inserting, because there is always a node on both sides.

on a cache hit, the node gets unlinked and re-inserted right after head. on a miss, the cache creates a node and inserts it after head. if the cache exceeds maxsize, tail.prev gets evicted. all of these are O(1) pointer swaps.

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

this works in a single thread, but adding concurrency makes things more complicated.

you might think of using a read-write lock, letting readers (cache hits) run concurrently and writers (cache misses) take exclusive access. but LRU breaks this model. a cache hit is not read-only because it mutates the linked list by moving the accessed node to the front. every access is actually a write.

i built a readers-writer lock anyway, but in practice every tokenize() call takes the write lock to reorder the LRU list. the read path goes unused.

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

an approximate-LRU policy like clock or second-chance would restore read concurrency. but for this setup, the write lock on every call is fine.

## double-checked locking

the tricky part is handling cache misses. calling the actual tokenizer is expensive. if we hold the lock while it runs, we serialize all concurrent callers.

so the sequence works like this:

1. acquire write lock
2. check the cache. if hit, return. release lock.
3. release the lock
4. call the tokenizer (expensive, no lock held)
5. acquire write lock again
6. check the cache again (another thread might have computed the same key while we were unlocked)
7. if still a miss, insert the new entry
8. release the lock

step 6 is the doublecheck. without it, two threads computing the same key at the same time would both insert, creating duplicate nodes in the linked list. the second check catches this and treats the late arrival as a hit.

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

i tested this by running 20 threads that call tokenize("same key for everyone") simultaneously. the assertion checks that the cache contains exactly one entry and that hits + misses equals 20. the test passes.

## benchmarking (and why single runs lie)

the first benchmark ran a single timed loop. the numbers varied by over 4x on the same machine.

background noise from the OS like scheduler jitter or CPU frequency scaling can distort a single wall-clock measurement.

to fix this, i ran seven trials per measurement and tracked the minimum alongside the median. since background noise only adds time, the minimum is the most accurate sample.

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

the results with tiktoken's cl100k_base encoding:

| metric | uncached | cached | speedup |
|--------|----------|--------|---------|
| best (min) | 42.8 ms | 5.7 ms | 7.5x |
| typical (median) | 58.2 ms | 5.8 ms | ~10x |

the average hit latency is 0.624 microseconds. that makes the cache lookup roughly 100x faster than re-calling tiktoken.

## testing the edges

the test suite covers 17 cases including correctness, edge cases, LRU eviction, and concurrency.

the edge cases turned out to be the most interesting. empty strings work by producing an empty tuple. a 100k-character string works because the cache only tracks entry count, not value size. unicode, emoji, and escape sequences work because the cache is keyed on the raw string.

the LRU tests verify that accessing an entry protects it from eviction. maxsize=1 acts as an edge case where every new key evicts the previous one.

a structural integrity check walks the list in both directions to verify they are exact reverses and match the dict size. this catches broken pointers that would otherwise corrupt the ordering.

## what i would do differently

the readers-writer lock was a good exercise but is mostly wasted here. since every LRU access takes the write lock, a plain threading.Lock() would behave the same way with less code. i kept it in case i switch to an approximate-LRU policy later.

the cache does not track memory size. maxsize counts entries rather than bytes. a cache holding 128 short strings and a cache holding 128 novel-length strings use the same eviction policy but very different amounts of memory. this is fine for caching system prompts, but a general-purpose library would need a byte budget.

## the code

the full implementation is on [github](https://github.com/sYanXO/tokenizer-cache). it is pure python, has zero dependencies, and uses about 140 lines of logic. you can drop it into your LLM pipelines to skip redundant tokenization.
