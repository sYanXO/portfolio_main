---
title: "building mini-git"
date: "2026-04-13"
description: "i'm building git from scratch in c++."
---

git's internals are simple, but the CLI makes them look complicated. to understand how it actually works, i'm building a minimal clone called `mini-git` in c++.

first, we need a way to hash content.

## why sha-1 is the foundation

git objects don't have filenames or sequential ids. every blob, tree, and commit is identified solely by the sha-1 hash of its contents.

the hash is the address of the object and its integrity check. same input, same hash. if you change a single byte, the hash changes completely. this is why git is a content-addressable filesystem. instead of looking up a file by path, git looks up the data that hashes to `2aae6c35c94fcfb415dbe95f408b9ce91ee846ed`.

## hashing data in c++

i'm using openssl's sha-1 implementation. the wrapper function takes a string of raw bytes and returns a 40-character hex string.

```cpp
// src/sha1.h
#pragma once
#include <string>
#include <sstream>
#include <iomanip>
#include <openssl/sha.h>

inline std::string sha1(const std::string& data) {
    unsigned char hash[SHA_DIGEST_LENGTH]; // 20 bytes

    SHA1(
        reinterpret_cast<const unsigned char*>(data.c_str()),
        data.size(),
        hash
    );

    std::ostringstream oss;
    for (int i = 0; i < SHA_DIGEST_LENGTH; i++) {
        oss << std::hex << std::setw(2) << std::setfill('0') << (int)hash[i];
    }
    return oss.str();
}
```

- `SHA_DIGEST_LENGTH` is 20 bytes. we convert each byte to two hex characters to get the standard 40-character hash.
- the `reinterpret_cast` is necessary because openssl's `SHA1` function expects `unsigned char` bytes.
- this function hashes raw strings. git actually prepends a header with the type and size before hashing, which we will add later.

git itself uses openssl's evp streaming api instead of the single-shot `SHA1` function. streaming lets git hash large files in chunks without loading them entirely into memory. our wrapper hashes everything at once, which works fine for a minimal implementation.

## verifying the output

we can compile a test program and compare the output to the system `sha1sum` tool.

```cpp
#include <iostream>
#include "sha1.h"

int main() {
    std::cout << sha1("hello world") << std::endl;
    return 0;
}
```

compile and run:

```bash
g++ main.cpp -o test_sha1 -lssl -lcrypto
./test_sha1
```

verify against the system:

```bash
echo -n "hello world" | sha1sum
```

both should print `2aae6c35c94fcfb415dbe95f408b9ce91ee846ed`.

## handling newlines

by default, `echo` adds a trailing newline to the string. that extra byte changes the hash completely.

```bash
echo "hello world" | sha1sum    # includes a trailing newline
echo -n "hello world" | sha1sum # no newline
```

because sha-1 operates on raw bytes, `hello world` and `hello world\n` produce different hashes. this is why git is tamper proof. you cannot change a single byte in the history without changing every downstream hash.

## what's next

next, we need to write these hashed objects to disk under `.mgit/objects/`. we'll use this hash function to build the content-addressable store.
