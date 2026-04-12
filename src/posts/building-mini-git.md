---
title: "building mini-git"
date: "2026-04-10"
description: "i'm building git from scratch in Go. here's what i've learned about the object model, hashing, and why plumbing commands are lowkey the whole thing."
---

i've been building a minimal git implementation in Go. not because anyone asked, and definitely not because the world needs another version control system — but because git's internals are genuinely beautiful once you see past the cursed CLI.

turns out it's basically a content-addressable filesystem with a DAG on top. once that clicks, everything else makes sense.

## the object model

git has four object types: blobs, trees, commits, and tags. everything gets zlib-compressed and named by its SHA-1 hash. once you understand this, git stops being magic and starts being "oh, that's actually really obvious."

a **blob** is just raw file contents. no filename, no permissions — literally just bytes. a **tree** maps names and permissions to blobs (or other trees). a **commit** points to a tree and to zero or more parent commits.

that's it. that's the whole data model. no really, that's it. i was also surprised.

## plumbing vs porcelain

git commands split into two vibes:

- **porcelain** — `git add`, `git commit`, `git log` — the stuff you actually type. the friendly surface.
- **plumbing** — `git hash-object`, `git cat-file`, `git update-index` — the raw primitives underneath.

building mini-git means implementing the plumbing first. the porcelain is honestly just convenience wrappers on top. the real git lives in the plumbing.

## what i've learned so far

1. **content-addressable storage is lowkey genius.** deduplication comes for free. two files with identical contents? same blob. done. no extra work.
2. **the index is the cursed part.** the staging area (`.git/index`) is a binary format that's somehow more complex than the entire object store. why is it like this.
3. **merkle trees are literally everywhere.** once you see them in git, you start noticing them in blockchains, certificate transparency, IPFS... it's like learning a new word and then hearing it five times a day.

more notes coming as i get into branching and merging. that's where things get spicy.
