---
title: "flashattention from first principles"
date: "2026-06-24"
description: "i knew how attention worked in C++ but couldn't read the FlashAttention paper. the missing piece was one sentence: a sentence is a matrix. once that clicked, i wrote both kernels in CUDA and watched the tiled version pull 3x on a T4."
---

i had a problem. i wrote a [full transformer encoder in C++](/blog/attention-is-all-you-need-in-raw-cpp) with AVX2 matmul, multi-head attention, and softmax, but when i opened the FlashAttention paper, i bounced off the first page.

the paper assumes you know what `Q`, `K`, and `V` mean conceptually, not just how to multiply them. i could step through my C++ code and multiply the matrices correctly, but i couldn't explain why they existed.

the gap turned out to be small.

## representing sentences as matrices

you start with a sentence, which is a sequence of tokens. each token corresponds to a row in an embedding table. looking up the tokens produces a vector for each token.

when you stack these vectors as rows, you get the input matrix `X`, with shape `N x D` (where `N` is the number of tokens and `D` is the dimension of each token).

once you look up the vectors, the sentence is just a matrix. everything after that is linear algebra on `X`.

## queries, keys, and values are not weights

i used to think of `Q`, `K`, and `V` as model weights. they are not. they are computed fresh for every input and discarded immediately after use.

the actual model weights are `W_q`, `W_k`, and `W_v` (three learned matrices per attention head per layer). they are frozen during inference. a trillion-parameter model contains thousands of them.

for a given input `X`, the computation is:

```text
Q = X · W_q
K = X · W_k
V = X · W_v
```

inference performs these three matrix multiplications with fixed weights. `Q` contains the queries for the current input, `K` contains the keys, and `V` contains the values. when the next input arrives, the weights stay the same, but the queries, keys, and values are completely different.

## the attention formula

`Q · Kᵀ` produces an `N x N` matrix where entry `(i, j)` represents how closely token `i`'s query matches token `j`'s key. this is a similarity matrix that scores every token against every other token.

running softmax on each row converts these raw similarity scores into probabilities where each row sums to 1.

multiplying the softmax output by `V` produces the final representation. each row in the output is a weighted blend of value vectors, where the weights come from the softmax probabilities. tokens that match strongly contribute more to the output.

the terms *query*, *key*, and *value* represent specific roles: `Q` asks the question, `K` describes what each token offers, and `V` is the actual content you extract.

## the memory bottleneck

the `N x N` score matrix causes scaling problems.

in standard attention, the GPU computes `Q · Kᵀ`, writes the full result to GPU global memory (HBM), reads it back to calculate softmax, writes the softmax output back to HBM, and reads it again to multiply by `V`.

at `N = 512`, the score matrix contains 262,144 floats. this fits easily in cache.

at `N = 2048`, the matrix grows to 4,194,304 floats. it still fits, but it requires three round trips to HBM.

at `N = 100,000`, the matrix requires 10 billion floats.

the arithmetic itself is fast. the slowdown comes from memory bandwidth. attention is memory bound. the GPU spends most of its time waiting for data to travel between the slow HBM and the fast, on-chip SRAM. the actual math finishes long before the memory transfers complete.

this is the bottleneck FlashAttention resolves.

## how online softmax works

standard softmax requires the entire row to normalize. you must compute the exponential of each element, sum them, and then divide by that sum. you cannot perform the division until you have processed the last element in the row.

online softmax removes this requirement. it tracks a running maximum and a running sum as it sweeps through the row in tiles, from left to right.

when a new tile introduces a larger maximum, you apply a scaling correction:

```text
correction = exp(old_max - new_max)
```

you multiply the running sum and the accumulated output by this correction factor. this scales down the older exponentials to match the new maximum. the final result matches standard softmax exactly.

this trick allows you to run softmax tile by tile. you never need to keep the full `N x N` matrix in memory.

## tiling the loops

the algorithm tiles the inputs to fit in SRAM:

1. tile `Q` into blocks of rows (block size `B_r`)
2. tile `K` and `V` into blocks of rows (block size `B_c`)
3. for each `Q` block:
   - for each `K` block:
     - compute a small `B_r x B_c` score tile in SRAM
     - update the running max and running sum
     - scale the previous output using the correction factor
     - multiply the softmax weights by the `V` block
     - add this to the output tile
   - write the final output block to HBM once

this avoids writing the score matrix to HBM. each tile lives in SRAM while being processed, then gets overwritten. we accumulate the output in registers and write it to HBM once per `Q` block.

this matches the original math, but with a fraction of the memory traffic.

## writing the cuda kernels

i used an LLM to generate the CUDA kernels. i understood the math and the tiling strategy, but CUDA thread hierarchies and shared memory mechanics are still new to me. the code is an executable specification of the algorithm, not something i wrote from scratch.

the vanilla kernel does attention the standard way. it uses one thread per output row, stores the full `N x N` scores array in HBM, and makes three memory round trips:

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

the flash kernel loads `Q`, `K`, and `V` in SRAM-sized tiles using shared memory, computes the score tile locally, runs online softmax, accumulates the output in registers, and writes to HBM once:

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

notice that scores never leave the thread. `local_scores` lives in registers. the `V` accumulation happens in registers. the only HBM write is the final normalized output.

## verifying correctness

i ran both kernels on the same random input and compared the outputs:

```
max absolute difference: 7.000000e-07
PASS
```

a difference of `7e-07` is just floating-point rounding from changing the order of operations. mathematically they are identical.

seeing `PASS` print to the terminal was a nice win.

## performance benchmarks

i profiled the kernels on a free-tier Colab T4 GPU, using `cudaEvent` timing for kernel execution (excluding host-to-device transfers):

| N | vanilla | flash | speedup |
|---|---------|-------|---------|
| 512 | 2.20 ms | 1.33 ms | 1.65x |
| 1024 | 6.59 ms | 2.83 ms | 2.33x |
| 2048 | 21.03 ms | 7.07 ms | 2.97x |

the speedup increases with sequence length. at 512 tokens, flash is 1.65x faster. at 2048, it is nearly 3x faster.

vanilla attention scales quadratically: doubling `N` from 512 to 1024 triples the runtime, and doubling it again to 2048 triples it again. the `N²` score matrix dominates the runtime.

the flash kernel scales much better. runtime goes from 1.33 ms to 2.83 ms to 7.07 ms. the math is still `O(N²D)`, but we avoid the slow memory traffic.

## what i still need to learn

the CUDA thread model is still fuzzy. i understand warps and blocks conceptually, but i couldn't write a kernel from scratch that avoids shared memory bank conflicts or tunes occupancy. the `__syncthreads()` calls are there because i copied them, not because i derived their placement.

i also skipped the FlashAttention-2 and FlashAttention-3 papers, which rearrange the loops and optimize further. the first version was enough to get the core idea down.

watching the benchmarks run and seeing `PASS` on the correctness check was too satisfying to delay. sometimes you build the thing, verify it works, and backfill the details later. now that i know *why* it works, the *how* of GPU programming is next.

the [previous post](/blog/attention-is-all-you-need-in-raw-cpp) covered the CPU implementation. this one tackles the GPU memory bottleneck. the fix is a simple mathematical correction: `exp(m_old - m_new)`.
