import useDocumentTitle from '../hooks/useDocumentTitle';
import GithubHeatmap from '../components/GithubHeatmap';

const About = () => {
  useDocumentTitle('Sreayan De');

  return (
    <div className="page">
      <h1>About</h1>

      <p className="home-bio">
        hey, i'm sreayan. i'm an ECE grad from Kolkata specializing in systems engineering for AI. 
        i spend my time building autonomous agent architectures, writing low-level ML kernels from first principles, 
        and optimizing LLM inference pipelines. i like pulling apart the abstractions of systems that are 
        usually treated as black boxes.
      </p>
      <p className="home-bio">
        on my blog, i do deep dives into the systems-side mechanics of scale AI. this includes detailing how 
        large language models actually execute at scale (tensor/pipeline parallelism, continuous batching), analyzing 
        CPU/GPU memory bandwidth bottlenecks, implementing custom tokenization caching layers, and implementing 
        FlashAttention CUDA tiling kernels to avoid high-bandwidth memory roundtrips.
      </p>
      <p className="home-bio">
        my projects are reflections of this. i built a terminal-based autonomous coding agent (TUI Agent) 
        from scratch in Go—bypassing heavy frameworks to understand tool-use loops, fallback parsing for 
        local models, and race-condition mitigations. i also designed MoodFlix, a movie recommender using 
        Next.js, Go, and PostgreSQL/pgvector to run hybrid semantic similarity searches combined with LLM reranking 
        and parallel collaborative sessions.
      </p>

      <ul className="home-links">
        <li><a href="https://github.com/sYanXO" target="_blank" rel="noopener noreferrer">GitHub</a></li>
        <li><a href="https://leetcode.com/u/Sreayan/" target="_blank" rel="noopener noreferrer">LeetCode</a></li>
        <li><a href="https://drive.google.com/file/d/1coskp0zWEFYQeu-GIPXAPAMnk19EZlRl/view" target="_blank" rel="noopener noreferrer">Resume</a></li>
        <li><a href="mailto:desreayan@gmail.com">Email</a></li>
      </ul>

      <hr />

      <h2>experience</h2>

      <p>
        i've contributed to a few open source projects, mostly fixing things that were breaking
        in production in ways nobody had caught yet.
      </p>

      <ul>
        <li>
          <strong>DSPy</strong> — diagnosed and fixed an infinite straggler retry loop and a
          shutdown race condition in <code>ParallelExecutor</code> that was causing thread-pool
          saturation and crashes on evaluator shutdown. added a configurable timeout and capped retries.
        </li>
        <li>
          <strong>cal.com</strong> — traced a timezone bug in the call booking feature to a dayjs
          locale misconfiguration causing incorrect IST offset resolution. also patched database schema
          inconsistencies affecting booking record integrity. merged into production.
        </li>
        <li>
          <strong>EloInsight</strong> — hardened admin API security via token-based auth and route-level
          access control. migrated auth from legacy email/password to OAuth-only, removed sensitive fields
          from responses, and deprecated stale endpoints.
        </li>
      </ul>

      <hr />

      <h2>what i can actually do</h2>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
        (the stuff i'd put on a whiteboard and not panic about)
      </p>

      <ul>
        <li>
          <strong>languages</strong> — Python, Go, C++, TypeScript, SQL. Go is my daily driver;
          C++ is for when i need to know what's actually happening at the hardware level.
        </li>
        <li>
          <strong>backend & systems</strong> — REST APIs, gRPC, concurrency patterns, connection pooling,
          rate limiting, storage engines, ACID transactions, caching strategies, ETL pipelines.
          i've benchmarked things with k6, profiled goroutine leaks, and debugged race conditions
          under load.
        </li>
        <li>
          <strong>AI & ML engineering</strong> — LLM application development, agent orchestration, custom tool-use
          loops, pgvector semantic search, RAG-style retrieval, prompt optimization. i've written a transformer 
          forward pass in raw C++ with AVX2 SIMD intrinsics, written CUDA kernels for online softmax / tiled attention, 
          and designed tokenization caching systems.
        </li>
        <li>
          <strong>databases</strong> — PostgreSQL (including pgvector), Redis, SQLite, SQLAlchemy, Prisma.
          also building my own LSM-tree KV store from scratch, so i know what's happening
          underneath the abstractions.
        </li>
        <li>
          <strong>infra & tooling</strong> — Docker, AWS, Cloudflare, Vercel. Git, unit/integration testing,
          observability, API design.
        </li>
        <li>
          <strong>competitive programming</strong> — LeetCode 1840 rating (though i've been out of touch for a while).
        </li>
      </ul>

      <hr />

      <h2>what i'm actually obsessed with</h2>

      <p className="obsessed-disclaimer" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', marginBottom: '1rem' }}>
        (this list rotates. if you're reading this a month from now, assume half of it changed.)
      </p>

      <ul>
        <li>
          <strong>LLM inference engineering</strong> — how you actually serve a 405B model. tensor
          parallelism, pipeline parallelism, KV cache eviction, continuous batching, speculative decoding.
          the gap between "the model runs" and "the model runs efficiently at scale" is enormous and almost
          nobody talks about the latter honestly.
        </li>
        <li>
          <strong>storage engine internals</strong> — building CaskDB, an LSM-Tree KV store in Go from scratch.
          currently on Write-Ahead Logs and SkipList memtables, headed toward SSTable compaction.
          i want to understand every byte that hits disk.
        </li>
        <li>
          <strong>distributed systems failure modes</strong> — specifically metastable failures. the kind where
          your cache goes cold at 3am, your database gets hit with a thundering herd, and the system can't
          recover itself even after traffic drops. standard load tests don't catch these.
        </li>
        <li>
          <strong>GPU memory hierarchies</strong> — why FlashAttention is fast (tiling to avoid HBM reads),
          what SRAM vs HBM means for kernel design, and how SIMD intrinsics on CPU translate to the same
          idea at a smaller scale.
        </li>
        <li>
          <strong>lock-free data structures</strong> — writing thread-safe things in Go and C++ without just
          slapping a mutex on everything and hoping for the best.
        </li>
        <li>
          <strong>agentic systems</strong> — not the high-level framework kind. the "what actually happens
          when a model calls a tool, gets a result, and decides what to do next" kind. i built one from
          scratch, which means i know exactly where local models hallucinate tool results before the tool
          runs.
        </li>
      </ul>

      <hr />

      <h2>books that rewired how i think</h2>

      <ul className="book-list">
        <li>
          <span className="book-title">Designing Data-Intensive Applications</span> by Martin Kleppmann
          <span className="book-rec">★ goated</span>
          <br /><span className="book-note">the one that made storage, replication, and distributed transactions
          feel like a coherent design space instead of a pile of scary words. if you read one tech book, make it this one.</span>
        </li>
        <li>
          <span className="book-title">Database Internals</span> by Alex Petrov
          <span className="book-rec">★ goated</span>
          <br /><span className="book-note">goes deep on B-Trees, LSM-Trees, Raft, and exactly how databases don't
          corrupt your data. essential if you want to build storage engines rather than just use them.</span>
        </li>
        <li>
          <span className="book-title">A Philosophy of Software Design</span> by John Ousterhout
          <br /><span className="book-note">the "deep modules" concept changed how i design APIs and think about
          complexity. a lot of the architecture decisions in MoodFlix came from this book.</span>
        </li>
        <li>
          <span className="book-title">The Pragmatic Programmer</span> by Andrew Hunt &amp; David Thomas
          <br /><span className="book-note">sounds like common sense until you realize you've been doing everything wrong.
          humbling in a good way.</span>
        </li>
        <li>
          <span className="book-title">Thinking, Fast and Slow</span> by Daniel Kahneman
          <span className="book-rec">★ goated</span>
          <br /><span className="book-note">half my "rational decisions" were just vibes. reading this at least
          makes me aware of when that's happening.</span>
        </li>
      </ul>

      <hr />

      <GithubHeatmap />

      <hr />
    </div>
  );
};

export default About;
