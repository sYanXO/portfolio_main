---
title: "implementing mapreduce in go"
date: "2026-04-14"
description: "building a mapreduce engine from scratch to count discord messages."
---

in the last post, we derived the mapreduce programming model by reasoning through a memory constraint problem. now we build it. 

the implementation language is go. this is a deliberate choice. goroutines and channels map naturally onto the mapreduce programming model even though we are running on a single machine.

you can find the complete source code for this project on github: [https://github.com/sYanXO/mapReduce](https://github.com/sYanXO/mapReduce).

## the input

we are processing a pipe-delimited file of discord messages in the format `username | timestamp | message`. our goal is to find the top 10 most active users by message count.

i wrote a python generator script to produce a test file with 1 million lines across 10 hardcoded usernames. real-world data would obviously have thousands of unique users. the generator is a simulation, not a realistic dataset, but the pipeline handles both identically.

## the implementation

here is how the implementation works phase by phase.

### map phase

we stream the input file line by line using `bufio.Scanner`. for each line, we split on `|`, trim the whitespace, extract the username, and append `username,1` to `intermediate/username.txt`. 

the directory is wiped clean at the start of every run to avoid stale data from previous runs. 

the key point here is that the mapper is stateless. it sees one line, writes one entry, and moves on. it has no memory of previous lines. 

(opening and closing a file handle for every single line is inefficient. this is a known limitation and an obvious future optimization.)

### shuffle phase

there is no explicit shuffle code. 

the intermediate directory itself is the shuffle. by routing each emission to a file named after the username, all of a user's data naturally lands in the same place. the filesystem does the grouping. this is the elegance of the approach.

### reduce phase

we read all files in the intermediate directory using `os.ReadDir`. for each file, we stream through it line by line with a counter. 

memory usage is exactly one integer per user, regardless of how many messages they sent. we extract the username from the filename and store the result in a slice of structs.

### sort and output

we sort the results slice by count descending using `sort.Slice` and print the top 10.

## the output

this is the actual output from running against 1 million lines:

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
irene : 99576
```

the counts are roughly equal (about 100k each) because the generator picks names randomly with a uniform distribution. this is expected.

## making it concurrent

the sequential version works, but it leaves performance on the table. the map phase is embarrassingly parallel. each line is processed independently, no state shared between lines. this is exactly the kind of work goroutines were made for.

the idea is simple: read all lines into memory, split them into chunks, and hand each chunk to a separate goroutine. 4 workers means 4 goroutines each processing roughly 250K lines in parallel.

```go
chunkSize := (len(lines) + numWorkers - 1) / numWorkers

for i := 0; i < numWorkers; i++ {
    start := i * chunkSize
    end := start + chunkSize
    // ...
    go func(chunk []string) {
        defer wg.Done()
        // map each line in the chunk
    }(lines[start:end])
}
wg.Wait()
```

`sync.WaitGroup` is the coordination primitive. the main goroutine calls `wg.Wait()` and blocks until all workers report done. each worker calls `wg.Done()` when it finishes its chunk.

the one wrinkle is file writes. multiple goroutines might try to write to the same intermediate file simultaneously (if alice appears in chunk 1 and chunk 3, both workers try to append to `alice.txt` at the same time). so we protect file writes with a `sync.Mutex`. one lock, simple, correct.

is the mutex a bottleneck? honestly, for this workload, not really. the critical section is tiny: open, write one line, close. a smarter implementation would use per-file locks or buffered channels, but global mutex gets the job done without overcomplicating things.

the reduce phase stays sequential. it was already fast. reading a directory and counting lines in small files is I/O-bound, and parallelizing it would add complexity for negligible gain.

## known limitations

opening and closing a file handle for every single line in the map phase is inefficient. a real implementation would maintain a pool of open file handles.

the generator only simulates 10 users. real data would have thousands.

no fault tolerance. if the program crashes mid-run, intermediate state is lost.

## shutting it down

the 2004 google implementation ran across thousands of machines with fault tolerance, load balancing, and network partitioning handled automatically by the framework.

this implementation runs on one laptop with a mutex and four goroutines. but the core logic is identical: stateless map, group by key, streaming reduce. the concurrency we just added is the single-machine version of exactly what google did across a datacenter. split the input, fan out to workers, merge the results.

the gap between this and production mapreduce is fault tolerance, not architecture.

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

	// Read all lines into memory
	var lines []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}
	if err := scanner.Err(); err != nil {
		log.Fatal(err)
	}

	// Split lines into chunks for each worker
	chunkSize := (len(lines) + numWorkers - 1) / numWorkers
	var wg sync.WaitGroup
	var mu sync.Mutex // protects concurrent file writes

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

	// reading from /intermediate
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
