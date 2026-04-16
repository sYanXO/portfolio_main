---
title: "how llms actually run at scale"
date: "2026-04-16"
description: "a systems deep dive into what it takes to serve a 405B parameter model to thousands of users."
---

say you've trained a 405B parameter model. something Llama 3.1 405B sized. it passes your evals, it handles instructions well, it doesn't hallucinate too badly. now you want to serve it. you spin up a GPU, load the weights, and it doesn't fit.

405 billion parameters. in **float16** (a compact number format that uses 2 bytes per value instead of the usual 4), that's:

$$405 \times 10^9 \times 2 \text{ bytes} = 810 \text{ GB}$$

your B200 has 192GB of **HBM3e** (high bandwidth memory, the ultra-fast RAM soldered directly onto the GPU die). $810 \gg 192$. you'd need a minimum of 5 GPUs just for the weights, and that's before **activations** (the intermediate outputs each layer produces as data flows through the model), KV cache, or any other runtime overhead.

so now what? you need a cluster. let's assume you have the funds to get a cluster of B200s.

## pipeline parallelism: the assembly line

chop the model into stages by layers. a 405B model has 126 **transformer layers** (each layer is a self-contained block of attention + feedforward computation, stacked sequentially to form the full model). spread them across 4 pipeline stages:

- **stage 0:** layers 1-32
- **stage 1:** layers 33-64
- **stage 2:** layers 65-96
- **stage 3:** layers 97-126

a request enters stage 0, flows through its layers, then the activations get shipped to stage 1. each subsequent stage does the same. a single request still flows *serially* through the pipeline. no latency improvement for one request.

the parallelism comes from overlap. while stage 3 finishes request A, stage 2 is working on request B, stage 1 on C, and stage 0 starts D:

```
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

throughput is determined by the slowest stage, not the total end-to-end time. but notice the **pipeline bubble** at the start: stages 1-3 sit idle while the first request trickles through. the same happens in reverse at the end. for small batches, this idle time can dominate total runtime.

## tensor parallelism: splitting within a layer

pipeline parallelism splits vertically (by layer). tensor parallelism splits *horizontally* (within a single layer).

the core op in a transformer layer is a **matmul** (matrix multiplication): $Y = X \times W$ where $W$ is a giant weight matrix, for our 405B model shaped as $[16384 \times 16384]$. that's one matrix with 268 million parameters. you can split $W$ column-wise across 8 GPUs, so each GPU only holds and computes against a slice:

```
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

that **AllReduce** is the key cost. it's a collective communication operation: every GPU sends its partial result to every other GPU, and they all end up with the combined final answer. conceptually, 8 GPUs each compute a piece of the output, then synchronize so every GPU holds the complete result before the next layer can begin.

this happens every layer, every forward pass, every token. for 126 layers with 128 attention heads, the system pushes gigabytes per second of inter-GPU traffic just to keep the math correct.

## why hybrid: nvlink inside, infiniband outside

AllReduce is communication-heavy. how much communication it can sustain depends on how fast the GPUs can talk to each other, which depends on the physical wiring.

inside a single server node (a physical machine with 8 GPUs on one motherboard), GPUs are connected by **NVLink**, a direct high-speed interconnect soldered onto the board. it's a dedicated point-to-point link with no shared bus contention.

between nodes (separate physical machines in a datacenter rack), communication goes over **InfiniBand**, a high-performance network fabric. fast by networking standards, but substantially slower than a direct on-board link.

| interconnect | scope | bandwidth |
|---|---|---|
| **NVLink** (5th gen) | GPUs within a node | ~1.8 TB/s per GPU |
| **InfiniBand** (NDR) | across nodes | ~50 GB/s |

NVLink is ~36x faster. this dictates the entire parallelism strategy:

- **tensor parallelism** (AllReduce every layer, communication-heavy) stays *within* a node on NVLink where the bandwidth can handle it
- **pipeline parallelism** (ships activations once per stage, much less frequent) goes *across* nodes on InfiniBand

this is the **Megatron-LM** design, used across essentially all large-scale model deployments. for our 405B model: 4 nodes, 8 B200 GPUs each, 32 GPUs total. each node is one pipeline stage.

## micro-batching: fixing the bubble

feeding one big batch into a 4-stage pipeline means stage 0 finishes, ships everything, then sits idle. 3/4 of the GPUs doing nothing.

**micro-batching** fixes this: split the batch into many small chunks. stage 0 processes micro-batch 1, ships it, immediately starts micro-batch 2. by micro-batch 4, all stages are busy.

the tradeoff: each in-flight micro-batch needs its own memory for activations and KV cache (more on that soon). more micro-batches means smaller bubbles but higher memory pressure.

## inference vs. training

in training, the model stores all activations for the **backward pass** (the phase where gradients are computed and weights are updated by working backwards through the layers). for a 405B model, that's hundreds of GB of saved intermediate values on top of the weights. **gradient checkpointing** trades compute for memory: only store activations at periodic checkpoints (say every 4th layer), and recompute the rest during backprop.

inference has no backward pass. each layer computes its output, ships it forward, and the previous activations get freed immediately. much lighter on memory.

what inference *does* keep around is something else entirely.

## the kv cache

this is the most misunderstood part of LLM serving. the KV cache is *not* storing your conversation as text. it stores precomputed **Key and Value tensors** from the attention mechanism (the part of the transformer that lets each token look at and weigh every other token in the sequence).

the problem it solves: every new token needs to attend to all previous tokens. without caching, generating token $n$ means recomputing K and V vectors for all $n-1$ previous tokens from scratch. cost grows quadratically with sequence length.

with the KV cache:
- each token's K and V vectors get computed once and appended to the cache
- the next token computes only *its own* K and V, then attends over the cached history
- old tokens never get reprocessed

the context awareness that makes an LLM feel like it remembers your conversation lives in these vectors, not in stored text. they're a compressed, learned representation in the model's internal coordinate space.

how big is it? Llama 405B uses **grouped query attention** (GQA), an optimization where multiple attention heads share a single set of K/V vectors. instead of 128 separate K/V head pairs, it uses just 8. this shrinks the cache dramatically:

$$\text{per token} = 126 \text{ layers} \times 8 \text{ KV heads} \times 128 \text{ dim} \times 2 \text{ bytes} \times 2 \text{ (K and V)} \approx 0.5 \text{ MB}$$

$$\text{1 user, 10k tokens} = 5 \text{ GB}$$

$$\text{1000 users, 10k tokens each} = 5 \text{ TB}$$

just for cache. on top of 810 GB of model weights. GQA helps, but at 1000 concurrent users the numbers are still significant.

## kv cache in a distributed setting

in the hybrid parallel setup from earlier, the cache shards naturally across the cluster:

```
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

- **pipeline parallelism** splits vertically: each node owns the KV cache for *its* layers (node 0 for layers 1-32, node 1 for 33-64, etc.)
- **tensor parallelism** splits horizontally: the 8 KV heads are divided across 8 GPUs within a node, each storing K/V for its assigned head

one user's conversation context is physically scattered across all 32 GPUs in the cluster. a single conversation, fragmented across 4 nodes in a structured, deterministic pattern.

## pagedattention: virtual memory for kv cache

you don't know how long a response will be. naive approach: allocate the max sequence length (128k tokens for Llama 405B) worth of cache per request. most requests use a tiny fraction of that. massive waste.

**PagedAttention** (the foundation of [vLLM](https://github.com/vllm-project/vllm)) borrows from how operating systems manage RAM. instead of giving each request one big contiguous block, it uses fixed-size **pages** (small blocks, say 16 tokens of KV cache each):

- pages are scattered across GPU memory, not contiguous
- requests grab pages on demand as they generate more tokens
- finished requests release pages back to a free pool

same idea as virtual memory in your OS: your program *thinks* it has a big contiguous block of RAM, but the OS is actually juggling scattered physical pages behind the scenes.

result: near-zero internal fragmentation, memory utilization from ~20% to ~100%. small requests grab free pages without waiting for large contiguous blocks to open up.

## continuous batching

a standard approach to serving is **static batching**: collect N requests, process them all together, return results when the *longest* one finishes, then start the next batch. the problem is head-of-line blocking. if one request in a batch of 32 generates 2000 tokens while the rest finish in 50, those 31 slots sit occupied but idle for the remaining 1950 steps. the GPU is generating padding for finished requests.

**continuous batching** (also called iteration-level scheduling) rethinks this at the granularity of individual generation steps:

- at every single token generation step, the scheduler checks which requests have finished (hit their stop token or max length)
- finished requests are evicted immediately and their KV cache pages are freed
- new requests from the queue are slotted into the freed positions
- the batch composition changes on every iteration

the effect is substantial. consider 1000 requests arriving over 10 seconds with response lengths varying from 20 to 2000 tokens. with static batching, average GPU utilization might be 30-40% because short requests hold slots hostage. with continuous batching, utilization stays above 90% because slots are recycled the instant a request completes.

the bookkeeping is nontrivial: the scheduler must manage per-request KV cache pages, track independent sequence positions for each active request, and handle the PagedAttention page tables, all without introducing per-step latency overhead. this is standard in vLLM, TensorRT-LLM, and TGI.

## kv cache offloading

GPU HBM is fast but scarce. KV cache retrieval is a **memory bandwidth problem**, not a compute problem. reading K/V vectors to compute attention is a large memory read followed by a comparatively small matrix operation. this means you can use slower, cheaper memory if you can tolerate the added latency:

| tier | bandwidth | capacity | cost |
|---|---|---|---|
| GPU HBM (B200) | ~8 TB/s | 192 GB | $$$ |
| CPU DRAM | ~100 GB/s | 512 GB - 2 TB | $$ |
| NVMe SSD | ~7 GB/s | 4-16 TB | $ |

offloading KV cache to CPU DRAM via **PCIe** (the standard bus connecting the GPU card to the rest of the server, ~64 GB/s) adds latency per token but expands available cache memory by an order of magnitude. a server with 1TB of DRAM can hold far more concurrent conversations than 192GB of HBM.

the key insight is that not all KV cache is equally hot. actively-generating requests need their cache on-GPU for low-latency access. but requests that are paused (waiting for user input, preempted by the scheduler, or in a queue) don't need fast access at all. their cache can sit in CPU DRAM until the request resumes, at which point the relevant pages are prefetched back to GPU.

SSD offloading pushes this further. **FlexGen** explored aggressive GPU-to-CPU-to-SSD tiering for throughput-oriented batch workloads: if you don't need interactive latency (processing a backlog of requests offline), you can serve batch sizes that would otherwise be impossible by letting KV cache spill to disk. the tradeoff is steep: NVMe latency compounds across 126 layers and can push per-token time into seconds. viable for batch processing, not for a chatbot.

the practical approach for interactive serving: keep actively-generating cache on GPU, move idle/preempted cache to CPU DRAM, and size the DRAM tier to handle your expected concurrency.

## fault tolerance: the hard truth

in a hybrid parallel replica, every GPU does something unique:
- pipeline parallel GPUs own **different layers**
- tensor parallel GPUs own **different slices** of each layer

there's no redundancy. no backup. if one GPU dies:
- the pipeline has a missing stage. no request can flow through it.
- the matmul has 7/8 of a weight matrix. you can't do linear algebra with a missing slice.
- that GPU's KV cache shard is gone. every active request loses part of its context.

the entire replica is dead. all 32 GPUs rendered useless by one failure.

fault tolerance comes from running **multiple complete replicas** behind a load balancer. lose one of 4 replicas and the remaining 3 absorb 33% more traffic. but they were already loaded. one dead GPU doesn't just remove capacity, it cascades into latency spikes across healthy replicas.

## the real hard part

the ML is almost the easy part. training a model is well-understood (if expensive). the architecture, the data pipelines, the training recipes are largely converged.

the hard part is everything around serving it: load balancing across replicas with heterogeneous request lengths, autoscaling GPU clusters at \$30/hr per node, capacity planning against bursty traffic, memory management across HBM/DRAM/NVMe, and fault tolerance in a system where every GPU is a single point of failure within its replica.

LLM inference at scale is a distributed systems problem. the model is just the function that runs on top of the actual engineering.
