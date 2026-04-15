---
title: "implementing mapreduce in go"
date: "2026-04-14"
description: "building a concurrent mapreduce engine from scratch to count discord messages."
---

in the [last post](/blog/how-i-accidentally-derived-mapreduce), we derived mapreduce by reasoning through a memory constraint problem. three phases fell out of the constraints: stateless map, group-by-key shuffle, streaming reduce. now we build it.

the implementation language is go. goroutines and channels map naturally onto the mapreduce model, even on a single machine. the implementation started sequential, then concurrency was added to the map phase. this post reflects the current state.

source code: [github.com/sYanXO/mapReduce](https://github.com/sYanXO/mapReduce).

## the input

pipe-delimited discord messages. one per line. format: `username | timestamp | message`. the goal: find the top 10 most active users by message count.

i wrote a python generator script to produce a test file with 1 million lines across 10 hardcoded usernames. real-world data would have thousands of unique users. the generator is a simulation, not a realistic dataset. the pipeline handles both identically.

## setup

two things happen before any real work starts.

first, wipe and recreate the `intermediate/` directory. this ensures no stale data from previous runs bleeds into the current one.

```go
os.RemoveAll("intermediate")
os.MkdirAll("intermediate", 0755)
```

second, read all lines into memory as a `[]string` slice.

```go
var lines []string
scanner := bufio.NewScanner(file)
for scanner.Scan() {
    lines = append(lines, scanner.Text())
}
```

this is a tradeoff worth being explicit about. loading the full input into RAM contradicts the streaming philosophy of the original design. the reason is pragmatic: distributing work across goroutines requires slicing the data into chunks, and slicing requires knowing the full dataset upfront. for truly massive files (larger than available RAM), this would be a problem. for 1 million lines on a modern machine, it's an acceptable simplification.

## map phase (concurrent)

the mapper is stateless. it sees one line, extracts the username, emits `username,1` to an intermediate file, and moves on. no memory of previous lines. because each line is independent, this is embarrassingly parallel.

we divide the `lines` slice into `numWorkers` equal chunks. `numWorkers` is hardcoded to 4. chunk size is calculated as:

```go
chunkSize := (len(lines) + numWorkers - 1) / numWorkers
```

this is ceiling division. it matters because if you have 1,000,003 lines and 4 workers, regular integer division gives you 250,000 per chunk, leaving 3 lines unprocessed. ceiling division gives you 250,001, and the last chunk gets the remaining lines.

one goroutine per chunk. each goroutine independently processes its slice of the input:

```go
wg.Add(1)
go func(chunk []string) {
    defer wg.Done()
    for _, line := range chunk {
        parts := strings.Split(line, "|")
        username := strings.TrimSpace(parts[0])

        mu.Lock()
        outFile, _ := os.OpenFile(
            "intermediate/"+username+".txt",
            os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644,
        )
        outFile.WriteString(username + ",1\n")
        outFile.Close()
        mu.Unlock()
    }
}(lines[start:end])
```

`sync.WaitGroup` coordinates the goroutines. the main goroutine calls `wg.Wait()` and blocks until every worker has called `wg.Done()`.

### the mutex problem

concurrent file writes are a race condition. if alice appears in chunk 1 and chunk 3, two goroutines try to append to `alice.txt` at the same time. without synchronization, the output gets corrupted.

the fix is a `sync.Mutex` wrapping every file open, write, and close.

here's what that actually means: the mutex serializes the file writes. goroutines process their chunks in parallel (splitting lines, extracting usernames), but they block on each other when writing to disk. the parallelism is real but partial. the CPU-bound work (string splitting, trimming) runs concurrently. the I/O-bound work (file writes) runs sequentially through the lock.

a cleaner approach would be per-worker intermediate files merged later, or per-username channels feeding dedicated writer goroutines. those eliminate the global lock entirely. but for this implementation, the mutex is correct even if not maximally efficient. getting correctness first and optimizing later is the right order.

## shuffle phase

no explicit code. the `intermediate/` directory *is* the shuffle.

by routing each emission to a file named after the username, all of a user's data naturally lands in the same place. `alice.txt` contains every `alice,1` pair, regardless of which goroutine produced them. the filesystem does the grouping.

## reduce phase

sequential. read all files in `intermediate/` with `os.ReadDir`. for each file, stream through it line by line with a counter.

```go
count := 0
s := bufio.NewScanner(f)
for s.Scan() {
    count++
}
```

memory usage: one integer per user, regardless of how many messages they sent. alice could have 10 million messages and the reducer still holds a single `int`. extract the username from the filename (strip `.txt`), store the result in a `[]Result` slice.

## sort and output

sort the results slice by count descending using `sort.Slice`. print the top 10.

this is the actual output from running against 1 million generated lines:

```text
frank : 100622
charlie : 100190
alice : 100135
arjun : 99960
bob : 99936
diana : 99931
eve : 99931
grace : 99892
henry : 99827
iris : 99576
```

the counts are roughly equal at ~100k each. the generator picks usernames with a uniform random distribution, so this is expected.

## known limitations

- loading all lines into memory upfront. not suitable for files larger than available RAM.
- mutex on file writes partially serializes the map phase. the concurrency is real but constrained.
- `numWorkers = 4` is hardcoded. a real implementation would use `runtime.NumCPU()`.
- reduce phase is still sequential. parallelizing it is a natural next step.
- opening and closing a file handle for every single line. a real implementation would maintain a pool of open file handles.

## closing

the map phase is concurrent. each worker independently processes its chunk. the core insight holds: because the mapper is stateless and each line is independent, parallelism is trivially achievable. the mutex is an implementation detail forced by shared filesystem access, not a fundamental limitation of the model.

a real distributed mapreduce sidesteps the mutex entirely. each mapper writes to its own local disk. the shuffle moves data over the network afterward. no shared filesystem, no lock contention. the distribution is just an optimization on top of the same idea.

next step: parallelize the reduce phase.

```go
package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"sort"
	"strings"
	"sync"
)

const numWorkers = 4

type Result struct {
	Username string
	Count    int
}

func main() {
	file, err := os.Open("input.txt")
	if err != nil {
		log.Fatal(err)
	}
	defer file.Close()

	os.RemoveAll("intermediate")
	os.MkdirAll("intermediate", 0755)

	// read all lines into memory
	var lines []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}
	if err := scanner.Err(); err != nil {
		log.Fatal(err)
	}

	// split lines into chunks for each worker
	chunkSize := (len(lines) + numWorkers - 1) / numWorkers
	var wg sync.WaitGroup
	var mu sync.Mutex

	for i := 0; i < numWorkers; i++ {
		start := i * chunkSize
		end := start + chunkSize
		if end > len(lines) {
			end = len(lines)
		}
		if start >= len(lines) {
			break
		}

		wg.Add(1)
		go func(chunk []string) {
			defer wg.Done()
			for _, line := range chunk {
				parts := strings.Split(line, "|")
				username := strings.TrimSpace(parts[0])

				mu.Lock()
				outFile, err := os.OpenFile("intermediate/"+username+".txt", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
				if err != nil {
					mu.Unlock()
					log.Fatal(err)
				}
				outFile.WriteString(username + ",1\n")
				outFile.Close()
				mu.Unlock()
			}
		}(lines[start:end])
	}

	wg.Wait()

	// reduce
	results := []Result{}
	entries, err := os.ReadDir("intermediate")
	if err != nil {
		log.Fatal(err)
	}
	for _, entry := range entries {
		filepath := "intermediate/" + entry.Name()
		f, err := os.Open(filepath)
		if err != nil {
			log.Fatal(err)
		}
		count := 0
		s := bufio.NewScanner(f)
		for s.Scan() {
			count++
		}
		f.Close()

		username := strings.Replace(entry.Name(), ".txt", "", 1)
		results = append(results, Result{Username: username, Count: count})
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].Count > results[j].Count
	})

	for i, r := range results {
		if i >= 10 {
			break
		}
		fmt.Println(r.Username, ":", r.Count)
	}
}
```
