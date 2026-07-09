---
title: "attention is all you need, in raw c++"
date: "2026-06-17"
description: "i implemented a transformer encoder from scratch in c++ with zero dependencies. matrix math, multi-head attention, SIMD matmul, 4-bit quantization, and a full forward pass you can hold in one file."
---

every explanation of transformers i've read starts with a diagram. boxes labeled *multi-head attention* and *feed forward* connected by arrows, with *add & norm* wedged in between. the diagram is correct, but it tells you almost nothing about what the computer actually does.

so i built one. a single-file, zero-dependency c++ transformer encoder that runs a forward pass on two tokens. no pytorch, eigen, or blas. just the standard library, `<cmath>`, and intel SIMD intrinsics for the matmul.

[source code](https://github.com/sYanXO/baremetal-attention).

## starting with the obvious: matrix multiply

transformers are mostly matrix multiplications with a few normalization and activation functions in between. i started with a simple `Matrix` struct and a naive O(n³) loop:

```cpp
struct Matrix {
    std::vector<std::vector<float>> data;
    Matrix(int r, int c) : data(r, std::vector<float>(c, 0.0f)) {}
    int rows() const { return data.size(); }
    int cols() const { return data.empty() ? 0 : data[0].size(); }
};
```

```cpp
for(int i=0;i<A.rows();++i){
    for(int j=0;j<B.cols();++j){
        for(int k=0;k<A.cols();++k){
            C.data[i][j] += A.data[i][k] * B.data[k][j];
        }
    }
}
```

this works, but it is slow even for a toy model. the `i-j-k` loop order makes the inner loop stride through column-major memory in B. every access to `B.data[k][j]` jumps to a different row, which kills cache performance.

reordering the loops to `i-k-j` fixes this. we keep `k` in the middle, broadcast `A.data[i][k]` once, and let the inner `j` loop walk sequentially through both `B.data[k][j]` and `C.data[i][j]`. now the loop hits contiguous memory.

that reordering makes it easy to vectorize the loop.

## making matmul go fast with avx2

when the inner loop walks sequentially over floats, we can vectorize it. intel's AVX2 instructions let us process 8 floats at a time:

```cpp
float a_val = A.data[i][k];
__m256 a_vec = _mm256_set1_ps(a_val);

int j = 0;
for (; j <= B.cols() - 8; j += 8) {
    __m256 b_vec = _mm256_loadu_ps(&B.data[k][j]);
    __m256 c_vec = _mm256_loadu_ps(&C.data[i][j]);
    c_vec = _mm256_fmadd_ps(a_vec, b_vec, c_vec);
    _mm256_storeu_ps(&C.data[i][j], c_vec);
}

// tail loop for remaining columns
for (; j < B.cols(); ++j) {
    C.data[i][j] += a_val * B.data[k][j];
}
```

`_mm256_set1_ps` broadcasts one float to all 8 lanes of a register. `_mm256_fmadd_ps` runs a fused multiply-add (`C = A * B + C`) in a single instruction, and a tail loop handles any leftover columns.

this is overkill for a 2x4 toy matrix. the point was just to see how production kernels are structured. the pattern is identical: reorder loops for cache locality, vectorize, and clean up the remainder in a tail loop.

## the attention mechanism

with those primitives, `scaled_dot_product_attention` is straightforward. the paper's formula is:

**Attention(Q, K, V) = softmax((Q × Kᵀ) / √d_k) × V**

in code:

```cpp
Matrix K_T = transpose(K);
Matrix scores = matmul(Q, K_T);

float d_k = static_cast<float>(K.cols());
scores = scale(scores, 1.0f / std::sqrt(d_k));

if (!mask.data.empty()) {
    scores = apply_mask(scores, mask);
}

Matrix weights = softmax(scores);
return matmul(weights, V);
```

how this works under the hood:

- **q × kᵀ** calculates how much each query matches every key, producing a similarity matrix.
- **scaling by 1/√d_k** stops the dot products from growing too large. without this, softmax values saturate and gradients vanish. dividing by the square root of the key dimension normalizes the variance.
- **masking** sets future token scores to a very low number (`-1e9`) before softmax, forcing the attention weights to zero so tokens cannot look ahead.
- **softmax** converts raw scores into a probability distribution where each row sums to 1. we subtract the maximum value in the row before exponentiating to prevent numerical overflow.
- **multiplying by v** averages the value vectors using the softmax weights.

## softmax: the part everyone gets wrong on first try

the naive implementation is `exp(x) / sum(exp(x))`. this works until the inputs are large enough to make `exp(x)` overflow to infinity.

subtracting the maximum value of the row before exponentiating fixes it:

```cpp
float max_val = A.data[i][0];
for (int j = 1; j < A.cols(); ++j) {
    if (A.data[i][j] > max_val) max_val = A.data[i][j];
}

for (int j = 0; j < A.cols(); ++j) {
    A.data[i][j] = std::exp(A.data[i][j] - max_val);
    sum_exp += A.data[i][j];
}
```

this is mathematically identical because the shift cancels out in the division. the largest exponent becomes `exp(0) = 1`, which prevents overflow and `NaN` errors.

## multi-head attention: split, attend, stitch

single-head attention works, but splitting the embedding into multiple heads lets the model track different relationships. one head might track position, while another tracks meaning.

i wrote two helper functions: `slice_cols` to split the matrices, and `concat_cols` to glue them back together:

```cpp
int head_dim = Q.cols() / num_heads;

for (int h = 0; h < num_heads; ++h) {
    Matrix Q_head = slice_cols(Q, h * head_dim, (h+1) * head_dim);
    Matrix K_head = slice_cols(K, h * head_dim, (h+1) * head_dim);
    Matrix V_head = slice_cols(V, h * head_dim, (h+1) * head_dim);

    Matrix head_result = scaled_dot_product_attention(Q_head, K_head, V_head);

    final_output = (h == 0) ? head_result : concat_cols(final_output, head_result);
}
```

with a 4-dimensional embedding and 2 heads, each head processes 2 dimensions. the concatenated output matches the input shape. in a production transformer, you would multiply this by a learned output projection matrix `W_O` after concatenating. i left that out to keep the routing logic clean.

## the rest of the encoder block

after attention, the block needs a residual connection, layer normalization, and a feed-forward network.

layer normalization calculates the mean and variance for each row, then normalizes the values:

```cpp
float mean = sum / A.cols();
float variance = variance_sum / A.cols();
A.data[i][j] = (A.data[i][j] - mean) / std::sqrt(variance + epsilon);
```

a small `epsilon` (1e-5) prevents division by zero. i skipped the learnable scale and shift parameters (`gamma` and `beta`) to keep the code simple.

the feed-forward network uses two linear projections with a relu activation. the first layer expands the dimension from 4 to 8, the activation crops negatives, and the second layer projects it back to 4. i dropped the biases.

residual connections add the input of a layer directly to its output. this helps during training by giving gradients a direct path to flow backward.

## 4-bit quantization

i also added 4-bit weight quantization for the feed-forward network. instead of storing weights as 32-bit floats, we pack two 4-bit weights into a single byte, saving about 87.5% of the memory.

to quantize the weights, we find the absolute maximum value in each row, calculate a scale factor (`scale = max_val / 7.0f`), and divide each weight by that scale. we then round the values, clamp them to `[-8, 7]`, and pack two of them into a single byte:

```cpp
u_int8_t packed = (q0 & 0x0F) | ((q1 & 0x0F) << 4);
```

when running a forward pass, we unpack these weights on the fly:

```cpp
int8_t q0 = packed & 0x0F;
if (q0 > 7) q0 -= 16;  // sign extension for negative values
float v0 = q0 * scale;
```

we need to handle negative numbers during unpacking. since a 4-bit value of `0xf` represents `-1` in two's complement, checking if the value is greater than 7 and subtracting 16 recovers the correct sign.

quantized weights produce slightly different outputs than the full-precision version:

```
Full precision: 1.30094 -0.236201 -1.45022 0.385477
Quantized:      0.630434 -1.72749  0.639503 0.457548
```

this difference is quantization noise. compressing weights to 16 discrete values destroys some information. production setups use more complex schemes like per-channel scaling or calibration datasets, but the mechanics are the same.

## the full forward pass

the final `main` function wires these parts into one encoder block processing two tokens with an embedding size of four:

```
input -> multi-head attention -> add & norm -> ffn (quantized) -> add & norm -> output
```

the input matrix serves as the query, key, and value vectors for self-attention. the attention output gets a residual addition and a layer normalization. we pass that result through the quantized feed-forward network, add the residual, run one last normalization, and get the final output.

the entire implementation fits in 450 lines of c++. you can compile it with:

```bash
g++ main.cpp -o main -mavx2 -mfma -O3
```

## what i learned

writing this from scratch forces you to deal with the details frameworks hide. you see why loop order matters for the cache, how softmax silently fails without max subtraction, and how multi-head attention is mostly just slicing and gluing matrices together.

the code is not for production. it uses nested vectors instead of flat memory, does not support batching, and the quantized path is not vectorized. but every function maps to a box in the original architecture diagram, and you can trace the data flow from top to bottom.

if you have only ever used high-level layers, it is worth building attention from raw math at least once. the paper's title says attention is all you need, and writing it out in c++ makes that feel true.
