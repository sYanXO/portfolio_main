---
title: "flashattention from first principles"
date: "2026-06-24"
description: "i knew how attention worked in C++ but couldn't read the FlashAttention paper. the missing piece was one sentence: a sentence is a matrix. once that clicked, i wrote both kernels in CUDA and watched the tiled version pull 3x on a T4."
---

i had a problem. i'd written a [full transformer encoder in C++](/blog/attention-is-all-you-need-in-raw-cpp) with AVX2 matmul, multi-head attention, softmax, the whole thing. i could step through every line of it. but when i opened the FlashAttention paper, i bounced off the first page.

the paper talks about Q, K, V like you already know what they are. not how they're *used* (i had code for that), but what they *mean*. why those three matrices exist. where they come from. i could multiply them together correctly and still not explain to someone why we multiply them.

the gap turned out to be embarrassingly small.

## a sentence is a matrix

this is the thing nobody says clearly enough. you start with a sentence. a sequence of tokens. each token gets looked up in an **embedding table**, which is just a big matrix where row *i* is the learned vector for token *i*. the lookup produces one vector per token.

stack those vectors as rows and you have the input matrix **X**, shape (N x D). N tokens, D dimensions per token.

that's it. the bridge between language and linear algebra is a table lookup. every sentence becomes a matrix the moment you index into the embedding table. everything downstream is matrix math on X.

## Q, K, V are not model weights

this was the other thing i had backwards. i kept mentally categorizing Q, K, V alongside the weight matrices. they're not weights. they're *computed fresh for every input* and thrown away after.

the actual model weights are **Wq**, **Wk**, and **Wv**. three learned matrices per attention head per layer. during inference, these are frozen. they never change. a trillion parameter model has thousands of these matrices stacked across its layers and heads.

for a given input X, the computation is:

```text
Q = X · Wq
K = X · Wk
V = X · Wv
```

three matrix multiplications with fixed weights. that's all inference is doing here. Q is *this input's* queries. K is *this input's* keys. V is *this input's* values. next input, same Wq/Wk/Wv, completely different Q/K/V.

once i internalized this, the attention formula stopped being abstract.

## the attention computation, now with context

**Q · Kᵀ** gives an (N x N) matrix where entry (i, j) is how strongly token i's query matches token j's key. it's a similarity matrix. every token scored against every other token.

**softmax** per row converts those raw scores into a probability distribution. each row sums to 1.

**multiply by V** produces the output. each output row is a weighted blend of value vectors, where the weights came from softmax. tokens that matched strongly contribute more to each other's representations.

i had the code for all of this already. but the words *query, key, value* finally meant something. Q asks the question. K advertises what each token has. V is what you actually take from the tokens you attend to.

## the N x N problem

here's where it gets interesting from a systems perspective.

that (N x N) score matrix has to exist somewhere. in a standard attention kernel, you compute Q · Kᵀ, write the full result to GPU global memory (HBM), read it back for softmax, write the softmax output back to HBM, read it again for the V multiply.

at N=512, the score matrix is 262,144 floats. fine.

at N=2048, it's 4,194,304 floats. still fits, but you're doing three round trips to HBM for a matrix that size.

at N=10,000, it's 100 million floats. at N=100,000 (which modern models handle), it's 10 billion floats.

the arithmetic isn't the bottleneck. the data movement is. attention is **memory-bound**. the kernel spends most of its wall-clock time waiting for data to shuttle between HBM (slow, big) and SRAM (fast, small). the actual multiply-adds finish long before the memory transfers do.

this is what FlashAttention fixes.

## online softmax: the key mathematical trick

standard softmax needs the entire row before it can normalize. you compute `exp(x_i)` for every element, sum them, divide each by the sum. you can't start dividing until you've seen the last element.

online softmax changes this. instead of needing the full row, it maintains a **running max** and a **running sum** as it processes tiles of the row left to right.

when a new tile arrives with a larger max value, you apply a correction factor:

```text
correction = exp(old_max - new_max)
```

the old running sum gets multiplied by this correction, and the old partial output accumulates it too. mathematically, this is scaling down the old exponentials to account for the fact that the max changed. the final result is identical to standard softmax.

this is the single mathematical innovation that makes FlashAttention possible. everything else in the paper is engineering around this idea. if you can compute softmax tile by tile, you never need the full (N x N) matrix in memory at once.

## decoding the flashattention algorithm

the paper's Algorithm 1 does this:

1. tile Q into blocks of rows (block size Br)
2. tile K and V into blocks of rows (block size Bc)
3. for each Q block:
   - for each K block:
     - compute a small (Br x Bc) score tile in SRAM (fast on-chip memory)
     - update the running max and running sum for online softmax
     - apply the correction factor to the accumulated output
     - multiply the softmax weights by the corresponding V block
     - accumulate into the output tile
   - write the final output block to HBM once

the score matrix is never materialized in HBM. each (Br x Bc) tile lives in SRAM for exactly as long as it takes to process, then gets overwritten by the next tile. the output O is accumulated in registers using the online softmax correction and written to HBM exactly once per Q block.

same math. a fraction of the memory traffic.

## the cuda kernels

i wrote two CUDA kernels. i should be upfront here: the CUDA code was LLM-generated. i understood the *why* deeply at this point (the memory bottleneck, the online softmax correction, the tiling strategy) but CUDA syntax, thread hierarchy, and shared memory mechanics are things i'm still learning. i treated the kernels as executable specifications of the algorithm, not as code i could write from scratch yet.

the **vanilla kernel** does attention the standard way. one thread per output row, full (N x N) scores array in HBM, three memory round trips:

```cuda
// for each row i, compute scores against all keys
for (int j = 0; j < N; j++) {
    float score = 0.0f;
    for (int d = 0; d < D; d++)
        score += Q[i * D + d] * K[j * D + d];
    scores[i * N + j] = score / sqrtf((float)D);
}

// softmax over the full row
// ... standard max-subtract, exp, sum, divide ...

// multiply by V
for (int d = 0; d < D; d++) {
    float out = 0.0f;
    for (int j = 0; j < N; j++)
        out += scores[i * N + j] * V[j * D + d];
    O[i * D + d] = out;
}
```

the **flash kernel** loads Q, K, V in SRAM-sized tiles using shared memory, computes the score tile locally, runs online softmax with the correction factor, accumulates the output in registers, and writes to HBM once:

```cuda
// in shared memory: Q_tile[Br][D], K_tile[Bc][D], V_tile[Bc][D]
// in registers: running_max, running_sum, output accumulator

for (int kv_block = 0; kv_block < num_kv_blocks; kv_block++) {
    // load K and V tiles into shared memory
    __syncthreads();

    // compute Br x Bc score tile
    float local_scores[Bc];
    for (int j = 0; j < Bc; j++) {
        float s = 0.0f;
        for (int d = 0; d < D; d++)
            s += Q_tile[row][d] * K_tile[j][d];
        local_scores[j] = s / sqrtf((float)D);
    }

    // online softmax: update max, apply correction
    float new_max = running_max;
    for (int j = 0; j < Bc; j++)
        new_max = fmaxf(new_max, local_scores[j]);

    float correction = expf(running_max - new_max);
    running_sum *= correction;
    // scale existing output accumulator by correction
    for (int d = 0; d < D; d++)
        output[d] *= correction;

    // accumulate new tile's contribution
    for (int j = 0; j < Bc; j++) {
        float w = expf(local_scores[j] - new_max);
        running_sum += w;
        for (int d = 0; d < D; d++)
            output[d] += w * V_tile[j][d];
    }
    running_max = new_max;
}

// normalize and write once to HBM
for (int d = 0; d < D; d++)
    O[row * D + d] = output[d] / running_sum;
```

the key thing to notice: scores never leave the thread. the `local_scores` array lives in registers. the V accumulation happens in registers. the only HBM write is the final normalized output.

## correctness check

both kernels run on identical randomly generated input. the flash kernel's output is compared element-wise against the vanilla kernel's output.

```
max absolute difference: 7.000000e-07
PASS
```

7e-07. that's floating-point rounding from doing the operations in a different order (tiled vs. full-row). mathematically identical, numerically within float32 epsilon territory.

seeing PASS print to the terminal was unreasonably satisfying.

## benchmark results

profiled on a free-tier Colab T4 (16GB VRAM), using `cudaEvent` timing for the kernel execution only (excluding host-device transfers):

| N | vanilla | flash | speedup |
|---|---------|-------|---------|
| 512 | 2.20 ms | 1.33 ms | 1.65x |
| 1024 | 6.59 ms | 2.83 ms | 2.33x |
| 2048 | 21.03 ms | 7.07 ms | 2.97x |

the speedup grows with N. at 512 tokens, flash is 1.65x faster. at 2048, it's nearly 3x. this is consistent with the paper's central claim: the benefit compounds as sequence length increases, because the (N x N) matrix that vanilla attention writes to HBM grows quadratically while FlashAttention's memory traffic grows linearly.

the vanilla kernel also shows clear quadratic scaling. doubling N from 512 to 1024 triples the time (2.20 to 6.59 ms). doubling again to 2048 triples it again (6.59 to 21.03 ms). that's the N² score matrix dominating runtime.

the flash kernel scales much more gently. 1.33 to 2.83 to 7.07 ms. still super-linear (the arithmetic is still O(N²D)), but the constant is smaller because the memory traffic pattern is fundamentally different.

## what actually landed

a few things clicked during this that i don't think i would have gotten from reading alone.

**Wq, Wk, Wv are frozen after training.** inference is just matrix multiplications with fixed weights. there's no learning happening, no gradient computation, no weight updates. you're running a very expensive fixed function.

**Q, K, V are ephemeral.** computed fresh for every input, used once, discarded. they're intermediate results, not part of the model's identity.

**the (N x N) matrix is the bottleneck.** the vanilla kernel took 21ms at N=2048 not because arithmetic is slow but because data movement is slow. the GPU's ALUs were idle most of that time, waiting for HBM reads and writes to complete.

**the correction factor is the entire innovation.** `exp(old_max - new_max)` is what makes tiled softmax produce the same result as full-row softmax. without it, you'd need the full row in memory to normalize correctly. with it, you can process arbitrarily long rows in fixed-size chunks. everything else in the FlashAttention paper is engineering around this one equation.

## what i don't know yet

the CUDA thread model is still fuzzy for me. i understand warps and blocks conceptually but couldn't write a kernel from scratch that correctly handles shared memory bank conflicts or occupancy tuning. the `__syncthreads()` calls in the flash kernel are there because i know they need to be, not because i could derive their placement from first principles.

i also haven't touched FlashAttention-2 or FlashAttention-3, which rearrange the loop order and add further optimizations. the original algorithm was enough to understand the core idea.

the excitement of watching the benchmark numbers print and seeing PASS on the correctness check was too good to gate behind *fully understanding CUDA first*. sometimes you build the thing, verify it works, and backfill the knowledge later. the understanding of *why* it works is solid. the *how* of the GPU programming model is next.

the [previous post](/blog/attention-is-all-you-need-in-raw-cpp) built the CPU side. this one moved to the GPU and asked a harder question: not just *how* to compute attention, but *how to compute it without drowning in memory traffic*. the answer is 14 characters: `exp(m_old - m_new)`.
