---
title: "how i accidentally derived mapreduce"
date: "2026-04-13"
description: "i tried to count discord messages and ended up reinventing a 2004 google paper."
---

here's the problem. you have a 2gb file containing 10 million discord messages. each line looks like this:

```text
alice | 2026-04-01T12:34:56Z | lmao did you see that play
bob   | 2026-04-01T12:35:02Z | yeah that was insane
alice | 2026-04-01T12:35:15Z | i literally screamed
```

username, timestamp, message. pipe-delimited. you want to find the **top 10 most active users by message count**. that's it. sounds easy.

## attempt 1: the obvious thing

you read the file line by line, split on `|`, grab the username, and throw it into a hashmap. key is the username, value is the count. every time you see a username, increment by 1. when you're done, sort the map by value, and take the top 10.

```text
counts = {}
for line in file:
    username = line.split("|")[0].strip()
    counts[username] += 1
sort counts, take top 10
```

this works because it is simple and correct. on a 100mb file with 500k messages, it runs in a few seconds and uses maybe 50mb of ram. the map itself is tiny since the number of unique usernames is small. you could write this in any language in 10 minutes and go get lunch.

so what's the problem?

## the problem: your file got bigger

2gb is fine. your hashmap of unique usernames still fits in memory easily. even if there are a million unique users, that's maybe a few hundred mb for the map. you can stream the file line by line so you never load the whole 2gb into memory. this still works.

but now imagine the file is 200gb, or even 2tb. you are no longer running this on your laptop; you are running it on a machine with 8gb of ram and a 2tb disk. the file does not fit in memory, which is fine because you are streaming it. the hashmap still fits because the number of unique usernames is bounded.

but what if you need to group all messages by user instead of just counting them? now the hashmap values are lists of strings instead of integers. those lists grow with the file size. if you have 200gb of messages, your hashmap needs to hold 200gb of data in memory. that won't fit in 8gb of ram.

the naive approach breaks when you need to collect all the data for a given key. counting was a special case where the intermediate state, a single integer, was tiny. for most real problems, it is not.

so let's solve the general version, because if we can solve that, counting is trivial.

## attempt 2: chunking

okay, new plan. split the 200gb file into smaller chunks, say 1gb each. process each chunk independently. for each chunk, build a hashmap of username to list of messages, write the results to disk, and move on to the next chunk.

```text
for each 1gb chunk:
    partial_results = {}
    for line in chunk:
        username = line.split("|")[0].strip()
        partial_results[username].append(line)
    write partial_results to disk
```

now memory usage stays bounded. you never hold more than about 1gb of data in the map at a time.

but there is a catch. alice shows up in chunk 1, chunk 37, and chunk 142. her messages are scattered across dozens of partial result files. to get the complete list for alice, you have to merge all those partial results.

this merging step is slow. you have to open all 200 files, pull out the entries for alice, combine them, and repeat that for every user. the results are now too fragmented to reassemble efficiently.

## attempt 3: group by username

here is the trick that makes this work.

what if you split the file by username instead of arbitrary chunks? all of alice's messages go to `alice.txt`, bob's go to `bob.txt`, and so on.

```text
for line in file:
    username = line.split("|")[0].strip()
    append line to username.txt
```

this is a single streaming pass. you read a line, figure out the target file, and append it. memory usage is close to zero, since you only need to manage a pool of open file handles. you never load the whole file into memory.

now, each user file is self-contained. to count alice's messages, you just count the lines in `alice.txt`. to find her most recent message, you scan `alice.txt`. you do not need to touch bob's file. the jobs are completely isolated, with no merging or fragmented output.

## streaming within a single user file

what if alice is extremely active? if she sent 50 million messages, `alice.txt` might be 10gb, and we are back to a file that does not fit in memory.

but we do not need to load the whole file into memory.

to count messages, we only need to track a single integer. we start at zero, read a line, increment the counter, and discard the line. memory usage is just one integer, whether the file is 10gb or 10tb.

```text
count = 0
for line in user_file:
    count += 1
```

this works because counting is stateless across users and streamable within each user's file. we do not need all of alice's messages in memory at once. we stream through them, update the counter, and throw the line away.

this is why mapreduce mappers emit a `(username, 1)` pair for every line instead of keeping a running count. emitting a million `(alice, 1)` pairs seems wasteful compared to emitting a single `(alice, 1000000)` at the end.

but the mapper is stateless. it processes one line, emits the pair, and moves on without remembering what came before. it does not need memory for unique keys or coordination with other mappers, making it easy to run in parallel.

the reducer handles the counting later. it maintains state, but only for one key at a time as a stream.

## map, shuffle, and reduce

first, you scan the input line by line, extract the username, and emit a key-value pair. this is the **map** phase. because each line is processed independently, you do not need to carry state between lines.

next, you group all the emitted key-value pairs by username so that all of alice's pairs end up in the same place. this is the **shuffle** phase.

finally, you stream through the values for each user and compute the final result. for counting, you just sum the ones. this is the **reduce** phase. memory usage per user remains bounded to a single integer.

i ended up with these same three phases because they solve the physical constraints of working with large data, not because i read the original google paper first.

each phase exists to solve a specific constraint: mapping gives you stateless, parallel processing; shuffling brings all data for the same key together; and reducing aggregates that data within bounded memory. these are not arbitrary design choices, but requirements forced by the hardware.

## scaling to clusters

in 2004, jeff dean and sanjay ghemawat published [mapreduce: simplified data processing on large clusters](https://research.google/pubs/mapreduce-simplified-data-processing-on-large-clusters/). at the time, google was processing 20+ petabytes of data per day and needed a programming model that let thousands of engineers write distributed computations without worrying about networking, load balancing, or machine failures.

mapreduce handled those details. if you write your code as a stateless map function and a per-key reduce function, the framework can handle the rest: distributing work across machines, re-running failed tasks, and managing intermediate files. you write two simple functions and the framework manages the cluster.

hadoop took this idea and made it open source. for about a decade, big data basically meant hadoop mapreduce.

these days nobody writes raw mapreduce jobs anymore. spark, bigquery, snowflake, duckdb, they all provide friendlier interfaces (sql, dataframes, whatever). but underneath, the core insight is the same: stateless per-record transformations, group by key, aggregate per group. that's map, shuffle, reduce. the abstraction is so fundamental that it keeps showing up even when nobody calls it by name.

the elegance of this is that the same approach works across thousands of machines. you can run a thousand mappers in parallel, each reading a single chunk of the input. to shuffle, you hash keys to partitions and send them over the network. then, thousands of reducers run in parallel on different nodes.

distributing the work is just an optimization. the core concept remains: if you can express the computation as a stateless map, a group by key, and a streaming reduce, you can scale to arbitrary data sizes. whether you scale across cores, disks, or datacenters is just an implementation detail.

i didn't know any of that when i started. i just wanted to count discord messages.

next post: implementing this whole engine in go. a working mapreduce system you can run yourself.
