---
title: "Building mini-git"
date: "2026-04-10"
description: "Notes on implementing Git from scratch — the object model, hashing, and why plumbing commands matter."
---

I've been building a minimal Git implementation in Go. Not because the world needs another version control system, but because Git's internals are a masterclass in content-addressable storage and directed acyclic graphs.

## The object model

Git has four object types: blobs, trees, commits, and tags. Everything is stored as a zlib-compressed file named by its SHA-1 hash. Once you understand this, most of Git's behavior stops being magical and starts being obvious.

A **blob** is just file contents. No filename, no permissions — just bytes. A **tree** maps names and permissions to blobs (or other trees). A **commit** points to a tree and to zero or more parent commits.

That's it. That's the whole data model.

## Plumbing vs porcelain

Git's commands split into two categories:

- **Porcelain**: `git add`, `git commit`, `git log` — the user-facing commands.
- **Plumbing**: `git hash-object`, `git cat-file`, `git update-index` — the low-level primitives.

Building mini-git means implementing the plumbing first. The porcelain is just convenience wrappers.

## What I've learned so far

1. **Content-addressable storage is elegant.** Deduplication comes for free. Two files with identical contents are the same blob, period.
2. **The index is the tricky part.** The staging area (`.git/index`) is a binary format that's more complex than the object store itself.
3. **Merkle trees are everywhere.** Once you see them in Git, you start noticing them in blockchains, certificate transparency, and IPFS.

More notes to come as I implement branching and merging.
