# Blog Post Brief

**Title:** Understanding LLM Inference Engineering: Why Your Laptop Can't Keep Up

**Target audience:** Developers curious about ML inference, no deep ML background required

**Your setup:** 16GB RAM, 8-core CPU, no GPU, Ubuntu 24.04

**Main thesis:** Memory bandwidth, not compute, is the inference bottleneck on CPU. Understanding this explains GPUs, quantization, and why generation feels slow.

**Setup steps to include:**
1. Install Ubuntu, compile llama.cpp with OpenBLAS
2. Download Phi-3.1-mini GGUF models (Q2, Q4, Q8)
3. Run benchmarks, observe data

**Diagrams needed:**
- pp vs tg phase flow diagram
- KV cache growth over generation steps
- Quantization speed comparison bar chart
- First-token latency vs generation speed timeline

**Call-to-action:** "Try this yourself on your machine. The numbers won't match mine, but the insight will."


Meat of the blog :

Intro
I spent a day benchmarking LLM inference on a CPU-only laptop (16GB RAM, no GPU) and learned why inference feels slow, why big models require GPUs, and where all the engineering tradeoffs actually live. Here's what I found.
Part 1: The Two Phases of Inference
Phase 1: Prompt Processing (Parallel, Fast)
When you send a prompt to an LLM, the model doesn't generate one token at a time. Instead, it processes your entire input in parallel through all transformer layers.
Command:
bash~/llama.cpp/build/bin/llama-bench \
  --model ~/models/Phi-3.1-mini-4k-instruct-Q4_K_M.gguf \
  --n-gen 128 \
  -p 512 \
  --threads 8 \
  --batch-size 2048
Output:
| phi3 3B Q4_K - Medium          |   2.23 GiB |     3.82 B | BLAS       |       8 |           pp512 |         15.60 ± 1.42 |
| phi3 3B Q4_K - Medium          |   2.23 GiB |     3.82 B | BLAS       |       8 |           tg128 |          6.28 ± 0.07 |
This is compute-bound. The CPU is doing massive matrix multiplications across all 512 input tokens simultaneously. The bottleneck is compute power, not memory.
Key insight: The pp512 (15.60 tok/sec) is fast because you're processing all tokens in parallel, amortizing overhead across more work.

Part 2: The KV Cache Bottleneck
This is where the engineering reality hits.
During generation, the model doesn't recompute attention for all previous tokens. Instead, it caches their key and value vectors in RAM and reuses them.
What happens each generation step:
Step 1: Load KV cache [512 tokens, ...] → compute attention → get 1 token
Step 2: Load KV cache [513 tokens, ...] → compute attention → get 1 token  
Step 3: Load KV cache [514 tokens, ...] → compute attention → get 1 token
Each step, the cache grows by 1 token. You're moving more data per token.
Watching it happen in real-time:
Before the benchmark (baseline memory):
bash$ free -h
               total        used        free      shared  buff/cache   available
Mem:            15Gi       2.9Gi       2.0Gi       585Mi        11Gi        12Gi
Swap:          4.0Gi          0B       4.0Gi
During 4096-token context run:
bash$ free -h
               total        used        free      shared  buff/cache   available
Mem:            15Gi       5.8Gi       161Mi       561Mi        10Gi       9.7Gi
Swap:          4.0Gi        68Ki       4.0Gi
RAM allocated for KV cache: 5.8Gi - 2.9Gi = 2.9GB just for storing 4096 tokens of context.
Benchmark comparison:
512-token context:
bash~/llama.cpp/build/bin/llama-bench \
  --model ~/models/Phi-3.1-mini-4k-instruct-Q4_K_M.gguf \
  --n-gen 128 \
  -p 512 \
  --threads 8 \
  --batch-size 2048
Output:
| phi3 3B Q4_K - Medium          |   2.23 GiB |     3.82 B | BLAS       |       8 |           pp512 |         15.11 ± 1.12 |
| phi3 3B Q4_K - Medium          |   2.23 GiB |     3.82 B | BLAS       |       8 |           tg128 |          5.18 ± 1.18 |
4096-token context:
bash~/llama.cpp/build/bin/llama-bench \
  --model ~/models/Phi-3.1-mini-4k-instruct-Q4_K_M.gguf \
  --n-gen 128 \
  -p 4096 \
  --threads 8 \
  --batch-size 2048
Output:
| phi3 3B Q4_K - Medium          |   2.23 GiB |     3.82 B | BLAS       |       8 |          pp4096 |         11.90 ± 0.76 |
| phi3 3B Q4_K - Medium          |   2.23 GiB |     3.82 B | BLAS       |       8 |           tg128 |          3.37 ± 0.37 |
The numbers tell the story:
Metric          512 ctx     4096 ctx    Change
pp speed        15.11       11.90       -21%
tg speed        5.18        3.37        -35%
Prompt processing dropped 21% (compute-bound, marginal impact). Token generation dropped 35% (memory-bound, massive impact).
Why? The generation phase loads the entire KV cache from RAM for every single token:
generation_time_per_token = (kv_cache_bytes / memory_bandwidth) + (matmul_compute_time)

As context grows, the first term dominates.
On your CPU:

Memory bandwidth: ~50-100 GB/sec
KV cache at 4096 tokens: ~2.9 GB
Each token generation: must read this entire cache

This is why generation feels slow on CPU but fast on GPU — GPU VRAM bandwidth is 10x faster.

Part 3: Quantization as a Bandwidth Optimization
You're not shrinking the model to make it "smarter". You're shrinking it to move less data.
Download three quantization levels:
bashhf download bartowski/Phi-3.1-mini-4k-instruct-GGUF \
  Phi-3.1-mini-4k-instruct-Q2_K.gguf \
  --local-dir ~/models

hf download bartowski/Phi-3.1-mini-4k-instruct-GGUF \
  Phi-3.1-mini-4k-instruct-Q8_0.gguf \
  --local-dir ~/models
Benchmark all three:
bashfor model in ~/models/Phi-3.1-mini-4k-instruct-Q{2_K,4_K_M,8_0}.gguf; do
  echo "=== $(basename $model) ==="
  ~/llama.cpp/build/bin/llama-bench \
    --model "$model" \
    -p 512 \
    --n-gen 128 \
    --threads 8 \
    --batch-size 2048
done
Output:
=== Phi-3.1-mini-4k-instruct-Q2_K.gguf ===
| phi3 3B Q2_K - Medium          |   1.32 GiB |     3.82 B | BLAS       |       8 |           pp512 |          9.88 ± 0.81 |
| phi3 3B Q2_K - Medium          |   1.32 GiB |     3.82 B | BLAS       |       8 |           tg128 |          7.11 ± 0.80 |

=== Phi-3.1-mini-4k-instruct-Q4_K_M.gguf ===
| phi3 3B Q4_K - Medium          |   2.23 GiB |     3.82 B | BLAS       |       8 |           pp512 |         15.60 ± 1.42 |
| phi3 3B Q4_K - Medium          |   2.23 GiB |     3.82 B | BLAS       |       8 |           tg128 |          6.28 ± 0.07 |

=== Phi-3.1-mini-4k-instruct-Q8_0.gguf ===
| phi3 3B Q8_0                   |   3.78 GiB |     3.82 B | BLAS       |       8 |           pp512 |         14.96 ± 0.48 |
| phi3 3B Q8_0                   |   3.78 GiB |     3.82 B | BLAS       |       8 |           tg128 |          3.85 ± 0.18 |
The tradeoff table:
Format      File Size    pp512    tg128      pp Efficiency    tg Efficiency
Q2_K        1.32 GiB     9.88     7.11       worst            best
Q4_K_M      2.23 GiB    15.60     6.28       best             middle
Q8_0        3.78 GiB    14.96     3.85       middle           worst
Q2 Paradox
Smallest file, but NOT fastest prompt processing. Why?
Theory: 2-bit weights must be decompressed during inference. That decompression overhead eats CPU cycles.
Q2 pp = 9.88 tok/s (slowest)
Q4 pp = 15.60 tok/s (fastest)
Q8 pp = 14.96 tok/s (middle)
You save bandwidth by 70% (1.32 GB vs 2.23 GB), but lose it in decompression cost.
Insight: Compression isn't free. Smaller file ≠ faster inference.
Q4 Sweet Spot

Balanced compression overhead (4-bit dequant is cheap)
Significant bandwidth savings (50% smaller than Q8)
Fastest throughput on both phases

Q4_K_M: 15.60 tok/s (pp), 6.28 tok/s (tg)
This is why Q4_K_M is the industry standard.
Q8 Memory Wall

Minimal decompression overhead
Maximum bandwidth cost (3.78 GB file)
Generation speed craters:

Q2 tg = 7.11 tok/s
Q4 tg = 6.28 tok/s
Q8 tg = 3.85 tok/s  (46% slower than Q2)
You're moving 2.8x more data per token. Your CPU is RAM-bound, not compute-bound.
The insight: Quantization optimizes the data-to-compute ratio. On CPU (memory-constrained), smaller is better. On GPU (bandwidth-rich), quality matters more because you can afford the extra bytes.

Part 4: First Token Latency vs Generation Speed
Real-world inference has two distinct, measurable phases.
Create a Python inference script:
pythonimport requests
import time
import json

BASE_URL = "http://localhost:8000/v1"

prompt = "What is the capital of France? Explain briefly."

print(f"Prompt: {prompt}\n")

start = time.time()
response = requests.post(
    f"{BASE_URL}/chat/completions",
    json={
        "model": "phi3",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 128,
        "stream": True,
    },
    stream=True,
)

first_token_time = None
token_count = 0

for line in response.iter_lines():
    if not line or line.startswith(b"[DONE]"):
        continue
    
    if line.startswith(b"data: "):
        try:
            data = json.loads(line[6:])
            if data["choices"][0]["delta"].get("content"):
                token_count += 1
                if first_token_time is None:
                    first_token_time = time.time() - start
                    print(f"First token latency: {first_token_time:.3f}s")
                    print("\nGenerated text:")
                print(data["choices"][0]["delta"]["content"], end="", flush=True)
        except:
            pass

total_time = time.time() - start
print(f"\n\nTotal time: {total_time:.3f}s")
print(f"Tokens generated: {token_count}")
print(f"Generation speed: {token_count / (total_time - first_token_time):.2f} tok/s")
Start the server:
bash~/llama.cpp/build/bin/llama-server \
  --model ~/models/Phi-3.1-mini-4k-instruct-Q4_K_M.gguf \
  --port 8000 \
  --threads 8
Server startup output:
main: n_parallel is set to auto, using n_parallel = 4 and kv_unified = true
build_info: b8833-45cac7ca7
system_info: n_threads = 8 (n_threads_batch = 8) / 8 | CPU : SSE3 = 1 | SSSE3 = 1 | AVX = 1 | AVX2 = 1 | F16C = 1 | FMA = 1 | BMI2 = 1 | LLAMAFILE = 1 | OPENMP = 1 | REPACK = 1 |
...
llama_kv_cache: size = 1536.00 MiB (  4096 cells,  32 layers,  4/1 seqs), K (f16):  768.00 MiB, V (f16):  768.00 MiB
...
main: model loaded
main: server is listening on http://127.0.0.1:8000
Run the inference script:
bashpython ~/inference_test.py
Output:
Prompt: What is the capital of France? Explain briefly.

First token latency: 0.981s

Generated text:
The capital of France is Paris. Paris is not only the political center of the country but also a major cultural and economic hub. As the most populous city in France, it plays a significant role in the nation's identity and is known for its historical landmarks like the Eiffel Tower and the Louvre Museum.

Total time: 13.308s
Tokens generated: 66
Generation speed: 5.35 tok/s
Breaking it down:
Phase 1 (Prompt Processing):  0.981s  (process 20 input tokens)
Phase 2 (Generation):        12.327s  (generate 66 tokens @ 5.35 tok/s)
Total:                       13.308s
Where the time goes:

0.981s: Your prompt "What is the capital of France? Explain briefly." is processed through all 32 transformer layers
12.327s remaining: Generating 66 tokens at 5.35 tokens/second

Why this matters:
Users feel the first 0.981 seconds. That's the delay before anything appears on screen.
The sustained 5.35 tok/s is what they experience while reading. A 1-second delay before response feels slow, even if the text streams at 5 tok/s after that.
This explains why inference servers batch requests: They can process multiple prompts in parallel during the prompt phase, spreading the generation phase across time.

Part 5: The Server Logs Tell the Story
When you ran inference, the server logged detailed timings:
prompt eval time =     972.71 ms /    20 tokens (   48.64 ms per token,    20.56 tokens per second)
       eval time =   12325.20 ms /    67 tokens (  183.96 ms per token,     5.44 tokens per second)
      total time =   13297.91 ms /    87 tokens
Breaking this down:

prompt eval time = 972.71 ms / 20 tokens — Processing your input in parallel

972.71 ms ÷ 20 tokens = 48.64 ms per token of input
But you're doing this in parallel, so throughput = 20.56 tok/s


eval time = 12325.20 ms / 67 tokens — Generating output one at a time

12325.20 ms ÷ 67 tokens = 183.96 ms per token
Throughput = 5.44 tok/s



The 3.8x difference in latency (183.96 ms vs 48.64 ms per token) is the KV cache bottleneck. You're loading and reusing gigabytes of cached keys/values for each single output token.

Part 6: The Engineering Constraints
On your CPU:

Memory bandwidth ceiling: ~50-100 GB/sec
Cannot parallelize token generation (batch-size=1)
Bigger context = slower generation (quadratic KV cache growth)
CPU utilization is less important than memory efficiency

What would change with a GPU:
Same operations, but on VRAM:

VRAM bandwidth: 500+ GB/sec (10x faster)
Can parallelize 32+ requests simultaneously
Compute becomes the bottleneck instead of memory
Bigger context is painful but manageable


Part 7: The Complete Picture
Here's your actual hardware doing inference:
CPU Inference Flow (your setup):
┌─────────────────┐
│  20 tokens in   │  ← Your prompt
└────────┬────────┘
         │
         ▼
┌──────────────────────────┐
│ Prompt Processing        │
│ • Process all 20 in      │  
│   parallel               │  ← pp512: 15.60 tok/s
│ • Fill KV cache          │     takes 972ms
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Token Generation Loop    │
│ • Generate 1 token      │
│ • Load 512 K,V from RAM │  ← tg128: 5.35 tok/s
│ • Append to cache       │     takes 183ms per token
│ • Repeat 66 times       │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────┐
│ 66 tokens out    │
│ 13.3s total      │
└──────────────────┘
The generation loop is where you spend most of the time, and it's memory-bound.

Takeaway: Why This Matters
If you understand why inference is slow, you understand:

Why GPUs exist: 10x memory bandwidth for generation phase
Why quantization helps: Reduces KV cache size, less data movement
Why context length matters: Quadratic cache growth
Why batch processing is efficient: Amortizes prompt processing overhead across multiple requests
Why first-token latency sucks on CPU: Must process entire prompt before generating anything

The entire inference optimization stack (vLLM, TensorRT-LLM, Flash Attention, spec decoding) is built to solve one of these bottlenecks.