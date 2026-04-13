---
title: "building mini-git"
date: "2026-04-13"
description: "i'm building git from scratch in C++."
---

i'm building a minimal git clone from scratch in C++ because git's internals are genuinely beautiful once you see past the cursed CLI. i'm calling it mini-git, and i'm documenting the whole thing as i go.

this is session 1. we start where git starts: **SHA-1 hashing**.

## why SHA-1 is the whole foundation

here's the thing that surprised me most when i first dug into git's internals: objects in git don't have names. no filenames, no IDs, no sequential numbering. every object (every blob, tree, commit) is identified solely by the SHA-1 hash of its contents.

the hash is both the **address** (where to find it) and the **integrity check** (proof it hasn't been tampered with). same content always produces the same hash. different content produces a different hash. that's the entire contract.

that's why people call git a *content-addressable* filesystem. there's no file #47, there's just the thing that hashes to `2aae6c35c94fcfb415dbe95f408b9ce91ee846ed`. flip a single bit anywhere and the hash is completely different. you'll notice.

## the implementation

we're using OpenSSL's SHA-1. no point rolling our own crypto. the function takes raw bytes in, spits out a 40-character hex string. that's it.

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

a couple things worth noting:

- `SHA_DIGEST_LENGTH` is 20. SHA-1 produces 160 bits, which is 20 bytes. we convert each byte to 2 hex characters, giving us the 40-character string you're used to seeing in git.
- `reinterpret_cast` is needed because SHA-1 operates on raw `unsigned char` bytes. it knows nothing about text or meaning, it's just crunching bytes.
- we're starting with a simplified format (plain text objects). real git prepends a header and uses binary format.

if you're curious what the real thing looks like, [git's openssl.h](https://github.com/git/git/blob/master/sha1/openssl.h) does basically the same thing, but uses OpenSSL's EVP streaming API (`EVP_MD_CTX`) instead of calling `SHA1()` in one shot. the difference is that EVP lets you feed data in chunks (Init, Update, Final) so git can hash huge files without loading everything into memory first. our version dumps it all into a `std::string` and hashes in one go, which is totally fine for learning but not how you'd do it in production.

## testing it

quick sanity check:

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

then verify against the system's `sha1sum` to make sure we're not lying to ourselves:

```bash
echo -n "hello world" | sha1sum
```

both should print `2aae6c35c94fcfb415dbe95f408b9ce91ee846ed`. if they don't, something is very wrong.

## the `-n` flag gotcha

this tripped me up for longer than i'd like to admit:

```bash
echo "hello world" | sha1sum    # WRONG, includes a trailing newline
echo -n "hello world" | sha1sum # correct, no newline
```

without `-n`, `echo` appends `\n` to the output. that's one extra byte. and a single extra byte produces a **completely different hash**. this isn't a bug, this is the feature. SHA-1 treats input as raw bytes, and `"hello world"` and `"hello world\n"` are different byte sequences.

this is exactly what makes git tamper-proof. you can't change a single byte anywhere in the history without every hash downstream changing.

## what's next

session 2: **the object store**. writing and reading objects to `.mgit/objects/` on disk. we'll take this SHA-1 function and actually use it to build content-addressable storage.
