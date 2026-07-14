import useDocumentTitle from '../hooks/useDocumentTitle';

const projects = [
  {
    name: 'MoodFlix',
    desc: 'AI-powered movie recommendation engine. Generates dynamic context-aware mood quizzes via Gemini, performs hybrid semantic vector search with pgvector (768-dim embeddings), and resolves collaborative recommendations in "Friend Mode" sessions. Next.js, Go (Gin), PostgreSQL, and pgvector.',
    github: 'https://github.com/sYanXO/movieflix',
    live: 'https://movieflix-ten-phi.vercel.app/',
    status: null,
  },
  {
    name: 'Terminal Coding Agent',
    desc: 'local autonomous coding agent built in Go from scratch. supports Gemini 2.5 Flash and offline Ollama models, executes batched tool-call plans sequentially, and features surgical search-and-replace patching with colored git-diff terminal output and Docker command sandboxing.',
    github: 'https://github.com/sYanXO/tui-coding-agent',
    live: null,
    status: null,
  },
  {
    name: 'CaskDB',
    desc: 'A persistent Key-Value store written in Go using an LSM-Tree architecture. Currently implementing the Write-Ahead Log (WAL) for crash recovery and an in-memory SkipList memtable before moving on to SSTable compaction.',
    github: null,
    live: null,
    status: 'wip',
  },
  {
    name: 'URL Shortener',
    desc: 'fastapi url shortener with sqlite persistence, redis redirect caching, process-local bloom filter negative lookups, and async click logging through celery. benchmarked with k6 at ~198 requests per second. (note: hosted on render free tier, expect a cold start delay on first load)',
    github: 'https://github.com/sYanXO/url-shortener',
    live: 'https://url-shortener-i5wt.onrender.com/',
    status: null,
  },
  {
    name: 'Attention Is All You Need, in Raw C++',
    desc: 'single-file, zero-dependency transformer encoder in C++. matrix math, multi-head attention, SIMD matmul, 4-bit quantization, and a full forward pass you can hold in one file.',
    github: 'https://github.com/sYanXO/baremetal-attention',
    live: null,
    status: null,
  },
  {
    name: 'Tokenizer Cache',
    desc: 'thread-safe LRU caching layer for tokenizer functions. wraps tiktoken, huggingface, or any str→int callable with sub-microsecond cache hits and ~10x speedup on repeated inputs.',
    github: 'https://github.com/sYanXO/tokenizer-cache',
    live: null,
    status: null,
  },
  {
    name: 'Distributed Rate-Limited HTTP Server',
    desc: 'production-grade Go API server with a Redis-backed token bucket rate limiter (atomic via Lua), Prometheus metrics, context timeouts, graceful shutdown, and k6 load testing at ~7,600 RPS.',
    github: 'https://github.com/sYanXO/http-server-scratch',
    live: null,
    status: null,
  },
  {
    name: 'DB Uploader',
    desc: 'a Go ingestion pipeline that throws massive JSON datasets into PostgreSQL using concurrent workers. basically stress-tested it until it stopped complaining.',
    github: 'https://github.com/sYanXO/db-uploader',
    live: null,
    status: null,
  },
  {
    name: 'Vercel Clone',
    desc: 'tried to build my own vercel. queued builds, object storage, the whole deployment pipeline. learned a lot, shipped nothing. classic.',
    github: null,
    live: null,
    status: 'archived',
  },
];

const Projects = () => {
  useDocumentTitle('Projects | Sreayan De');

  return (
    <div className="page">
      <h1>Projects</h1>

      <ul className="project-list">
        {projects.map((project) => (
          <li key={project.name} className="project-item">
            <div>
              <span className="project-name">{project.name}</span>
              {project.status && (
                <span className="project-status">({project.status})</span>
              )}
            </div>
            <div className="project-desc">{project.desc}</div>
            <div className="project-links">
              {project.github && (
                <a href={project.github} target="_blank" rel="noopener noreferrer">
                  Source
                </a>
              )}
              {project.live && (
                <a href={project.live} target="_blank" rel="noopener noreferrer">
                  Live demo
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Projects;
