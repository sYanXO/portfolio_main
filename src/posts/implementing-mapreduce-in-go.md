---
title: "implementing mapreduce in go"
date: "2026-04-14"
description: "building a concurrent mapreduce engine from scratch to count discord messages."
---

in the [last post](/blog/how-i-accidentally-derived-mapreduce), i derived mapreduce by working through a memory constraint problem. i ended up with three phases: a stateless map, a group-by-key shuffle, and a streaming reduce. now i'm building it.

i'm using go because goroutines and channels fit mapreduce perfectly, even on a single machine. i started with a sequential version, then made the map phase concurrent.

code is on [github](https://github.com/sYanXO/mapReduce).

## the input

the input is a list of pipe-delimited discord messages, one per line. the format is `username | timestamp | message`. i want to find the top 10 most active users by message count.

i wrote a python script to generate 1 million lines using 10 usernames. a real dataset would have thousands of users, but the pipeline works the same either way.

## setup

two steps happen before the map phase starts.

first, i wipe and recreate the intermediate directory so older runs don't corrupt the new one.

```go
os.RemoveAll("intermediate")
os.MkdirAll("intermediate", 0755)
```

second, i read every line into a `[]string` slice.

```go
var lines []string
scanner := bufio.NewScanner(file)
for scanner.Scan() {
    lines = append(lines, scanner.Text())
}
```

loading the whole file into RAM goes against the streaming model i want. i did it because slicing the data for goroutines is much easier when you know the total line count upfront. it wouldn't work for huge files that exceed memory, but for a million lines on my laptop, it's a fine shortcut.

## map phase (concurrent)

the mapper is stateless. it reads a line, pulls out the username, writes `username,1` to a file, and moves to the next line. since the lines don't depend on each other, i can run this in parallel.

i split the `lines` slice into equal chunks for each worker. with `numWorkers` set to 4, i calculate the chunk size using ceiling division:

```go
chunkSize := (len(lines) + numWorkers - 1) / numWorkers
```

using ceiling division ensures no lines get dropped. if i have 1,000,003 lines and 4 workers, regular integer division gives 250,000 per chunk, leaving 3 lines behind. ceiling division gives 250,001, so the last worker handles the leftover lines.

then i spin up a goroutine for each chunk to process its lines:

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

a `sync.WaitGroup` keeps the main program waiting until all worker goroutines finish their chunks.

### the mutex problem

writing to files concurrently creates a race. if *alice* appears in two different chunks, two goroutines will try to append to `alice.txt` at the same time, corrupting the file.

i fixed this by wrapping the file operations in a `sync.Mutex`.

this lock serializes the disk writes. the goroutines still split lines and trim strings in parallel, but they have to wait in line to write their results. the cpu work is concurrent, but the disk i/o is sequential.

i could avoid the lock by writing to separate files for each worker and merging them later, or by routing writes through channels to a single writer goroutine. but a mutex is simpler to write and get correct. i prefer making it work first and optimizing it later.

## shuffle phase

i don't need any shuffle code. the `intermediate/` directory does that work for me.

because each write goes to a file named after the user, all data for *alice* lands in `alice.txt`. the filesystem handles the grouping.

## reduce phase

the reduce phase runs sequentially. i read the `intermediate/` directory, open each file, and count the lines.

```go
count := 0
s := bufio.NewScanner(f)
for s.Scan() {
    count++
}
```

this keeps memory usage low: one integer per user. even if *alice* has 10 million messages, the reducer only holds a single `int` in memory at a time. i strip `.txt` from the filename to get the username and store the count in a slice.

## sort and output

finally, i sort the slice in descending order and print the top 10 users.

running this against the 1 million generated lines prints:

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

since my generator script distributed names evenly, each user ends up with around 100,000 messages.

## what needs fixing

this implementation is simple, but it has some obvious bottleneck issues.

first, loading the entire file into memory is a bad idea for huge datasets. second, the mutex lock on the intermediate files ruins the map parallelism by forcing goroutines to write sequentially. i also hardcoded `numWorkers` to 4 instead of using `runtime.NumCPU()`, and opening a new file descriptor for every single line write is incredibly slow. a real pipeline would keep a pool of open file descriptors and let workers write to separate files to avoid locking.

finally, the reduce phase is sequential. i should run that in parallel, too.

## next steps

in a real distributed mapreduce, you don't share a filesystem. each worker writes to its own local disk, and the shuffle phase pulls that data over the network. that completely avoids the mutex lock i used here.

my next step is to parallelize the reduce phase. i'll write about that in the next post.

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
