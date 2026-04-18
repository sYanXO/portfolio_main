---
title: "Understanding LLM Inference Engineering: Why Your Laptop Can't Keep Up"
date: "2026-04-18"
description: "i benchmarked a small llm on my cpu and finally saw where inference time actually goes."
---

ask a language model a question on your laptop and watch it suffer.

> **prerequisites:** this post assumes basic familiarity with the transformer architecture, attention mechanisms, key-value (kv) caching, tokenization, matrix multiplications in neural networks, and what quantization means at a high level. you don't need to be an expert, but knowing what these terms refer to will help you follow along and reproduce the benchmarks yourself.

the setup was deliberately unimpressive: 16GB RAM, 8 cpu cores, ubuntu 24.04, no gpu. that turned out to be perfect, because the bottleneck was impossible to ignore. no gpu meant the bottleneck couldn't hide behind cuda optimizations.

i spent a day benchmarking `phi-3.1-mini` on that cpu-only machine because i wanted to know what exactly was slow. the answer was immediate: generation was about 3x slower than prompt processing for the same model run.

the short version is this: **memory bandwidth is the real problem**. not raw compute. once i saw that, a bunch of other things suddenly made sense: why quantization helps, why long context hurts, why first-token latency feels bad, and why GPUs matter so much.

## the setup

first, i built `llama.cpp` with `openblas`:

```bash
git clone https://github.com/ggml-org/llama.cpp
cd llama.cpp
cmake -B build -DGGML_BLAS=ON -DGGML_BLAS_VENDOR=OpenBLAS
cmake --build build -j
```

this compiled `llama.cpp` with `openblas`, a linear algebra library that uses all 8 cpu cores.

then i downloaded three `phi-3.1-mini` quantizations in `gguf` format. i downloaded three different compression levels of the same model to understand quantization tradeoffs:

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

for most of the tests i used this benchmark command:

```bash
~/llama.cpp/build/bin/llama-bench \
  --model ~/models/Phi-3.1-mini-4k-instruct-Q4_K_M.gguf \
  --n-gen 128 \
  -p 512 \
  --threads 8 \
  --batch-size 2048
```

that gave me two numbers:

```text
| phi3 3B Q4_K - Medium | pp512 | 15.60 +- 1.42 |
| phi3 3B Q4_K - Medium | tg128 |  6.28 +- 0.07 |
```

those labels matter more than they look.

## prompt processing and token generation are different jobs

`pp512` means prompt processing over 512 input tokens. `tg128` means generating 128 output tokens.

they're the exact same attention operation. but one is parallel, one is serial. that changes everything.

prompt processing is the model taking your whole input and pushing it through all transformer layers. this phase is highly parallel. if your prompt is 512 tokens long, the model can process those tokens together.

generation is the opposite. once the prompt is done, the model has to produce the next token, append it to the sequence, then produce the next one. one token at a time. no cheating.

here's the difference visualized:

the flow looks like this:

```text
prompt tokens
    |
    v
+---------------------------+
| prompt processing (pp)    |
| compute-bound             |
| many tokens in parallel   |
| fill kv cache             |
+-------------+-------------+
              |
              v
+---------------------------+
| token generation (tg)     |
| memory-bound              |
| 1 token at a time         |
| read cache, append, loop  |
+---------------------------+
```

that's why pp and tg have completely different speed characteristics. same model, same math, but one scales and one doesn't.

that difference is why `pp512` was about 15.6 tok/s while `tg128` was about 6.3 tok/s on the same machine, with the same model, in the same run.

## the kv cache is where cpu inference starts to suffer

during generation, the model does not recompute the whole prompt every time. it stores the attention keys and values from previous tokens in the **kv cache** and reuses them.

that sounds efficient, and it is. but it creates a new problem.

every generated token needs to read the cache for all previous tokens. so the work per token keeps growing with context length. not a little. mechanically.

## why reading cache gets more expensive each step

here's what the generation loop does:

```text
step 1: read cache for 512 tokens  -> generate 1 token
step 2: read cache for 513 tokens  -> generate 1 token
step 3: read cache for 514 tokens  -> generate 1 token
```

by step 1000, you're moving 1000x more data per token than at step 1. this is why long context hurts.

on my machine, a 4096-token context used roughly 2.9GB more RAM than baseline. watching 2.9GB materialize in real-time made it impossible to ignore: this wasn't theoretical anymore.

## longer context hurts generation more than prompt processing

let me benchmark the same model with different context lengths:

```text
512 context
pp512  = 15.11 tok/s
tg128  =  5.18 tok/s

4096 context
pp4096 = 11.90 tok/s
tg128  =  3.37 tok/s
```

```text
Metric      512 ctx    4096 ctx   Change
pp speed    15.11      11.90      -21%
tg speed     5.18       3.37      -35%
```

prompt processing degrades gracefully. generation crashes. that's because one is compute-bound and one is memory-bound.

the crude mental model is:

```text
time per generated token =
  kv cache bytes / memory bandwidth
  + matmul compute time
```

on cpu, memory bandwidth is the ceiling. everything waits for data.

## quantization is really a bandwidth trade

let me test whether compression actually helps:

| Format | File Size | pp512 | tg128 | Why It Matters |
|---|---:|---:|---:|---|
| Q2_K | 1.32 GiB | 9.88 | 7.11 | Smallest, but decompression tax |
| Q4_K_M | 2.23 GiB | 15.60 | 6.28 | Fastest overall, sweet spot |
| Q8_0 | 3.78 GiB | 14.96 | 3.85 | Largest, hits memory bandwidth wall |

notice: smallest file does not mean fastest. this is the key insight about quantization.

`Q2_K` had the fastest generation, but the slowest prompt processing. the likely reason is decompression overhead. 2-bit weights save memory traffic, but unpacking them costs cpu work.

`Q8_0` had decent prompt speed and terrible generation speed. generation speed dropped 46% compared to `Q2_K`, even though the model is only 2.8x larger. that's purely a bandwidth problem.

`Q4_K_M` landed in the middle on size and came out best overall. this is why `Q4_K_M` is the industry standard everywhere. it's not magic. it's the best compromise.

> **key insight:** quantization isn't about making smaller models. it's about optimizing the data-to-compute ratio on your hardware.

## first-token latency and streaming speed are separate problems

i wanted to see what real inference felt like, not just benchmark numbers. so i ran `llama-server` locally:

```bash
~/llama.cpp/build/bin/llama-server \
  --model ~/models/Phi-3.1-mini-4k-instruct-Q4_K_M.gguf \
  --port 8000 \
  --threads 8
```

then i sent a small chat completion request and timed two things:

- time until the first token arrived
- sustained generation speed after that

for a short prompt, i got:

```text
first token latency: 0.981s
generation speed:    5.35 tok/s
total time:         13.308s
tokens generated:         66
```

that 0.981 second pause is dead air. users see nothing. then it suddenly streams at around 5 tokens per second. that's two completely different bottlenecks.

the timeline looks like this:

```text
0s                   0.981s                                     13.308s
|--------------------|------------------------------------------|
dead air             first token                                done
prompt processing    streaming at ~5.35 tok/s
```

server logs confirmed the same pattern:

```text
prompt eval time =   972.71 ms / 20 tokens
eval time        = 12325.20 ms / 67 tokens
```

the prompt processing finished in under 1 second. the generation took 12+ seconds. same model, same request, completely different speed profiles.

so far i've been talking about cpu. what changes when you add a gpu?

## why gpu inference feels like a different universe

the answer isn't that gpus are faster at math.

once you look at the generation loop as a bandwidth problem, the gpu story gets very simple.

gpus have much faster memory. not just more of it. much faster.

on a cpu, you might get something like 50 to 100 GB/s of memory bandwidth.

on a modern gpu, VRAM bandwidth is several hundred GB/s and often much higher.

```text
+----------------------+    +----------------------+
| CPU DRAM bandwidth   |    | GPU VRAM bandwidth   |
| 50-100 GB/s          |    | 500+ GB/s            |
| cache reads crawl    |    | cache reads fly      |
+----------------------+    +----------------------+
```

that's not just faster. that's 5-10x faster for the exact same memory access pattern.

on gpu, that 2.9GB kv cache for 4096 tokens moves in milliseconds instead of hundreds of milliseconds. generation stops being the dominant bottleneck.

that changes the economics of generation completely. the model still has to read the kv cache every step, but the memory system is no longer dragging its feet nearly as much.

so when people say GPUs are good for llms, the answer is not just because GPUs do more math. they also move model weights and cache data far more efficiently. for inference, especially generation, that distinction matters a lot.

## what i understand now that i didn't before

before doing these runs, i had a vague picture that inference was hard because transformers are big and matrix multiplies are expensive. that's true, but incomplete.

that vague picture turned into something precise:

- prompt processing likes parallel compute
- generation lives inside a serial loop
- the kv cache grows with context
- reading that cache becomes a bandwidth problem
- quantization helps when it reduces bytes moved more than it increases decode cost

this model explains real-world behavior:

- why long context slows down inference
- why smaller quantizations can be faster than you'd expect
- why cpu inference feels sticky but gpu inference feels instant
- why almost all inference optimization is really memory optimization in disguise

and it doesn't require any magic or hand-waving.

## next steps

if this got you curious:

- try the thread scaling experiment: benchmark with `-t 4`, `-t 2`, `-t 1`
- test context length impact: run the same benchmark at `512`, `2048`, `4096`, `8192` tokens
- download a `7B` model and benchmark it against `3B`
- these will confirm the patterns you see here apply everywhere

try this on your own machine tonight. run the same benchmarks. the exact numbers will vary. the shape of the problem won't. once you see it, you can't unsee it.
