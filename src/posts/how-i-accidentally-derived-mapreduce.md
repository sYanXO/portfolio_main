---
title: "how i accidentally derived mapreduce"
date: "2026-04-13"
description: "i tried to count discord messages and ended up reinventing a 2004 google paper."
---

here's the problem. you have a 2GB file containing 10 million discord messages. each line looks like this:

```
alice | 2026-04-01T12:34:56Z | lmao did you see that play
bob   | 2026-04-01T12:35:02Z | yeah that was insane
alice | 2026-04-01T12:35:15Z | i literally screamed
```

username, timestamp, message. pipe-delimited. you want to find the **top 10 most active users by message count**. that's it. sounds easy.

## attempt 1: the obvious thing

you read the file line by line, split on `|`, grab the username, and throw it into a hashmap. key is the username, value is the count. every time you see a username, increment by 1. when you're done, sort the map by value, take the top 10.

```
counts = {}
for line in file:
    username = line.split("|")[0].strip()
    counts[username] += 1
sort counts, take top 10
```

this works. it's simple. it's correct. on a 100MB file with 500K messages, it runs in a few seconds and uses maybe 50MB of RAM (the map itself is tiny, the number of *unique* usernames is way smaller than 10 million). you could write this in any language in 10 minutes and go get lunch.

so what's the problem?

## the problem: your file got bigger

2GB is fine. your hashmap of unique usernames still fits in memory easily. even if there are a million unique users, that's maybe a few hundred MB for the map. you can stream the file line by line so you never load the whole 2GB into memory. this actually still works.

but now imagine the file is 200GB. or 2TB. now you're not running this on your laptop. you're running it on a machine with 8GB of RAM and a 2TB disk. the file doesn't fit in memory but that's fine, you're streaming it. the hashmap still fits because unique usernames are bounded.

but what if the problem changes slightly? what if instead of counting messages per user, you need to **group messages by user**, collect all messages for each user into a list? now your hashmap values aren't integers, they're lists of strings. and those lists *do* grow proportionally to the file size. 200GB of messages means your hashmap values collectively hold 200GB of data. that does not fit in 8GB of RAM.

this is where the naive approach actually breaks. not on counting specifically, but on the general case of doing something with all the data for a given key. counting was a special case where the intermediate state (an integer) was tiny. for most real problems, it isn't.

so let's solve the general version. because if we can solve that, counting falls out trivially.

## attempt 2: chunking

okay, new plan. split the 200GB file into smaller chunks, say 1GB each. process each chunk independently. for each chunk, build a hashmap of username to list of messages. write the results to disk. move on to the next chunk.

```
for each 1GB chunk:
    partial_results = {}
    for line in chunk:
        username = line.split("|")[0].strip()
        partial_results[username].append(line)
    write partial_results to disk
```

now your memory usage stays bounded. you never hold more than ~1GB of data in the map at once. great.

but there's a problem. alice shows up in chunk 1 and also in chunk 37 and also in chunk 142. her messages are scattered across dozens of partial result files. to get the complete picture for alice, you'd need to go back and merge all those partial results together.

this merging step is annoying. you need to open all 200 partial result files, find all the entries for alice, combine them, and do that for every single user. you've basically just moved the problem. instead of the file being too big for memory, you now have results too fragmented to reassemble efficiently.

## attempt 3: group by username

here's the key insight that fixes everything.

instead of splitting the file into random 1GB chunks, what if you split it **by username**? all of alice's messages go into `alice.txt`. all of bob's messages go into `bob.txt`. every user gets their own file.

```
for line in file (streaming, line by line):
    username = line.split("|")[0].strip()
    append line to file "{username}.txt"
```

this is just a streaming pass over the input. you read one line, figure out which file it belongs to, append it. memory usage is basically zero (you just need a file handle pool, and you can manage that). you never hold the whole file in memory.

and now the beautiful part: **each user file is independently processable**. to count alice's messages, you just count the lines in `alice.txt`. to find her most recent message, you just scan `alice.txt`. you never need to look at bob's file. the problems are completely independent of each other.

no merging. no fragmented results. each output file is self-contained and complete.

## the edge case that reveals the real insight

okay but what if alice is pathologically active? what if she sent 50 million messages and `alice.txt` is 10GB? we're back to the same problem. the file doesn't fit in memory.

except... do we actually need to load it into memory? 

if we're counting messages, we literally just need a single integer. start at 0. read a line, increment by 1. read another line, increment by 1. we stream through the entire file and our memory usage is: **one integer**. doesn't matter if the file is 10GB or 10TB. one integer.

```
count = 0
for line in user_file:
    count += 1
```

this is when something clicked for me. the reason this works is that our processing function is **stateless with respect to other users and trivially streamable within a single user**. we don't need to hold all of alice's data in memory simultaneously. we process it in a stream, maintaining only the minimal state we need (a counter), and discard each line after we've seen it.

and this is also why, if you've ever seen mapreduce described, the mapper emits `(username, 1)` for every line instead of trying to maintain a running count. it seems wasteful. why emit a million `(alice, 1)` pairs when you could just emit `(alice, 1000000)` at the end?

because the mapper is **stateless**. it sees one line, emits one pair, moves on. it doesn't need to remember what it saw before. it doesn't need RAM proportional to the number of unique keys. it doesn't need to coordinate with any other mapper. it's embarrassingly parallel.

the counting happens later, in the reducer, where it *is* someone's job to maintain state. but only for one key at a time, and only as a stream.

## Summary



**phase 1:** scan the input line by line. for each line, extract the key (username) and emit a key-value pair. each line is processed independently. no state carried between lines.

that's the **map** phase.

**phase 2:** take all the emitted key-value pairs and group them by key. all of alice's pairs end up together. all of bob's pairs end up together.

that's the **shuffle** phase.

**phase 3:** for each group, stream through the values and compute the final result. for counting, that's just summing 1s. memory usage per group: one integer.

that's the **reduce** phase.

map. shuffle. reduce. i literally derived the same three phases that Dean and Ghemawat described in the original google paper. not because i read the paper first, but because each phase solves a specific problem that naturally arises when you try to process data that doesn't fit in memory.

the map phase exists because you need stateless, parallelizable processing.  
the shuffle phase exists because you need all data for the same key in the same place.  
the reduce phase exists because you need to aggregate within a key using bounded memory.

none of these are arbitrary design choices. they're forced by the constraints.

## why this actually matters

in 2004, jeff dean and sanjay ghemawat published [MapReduce: Simplified Data Processing on Large Clusters](https://research.google/pubs/mapreduce-simplified-data-processing-on-large-clusters/). at the time, google was processing 20+ petabytes of data per day and needed a programming model that let thousands of engineers write distributed computations without thinking about fault tolerance, load balancing, or network partitioning.

mapreduce was that model. the insight was that if you force the programmer to express their computation as a stateless map function and a per-key reduce function, then the *framework* can handle everything else: distributing the work across thousands of machines, re-running failed tasks, managing intermediate data. the programmer writes two simple functions and the framework turns it into a distributed computation.

hadoop took this idea and made it open source. for about a decade, big data basically meant hadoop mapreduce.

these days nobody writes raw mapreduce jobs anymore. spark, bigquery, snowflake, duckdb, they all provide friendlier interfaces (SQL, dataframes, whatever). but underneath, the core insight is the same: stateless per-record transformations, group by key, aggregate per group. that's map, shuffle, reduce. the abstraction is so fundamental that it keeps showing up even when nobody calls it by name.

and here's the thing i find most elegant: everything we derived assumed a single machine. we were just trying to process data that doesn't fit in RAM. but the exact same decomposition works for distributing across *thousands* of machines. instead of one mapper reading the whole file, you have 1000 mappers each reading one chunk. instead of one machine doing the shuffle, you hash each key to a partition and send it over the network. instead of one reducer per key, you have thousands of reducers running in parallel on different machines.

the distribution is just an optimization on top of the core idea. the core idea is: **if you can express your computation as stateless map + group by key + streaming reduce, you can scale it to arbitrary data sizes.** whether that scaling happens across cores, disks, or datacenters is an implementation detail.

i didn't know any of that when i started. i just wanted to count discord messages.

next post: implementing this whole thing in Go. a working mapreduce engine you can actually run.
