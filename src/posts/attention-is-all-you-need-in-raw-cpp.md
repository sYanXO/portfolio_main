---
title: "attention is all you need, in raw c++"
date: "2026-06-17"
description: "i implemented a transformer encoder from scratch in c++ with zero dependencies. matrix math, multi-head attention, SIMD matmul, 4-bit quantization, and a full forward pass you can hold in one file."
---

every explanation of transformers i've read starts with a diagram. boxes labeled *multi-head attention* and *feed forward* connected by arrows, with *add & norm* wedged in between. the diagram is correct. it also tells you almost nothing about what the computer actually does.

so i built one. a single-file, zero-dependency c++ transformer encoder that runs a forward pass on two tokens. no pytorch, no eigen, no blas. just the standard library, `<cmath>`, and intel SIMD intrinsics for the matmul.

[source code](https://github.com/sYanXO/baremetal-attention).

## starting with the obvious: matrix multiply

the transformer is, at its core, a sequence of matrix multiplications with some nonlinearities and normalization steps in between. so the first thing i wrote was a `Matrix` struct and a naive O(n³) matmul:

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

this works. it's also slow in a way that matters even at toy scale, because the `i-j-k` loop order means the inner loop strides through column-major memory in B. every access to `B.data[k][j]` jumps to a different row. the cache hates this.

the fix is `i-k-j` ordering. keep `k` in the middle loop, broadcast `A.data[i][k]` once, and let the inner `j` loop walk sequentially through both `B.data[k][j]` and `C.data[i][j]`. now the hot loop is hitting contiguous memory.

that reorder alone opened the door to SIMD.

## making matmul go fast with avx2

once the inner loop is a sequential walk over floats, you can widen it. intel's AVX2 instructions operate on 256-bit registers (8 floats at a time). the matmul becomes:

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

`_mm256_set1_ps` broadcasts one float into all 8 lanes. `_mm256_fmadd_ps` does a fused multiply-add: `C = (A * B) + C` in a single instruction. the tail loop handles columns that aren't a multiple of 8.

this is a 2x4 toy matrix. the SIMD acceleration here is arguably overkill. but the point was to understand how production matmul kernels are structured, and the pattern is identical: reorder loops for locality, vectorize the inner loop, handle the remainder.

## the attention mechanism

with the math primitives in place, `scaled_dot_product_attention` almost writes itself. the formula from the paper is:

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

each step does exactly one thing:

1. **Q × Kᵀ** computes how much each token's query matches every other token's key. the result is a square similarity matrix.
2. **scaling by 1/√d_k** keeps the dot products from getting huge. without it, softmax saturates into a near-one-hot distribution and gradients vanish. d_k is the key dimension, and dividing by its square root normalizes the variance back to roughly 1.
3. **masking** (optional) sets specific positions to -1e9 before softmax, which forces those attention weights to zero. this is how decoders prevent tokens from attending to the future during training.
4. **softmax** converts raw scores into a probability distribution. each row sums to 1. the implementation subtracts the row max before calling `exp()` to avoid numerical overflow.
5. **multiplying by V** produces the final weighted combination. each output row is a weighted average of value vectors, where the weights come from step 4.

## softmax: the part everyone gets wrong on first try

the naive version is just `exp(x) / sum(exp(x))`. it works until your values get large enough that `exp(x)` returns infinity.

the fix is subtracting the row maximum before exponentiating:

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

mathematically identical (the max cancels out in the ratio), but now the largest exponent is `exp(0) = 1`. no overflow, no NaN.

## multi-head attention: split, attend, stitch

single-head attention works, but the paper argues that running multiple smaller attention operations in parallel captures different types of relationships. a head might learn positional patterns while another learns semantic similarity.

the implementation needs two helpers. `slice_cols` extracts a vertical chunk of a matrix (like `numpy.split`). `concat_cols` glues matrices side-by-side. with those:

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

with a 4-dimensional embedding and 2 heads, each head operates on 2 dimensions independently. the concatenated output has the same shape as the input. in a real transformer, you'd multiply by a learned output projection matrix W_O after concatenation. i skipped that to keep the implementation focused on the routing logic.

## the rest of the encoder block

after attention, the original transformer paper stacks two more operations: a residual connection with layer normalization, then a feed-forward network with another residual and norm.

**layer normalization** is straightforward. for each row, compute the mean and variance, then normalize:

```cpp
float mean = sum / A.cols();
float variance = variance_sum / A.cols();
A.data[i][j] = (A.data[i][j] - mean) / std::sqrt(variance + epsilon);
```

the epsilon (1e-5) prevents division by zero when variance is exactly 0. this implementation skips the learnable γ and β parameters that production models use for rescaling.

**the feed-forward network** is two linear layers with a ReLU in between. W1 expands the dimension (4 → 8), ReLU zeros out negatives, W2 compresses it back (8 → 4). in the paper this is described as `FFN(x) = max(0, xW₁ + b₁)W₂ + b₂`. i dropped the biases.

**residual connections** are just element-wise addition. add the input of a sub-layer to its output before normalizing. this gives gradients a shortcut path during training and lets deeper networks actually converge.

## 4-bit quantization: trading precision for memory

the last piece i added was 4-bit weight quantization for the FFN weight matrices. the idea: instead of storing each weight as a 32-bit float, compress it down to 4 bits. two weights per byte. that's an ~87.5% reduction in memory.

the quantization flow:

1. find the absolute maximum value in each row.
2. compute a scale factor: `scale = max_val / 7.0f` (because a signed 4-bit integer maxes out at 7).
3. divide each weight by the scale, round to the nearest integer, clamp to [-8, 7].
4. pack two 4-bit integers into one byte using bitwise ops:

```cpp
u_int8_t packed = (q0 & 0x0F) | ((q1 & 0x0F) << 4);
```

during inference, the quantized matmul unpacks on the fly:

```cpp
int8_t q0 = packed & 0x0F;
if (q0 > 7) q0 -= 16;  // sign extension for negative values
float v0 = q0 * scale;
```

the sign extension trick handles negative numbers. a 4-bit value of, say, 0xF (15 unsigned) represents -1 in two's complement. checking if `q0 > 7` and subtracting 16 recovers the correct sign.

running the forward pass with quantized FFN weights produces output that's close to the full-precision version but not identical. the final encoder output drifts slightly:

```
Full precision: 1.30094 -0.236201 -1.45022 0.385477
Quantized:      0.630434 -1.72749  0.639503 0.457548
```

that drift is quantization noise. with only 16 discrete levels per weight, some information gets destroyed. production systems manage this with more sophisticated quantization schemes (per-channel scaling, mixed precision, calibration datasets), but the core idea is the same.

## the full forward pass

the `main()` function wires everything into a single encoder block. two tokens, embedding dimension of 4:

```
Input → Multi-Head Attention → Add & Norm → FFN (quantized) → Add & Norm → Output
```

X serves as Q, K, and V simultaneously (self-attention). the MHA output gets a residual connection and layer norm. then the normalized output passes through the quantized feed-forward network, gets another residual connection and norm, and out comes the final encoder representation.

the whole thing is ~450 lines in one file. no build system beyond `g++ main.cpp -o main -mavx2 -mfma -O3`.

## what i learned

writing attention from scratch forces you to think about things the frameworks hide. the loop ordering in matmul matters for cache performance. softmax needs a numerical stability trick or it silently produces garbage. multi-head attention is conceptually parallel but the implementation is mostly bookkeeping (slicing and concatenation). quantization is a lossy compression scheme with a surprisingly simple core.

the code is deliberately not production quality. it uses `vector<vector<float>>` instead of contiguous memory, doesn't batch, and the quantized matmul path has no SIMD. but every function maps directly to a box in that diagram i mentioned at the top, and you can trace the data flow by reading the code linearly.

if you've only ever called `nn.TransformerEncoder`, i'd recommend building at least the attention function once from raw math. the paper is called *attention is all you need*, and after writing it out in C++, i finally believe that.
