import useDocumentTitle from '../hooks/useDocumentTitle';

const projects = [
  {
    name: 'CaskDB',
    desc: 'A persistent Key-Value store written in Go using an LSM-Tree architecture. Currently implementing the Write-Ahead Log (WAL) for crash recovery and an in-memory SkipList memtable before moving on to SSTable compaction.',
    github: null,
    live: null,
    status: 'wip',
  },
  {
    name: 'URL Shortener',
    desc: 'fastapi url shortener with sqlite persistence, redis redirect caching, process-local bloom filter negative lookups, and async click logging through celery. benchmarked with k6 at ~198 requests per second.',
    github: 'https://github.com/sYanXO/url-shortener',
    live: null,
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
