---
title: "how llms actually run at scale"
date: "2026-04-16"
description: "a systems deep dive into what it takes to serve a 405B parameter model to thousands of users."
---

i want to look at what it actually takes to serve a 405b parameter model. say, llama 3.1 405b. you spin up a gpu, load the weights, and it immediately out-of-memories.

here is the math. at 16-bit precision (float16), a 405b model needs:

$$405 \times 10^9 \times 2 \text{ bytes} = 810 \text{ gb}$$

your brand new b200 gpu has 192gb of high bandwidth memory (hbm). since 810 is way bigger than 192, you need at least five gpus just to hold the model weights. and that is before we calculate the memory for activations (the intermediate tensors generated during the forward pass), the kv cache, or any system overhead.

to run this, we need a cluster. here is how we shard it.

## pipeline parallelism

we can start by slicing the model vertically. this is pipeline parallelism. we take the 126 transformer layers of our 405b model and partition them across our gpus. if we have four stages, it looks like this:

- **stage 0**: layers 1 to 32
- **stage 1**: layers 33 to 64
- **stage 2**: layers 65 to 96
- **stage 3**: layers 97 to 126

when a request comes in, stage 0 processes it and ships the intermediate outputs (the activations) to stage 1. stage 1 does its work and passes them to stage 2, and so on.

pipeline parallelism does not reduce the latency of a single request. a token still must pass through all 126 layers sequentially. instead, it increases throughput by overlapping multiple requests. while stage 3 is finishing request a, stage 2 can work on request b, and stage 1 can handle request c.

```text
time ──►
         t1       t2       t3       t4       t5       t6
stage 0  [req A]  [req B]  [req C]  [req D]
stage 1           [req A]  [req B]  [req C]  [req D]
stage 2                    [req A]  [req B]  [req C]  [req D]
stage 3                             [req A]  [req B]  [req C]

         ◄─────── bubble ─────────►
         (stages idle, waiting for
          work to trickle down)
```

the main downside here is the pipeline bubble. when we first start, stages 1, 2, and 3 are just sitting there waiting for stage 0 to finish its first forward pass. the same thing happens when the batch finishes. if we only run small batches, this idle time ruins our efficiency.

## tensor parallelism

instead of splitting the model by layers, we can also split it within a single layer. this is tensor parallelism.

the main work inside a transformer layer is matrix multiplication. we have $y = x \times w$, where $w$ is a weight matrix. for a 405b model, one of these matrices might be shaped as $16384 \times 16384$, which is about 268 million parameters. we can slice this matrix column-wise across eight gpus. each gpu only holds a slice of the weights and computes a partial output.

```text
          ┌─────────── W [16384 x 16384] ──────────┐
          │  slice 0  │  slice 1  │ ... │  slice 7  │
          └─────────────────────────────────────────┘
               │           │               │
               ▼           ▼               ▼
   X ──►  [GPU 0]     [GPU 1]    ...   [GPU 7]
           partial      partial          partial
             Y0           Y1               Y7
               │           │               │
               └─────────┐ │ ┌─────────────┘
                         ▼ ▼ ▼
                      AllReduce
                     (combine all
                     partial results)
                          │
                          ▼
                       full Y
```

to get the actual output $y$, the gpus have to combine their partial results using an `AllReduce` operation. this means every gpu sends its partial result to all other gpus in the group. once they synchronize, every gpu has the complete $y$ and can move on to the next step.

we have to do this synchronization on every single layer, for every forward pass, for every single token we generate. with 126 layers, the gpus end up shuffling gigabytes of data back and forth every second just to keep their math synchronized.

## nvlink and infiniband

because `AllReduce` requires constant communication, how we lay out the gpus physically matters a lot.

inside a single server node (an eight-gpu chassis), the gpus talk to each other over nvlink, which is a dedicated, direct interconnect on the motherboard. between different nodes in a server rack, the communication goes over infiniband network cables.

here is how the speeds compare:

| interconnect | scope | bandwidth |
|---|---|---|
| nvlink (5th gen) | within a node | ~1.8 tb/s per gpu |
| infiniband (ndr) | across nodes | ~50 gb/s |

nvlink is about 36 times faster. this massive speed difference determines how we shard the model:

- we keep tensor parallelism within a single node. the constant `AllReduce` synchronization needs nvlink bandwidth to avoid stalling the gpus.
- we use pipeline parallelism across nodes. shipping activations between pipeline stages happens far less often, so it can run over the slower infiniband connection.

this hybrid layout is the megatron-lm architecture. to run our 405b model, we might use four nodes with eight b200 gpus each, for 32 gpus total. each node acts as one pipeline stage.

## micro-batching

if we send one large batch through our four-stage pipeline, stage 0 finishes its work, ships it off, and then sits around waiting. three quarters of our cluster ends up idle.

we fix this by splitting the batch into smaller micro-batches. stage 0 processes micro-batch 1, ships it, and immediately starts on micro-batch 2. by the time the fourth micro-batch is in flight, all four pipeline stages are active.

the catch is memory. each active micro-batch needs to keep its activations and kv cache in memory. more micro-batches shrink the idle bubble, but they also eat up more gpu memory.

## how inference differs from training

during training, we have to keep all activations in memory for the backward pass so we can calculate gradients and update the weights. for a 405b model, storing these intermediate values takes hundreds of gigabytes. we often use gradient checkpointing, which means we only save activations every few layers and recompute the rest on the fly during the backward pass to save memory.

inference is much simpler because there is no backward pass. each layer computes its outputs, hands them to the next layer, and immediately discards its own activations. this makes inference much lighter on memory.

but inference has to store something else instead: the kv cache.

## the kv cache

the kv cache stores precomputed key and value vectors from the attention layers, rather than raw text.

every time the model generates a new token, that token needs to look back at all previous tokens. if we did not cache anything, generating token 100 would require us to recompute the key and value vectors for the first 99 tokens from scratch. the computational cost would scale quadratically with the sequence length.

with the cache, we only compute the key and value vectors for the new token, save them, and run attention over the historical vectors we already saved. we never reprocess old tokens.

let's look at the memory cost. llama 3.1 405b uses grouped query attention (gqa), which means multiple attention heads share the same key and value vectors. instead of having 128 separate key-value pairs, it only has eight. this reduces the cache size:

$$\text{per token} = 126 \text{ layers} \times 8 \text{ KV heads} \times 128 \text{ dim} \times 2 \text{ bytes} \times 2 \text{ (K and V)} \approx 0.5 \text{ mb}$$

that means:
- one user with a 10k token history needs 5gb of cache
- 1,000 users with 10k tokens each need 5tb of cache

remember, this 5tb of cache is in addition to the 810gb needed for the model weights. even with optimizations like gqa, concurrent users quickly run up a massive memory bill.

## distributing the kv cache

since we partitioned our model across 32 gpus, the kv cache naturally shards across the cluster as well:

```text
                    Node 0                          Node 1
              (layers 1-32)                   (layers 33-64)
     ┌────┬────┬────┬─── ───┐      ┌────┬────┬────┬─── ───┐
     │GPU0│GPU1│GPU2│...│GPU7│      │GPU0│GPU1│GPU2│...│GPU7│
     │KV  │KV  │KV  │   │KV  │      │KV  │KV  │KV  │   │KV  │
     │hd 0│hd 1│hd 2│   │hd 7│      │hd 0│hd 1│hd 2│   │hd 7│
     └────┴────┴────┴─── ───┘      └────┴────┴────┴─── ───┘
              ▲                              ▲
      pipeline split                 pipeline split
     (vertical: by layer)          (vertical: by layer)
              │                              │
     tensor split within           tensor split within
     (horizontal: by head)         (horizontal: by head)
```

pipeline parallelism shards the cache vertically. node 0 keeps the cache for layers 1 to 32, node 1 keeps it for layers 33 to 64, and so on.

tensor parallelism shards the cache horizontally. the eight attention heads are split across the eight gpus inside each node, so each gpu stores the key and value vectors for just one head.

this means a single user's conversation context is physically fragmented across all 32 gpus in a deterministic layout.

## pagedattention

when a request comes in, we don't know how many tokens the model will generate. the naive way to handle this is to allocate enough memory for the maximum possible sequence length, which is 128k tokens for llama 3.1. because most responses are much shorter, this leaves a huge amount of allocated memory sitting empty.

pagedattention, which is what vLLM is built on, solves this by borrowing the virtual memory page design from operating systems. instead of allocating one massive contiguous block of memory for a request, we divide the kv cache into fixed-size pages (usually 16 tokens per page).

these pages are scattered across the gpu memory rather than being contiguous. as the model generates tokens, it allocates new pages on demand. when a request finishes, its pages go back into a pool of free blocks.

this cuts down internal fragmentation and pushes memory utilization close to 100%. we no longer have to wait for massive contiguous chunks of memory to free up before we can run a request.

## continuous batching

if we use static batching, we group $n$ requests together, run them, and wait until the longest response finishes before we send the next batch. this creates head-of-line blocking. if one request in a batch of 32 takes 2,000 tokens to finish while the other 31 finish in 50 tokens, those 31 slots sit idle for the next 1,950 steps. the gpu is basically wasting cycles calculating padding tokens.

continuous batching, or iteration-level scheduling, fixes this by working at the level of individual tokens. at every step, the scheduler checks if any request has hit its stop token or reached its maximum length. if it has, we immediately evict it, free its cache pages, and slide a new request from the queue into the empty slot. the batch layout changes on every single step.

this makes a massive difference in utilization. if we have a stream of requests with varying lengths, static batching might only yield 30% to 40% gpu utilization because short requests hold slots hostage. continuous batching keeps utilization high because slots are recycled immediately.

the engineering here is tricky. the scheduler has to map pages, track sequence positions for dozens of active requests, and update the page tables on every token step without adding latency. this scheduling logic is a core part of libraries like vLLM, TensorRT-LLM, and TGI.

## offloading the cache

gpu memory is fast but expensive. reading key and value vectors during attention is limited by memory bandwidth rather than raw compute. we are doing a massive read from memory for a relatively small matrix multiplication. because of this, we can offload some of this data to slower memory tiers if we can tolerate the extra latency.

| tier | bandwidth | capacity | cost |
|---|---|---|---|
| gpu hbm (b200) | ~8 tb/s | 192 gb | $$$ |
| cpu dram | ~100 gb/s | 512 gb - 2 tb | $$ |
| nvme ssd | ~7 gb/s | 4-16 tb | $ |

if we offload the kv cache to cpu memory over PCIe (which handles around 64 gb/s), we add latency to each token but get a massive boost in capacity. a server with 1tb of cpu memory can hold far more active sessions than the 192gb of hbm on a b200.

the trick is that not all cache pages are equally active. a request that is actively generating tokens needs its pages on the gpu. but if a request is paused, waiting for user input, or waiting in a queue, its cache can sit in cpu memory. we only copy it back to the gpu when the scheduler resumes it.

we can even offload all the way to nvme ssds. tools like FlexGen do this for massive batch jobs where throughput matters more than response time. letting the cache spill to disk allows us to run huge batch sizes, but nvme read latencies compound across all 126 layers. that can push token generation times into seconds, which is fine for background batch processing but too slow for a chatbot.

for interactive serving, the sweet spot is keeping active cache pages on the gpu, moving idle pages to cpu memory, and sizing the cpu memory to match the maximum expected concurrent users.

## what happens when a gpu dies

when we run a model sharded across a cluster, we have zero redundancy within the replica. every gpu is doing a unique job:

- gpus running pipeline parallelism hold different layers.
- gpus running tensor parallelism hold different slices of the weight matrices.

if a single gpu dies, the entire replica falls apart. the pipeline loses a stage, the matrix multiplications lose a slice of their weights, and all the kv cache stored on that gpu is gone. all 32 gpus in the replica become useless.

to get fault tolerance, we have to run multiple complete replicas of the cluster behind a load balancer. if one replica goes down, the load balancer routes traffic to the surviving replicas. but because gpus are expensive, we rarely run with much spare capacity. losing one replica means the survivors have to absorb the extra traffic, which easily turns a single hardware failure into a wider latency spike.

ultimately, serving these models is a classic systems engineering problem. once you look past the neural network weights, you are left with memory bandwidth bottlenecks, network latency, and scheduling queues. the model itself is just a set of big files; the hard part is building the machinery to stream them to thousands of users without going broke.
