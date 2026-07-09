---
title: "understanding llm inference engineering: why your laptop can't keep up"
date: "2026-04-18"
description: "i benchmarked a small llm on my cpu and finally saw where inference time actually goes."
---

running a large language model on a standard laptop cpu is a slow process.

to see where the time actually goes, i benchmarked a small model on a basic setup: 16gb of ram, 8 cpu cores, running ubuntu 24.04 without a gpu. running without a graphics card made the hardware limitations clear.

i tested `phi-3.1-mini` and found that token generation was three times slower than prompt processing.

the performance limit comes down to **memory bandwidth** instead of processor speed. this bandwidth bottleneck explains why quantization helps, why long context slows down generation, and why graphics cards are necessary for reasonable speeds.

## the setup

compiling `llama.cpp` with `openblas` allows the system to use all 8 cpu cores:

```bash
git clone https://github.com/ggml-org/llama.cpp
cd llama.cpp
cmake -B build -DGGML_BLAS=ON -DGGML_BLAS_VENDOR=OpenBLAS
cmake --build build -j
```

i downloaded three versions of `phi-3.1-mini` with different compression levels:

```bash
hf download bartowski/Phi-3.1-mini-4k-instruct-GGUF \
  Phi-3.1-mini-4k-instruct-Q2_K.gguf \
  --local-dir ~/models

hf download bartowski/Phi-3.1-mini-4k-instruct-GGUF \
  Phi-3.1-mini-4k-instruct-Q4_K_M.gguf \
  --local-dir ~/models

hf download bartowski/Phi-3.1-mini-4k-instruct-GGUF \
  Phi-3.1-mini-4k-instruct-Q8_0.gguf \
  --local-dir ~/models
```

to run the benchmarks, i used the built-in benchmarking tool:

```bash
~/llama.cpp/build/bin/llama-bench \
  --model ~/models/Phi-3.1-mini-4k-instruct-Q4_K_M.gguf \
  --n-gen 128 \
  -p 512 \
  --threads 8 \
  --batch-size 2048
```

this test returns two main metrics:

```text
| phi3 3B Q4_K - Medium | pp512 | 15.60 +- 1.42 |
| phi3 3B Q4_K - Medium | tg128 |  6.28 +- 0.07 |
```

## prompt processing and token generation are different jobs

the `pp512` label represents prompt processing for 512 input tokens. the `tg128` label represents generating 128 output tokens.

although both operations use the same underlying attention math, they run differently.

prompt processing runs in parallel. the model takes the entire input prompt and processes all tokens at the same time to build the initial state.

generation is sequential. once the prompt is processed, the model must calculate the next token, add it to the sequence, and then repeat the process for each subsequent token.

```text
prompt tokens
    |
    v
+---------------------------+
| prompt processing (pp)    |
| compute bound             |
| many tokens in parallel   |
| fill kv cache             |
+-------------+-------------+
              |
              v
+---------------------------+
| token generation (tg)     |
| memory bound              |
| 1 token at a time         |
| read cache, append, loop  |
+---------------------------+
```

parallel processing scales well on multi-core processors, while sequential generation cannot be parallelized.

this difference explains why prompt processing ran at 15.6 tokens per second, while token generation dropped to 6.3 tokens per second in the same benchmark run.

## the kv cache is where cpu inference starts to suffer

to avoid recomputing the entire sequence at each step, the system saves the attention keys and values of previous tokens in the **kv cache**.

this saves compute cycles, but it increases memory traffic.

each new token must be compared against the keys and values of all preceding tokens. as the sequence grows, the amount of data the processor has to read from the cache increases with every step.

## why reading cache gets more expensive each step

the data requirements grow at each step of the generation loop:

```text
step 1: read cache for 512 tokens  -> generate 1 token
step 2: read cache for 513 tokens  -> generate 1 token
step 3: read cache for 514 tokens  -> generate 1 token
```

by the thousandth token, the processor must read nearly three times as much cache data from memory as it did on the first token.

a 4096-token context consumed an additional 2.9gb of memory compared to the baseline. this growth in memory usage shows the scale of data movement involved.

## longer context hurts generation more than prompt processing

comparing the same model at different context lengths shows the performance impact:

```text
metric      512 ctx    4096 ctx   change
pp speed    15.11      11.90      -21%
tg speed     5.18       3.37      -35%
```

prompt processing speed drops by 21%, while token generation speed drops by 35%.

during token generation, the processor must fetch the active model weights and the growing cache from ram for every single token. a rough estimation of the time required per token looks like this:

```text
time per token = (model weights + cache data) / memory bandwidth + compute time
```

because cpu memory bandwidth is low, the processor spends most of its time waiting for cache data to arrive from system memory.

## quantization is really a bandwidth trade

benchmarking different compression levels shows how file size interacts with execution speed:

| format | file size | pp512 | tg128 | notes |
|--------|----------:|------:|------:|-------|
| q2_k   | 1.32 gb   | 9.88  | 7.11  | small file, slow prompt processing |
| q4_k_m | 2.23 gb   | 15.60 | 6.28  | balanced speed and size |
| q8_0   | 3.78 gb   | 14.96 | 3.85  | large file, slow generation |

the smallest file is not the fastest overall.

the `q2_k` model has the fastest token generation but the slowest prompt processing. unpacking 2-bit weights reduces the data transferred from memory, but decompressing those weights costs extra cpu cycles.

the `q8_0` model matches `q4_k_m` in prompt processing but runs slowest during token generation. because the file is larger, the processor spends more time transferring weights from ram for every token. generation speed drops by 46% compared to `q2_k` because of this memory bandwidth limit.

the `q4_k_m` format balances size and speed. it remains the standard choice because it avoids both high decompression costs and heavy memory transfer overhead.

quantization is less about saving disk space and more about finding the right balance between data transfer and processor compute.

## first-token latency and streaming speed are separate problems

running a local server shows how these bottlenecks feel in practice:

```bash
~/llama.cpp/build/bin/llama-server \
  --model ~/models/phi-3.1-mini-4k-instruct-q4_k_m.gguf \
  --port 8000 \
  --threads 8
```

a standard chat request returned these timing metrics:

```text
first token latency: 0.981s
generation speed:    5.35 tok/s
total time:         13.308s
tokens generated:       66
```

the initial delay of nearly a second is the time it takes the processor to read and evaluate the prompt. once that completes, the model begins streaming tokens at about five per second.

```text
0s                   0.981s                                     13.308s
|--------------------|------------------------------------------|
prompt evaluation    first token                                done
                     sequential streaming
```

the server logs split the execution time:

```text
prompt eval time =   972.71 ms / 20 tokens
eval time        = 12325.20 ms / 67 tokens
```

evaluating the 20-token prompt took less than a second, while generating the 67-token response took over twelve seconds.

## why gpu inference feels like a different universe

the main advantage of a graphics card for running models is memory speed.

graphics cards use high-bandwidth memory (vram) rather than standard system ram. the difference in data transfer rates is substantial:

```text
+----------------------+    +----------------------+
| cpu dram bandwidth   |    | gpu vram bandwidth   |
| 50-100 gb/s          |    | 500+ gb/s            |
| slower cache reads   |    | faster cache reads   |
+----------------------+    +----------------------+
```

with five to ten times more bandwidth, a graphics card can load the model weights and the kv cache in a fraction of the time. a 2.9gb cache that takes hundreds of milliseconds to read on a cpu moves in milliseconds on a gpu, shifting the primary bottleneck from memory retrieval to processor compute.

graphics cards are well suited for running models because they transfer weights and cache data quickly, not just because they perform fast matrix math.

## next steps

if you want to test these limits on your own hardware, you can modify a few parameters to watch the bottlenecks shift:

- adjust the thread count using `-t 4`, `-t 2`, or `-t 1` to see where cpu performance hits a memory bandwidth limit.
- increase the benchmark context length to `2048` or `4096` to watch how token generation speed declines as the cache grows.
- test a `7b` model against a `3b` model to see how doubling the model size increases the memory transfer requirements.

running these tests makes the relationship between cache size, bandwidth, and compute speed concrete.