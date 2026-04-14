---
title: "implementing mapreduce in go"
date: "2026-04-14"
description: "building a mapreduce engine from scratch to count discord messages."
---

in the last post, we derived the mapreduce programming model by reasoning through a memory constraint problem. now we build it. 

the implementation language is go. this is a deliberate choice. goroutines and channels map naturally onto the mapreduce programming model even though we are running on a single machine.

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

## known limitations

opening and closing a file handle for every single line in the map phase is inefficient. a real implementation would maintain a pool of open file handles.

the generator only simulates 10 users. real data would have thousands.

everything runs sequentially on one machine. the natural next step is goroutines (running multiple mappers concurrently on different chunks of the input file). go's concurrency model makes this straightforward.

no fault tolerance. if the program crashes mid-run, intermediate state is lost.

## shutting it down

the 2004 google implementation ran across thousands of machines with fault tolerance, load balancing, and network partitioning handled automatically by the framework. 

this implementation runs on one laptop with no fault tolerance and sequential execution. but the core logic is identical. it is a stateless map, group by key, and streaming reduce. the distribution is just an optimization on top of the idea. 

next step: add goroutines and make the map phase concurrent.

```go
package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"sort"
	"strings"
)

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

	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		parts := strings.Split(scanner.Text(), "|")
		username := strings.TrimSpace(parts[0])

		outFile, err := os.OpenFile("intermediate/"+username+".txt", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err != nil {
			log.Fatal(err)
		}
		outFile.WriteString(username + ",1\n")
		outFile.Close()
	}

	if err := scanner.Err(); err != nil {
		log.Fatal(err)
	}

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
