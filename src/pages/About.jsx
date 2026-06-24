import useDocumentTitle from '../hooks/useDocumentTitle';

const About = () => {
  useDocumentTitle('Sreayan De');

  return (
    <div className="page">
      <h1>About</h1>

      <p className="home-bio">
        hey, i'm sreayan. i write code that doesn't fall apart when things get weird.
        mostly Go, C++ and Python, mostly backend stuff, mostly at 2am. when i'm not debugging
        race conditions, i'm probably deep in some rabbit hole about how LLM inference
        actually works or why distributed systems lie to you.
      </p>

      <h2>find me</h2>
      <ul className="home-links">
        <li><a href="https://github.com/sYanXO" target="_blank" rel="noopener noreferrer">GitHub</a></li>
        <li><a href="https://leetcode.com/u/Sreayan/" target="_blank" rel="noopener noreferrer">LeetCode</a></li>
        <li><a href="https://drive.google.com/file/d/1coskp0zWEFYQeu-GIPXAPAMnk19EZlRl/view" target="_blank" rel="noopener noreferrer">Resume</a></li>
      </ul>

      <hr />

      <h2>what i'm into</h2>
      <p>
        i come from backend and systems work. Go, C++, the kind of code where if your concurrency model is wrong,
        you lose data. that's still the foundation, but lately i've been pulling the thread on what happens
        inside GPUs during ML inference.
      </p>
      <p>
        right now that means writing CUDA kernels, understanding memory hierarchies (HBM vs SRAM, why it matters
        more than arithmetic), and reading papers like FlashAttention from the perspective of someone who cares
        about data movement, not gradients.
      </p>

      <hr />

      <h2>currently obsessed with</h2>
      <p className="obsessed-disclaimer">
        (this list rotates fast. maybe it's an attention issue, maybe it's too many interesting problems. either way, if you're reading this a month from now, assume half of it has changed.)
      </p>
      <ul>
        <li>CUDA kernels and GPU memory hierarchies — writing FlashAttention from scratch to understand why attention is memory-bound, not compute-bound</li>
        <li>ML internals from the systems side — not training models, but understanding what the hardware actually does during inference. online softmax, tiling, HBM vs SRAM tradeoffs</li>
        <li>transformer internals at the metal level — built one in raw C++ with AVX2, now moving to GPU kernels</li>
        <li>LLM inference optimization — KV caches, speculative decoding, continuous batching, and why latency is everything</li>
        <li>the infra behind serving models: vLLM, TensorRT-LLM, and making GPUs actually earn their rent</li>
        <li>distributed systems that don't lie — raft consensus, log replication, and the gap between "eventually consistent" and "actually correct"</li>
      </ul>

      <hr />

      <h2>books that actually changed how i think</h2>
      <ul className="book-list">
        <li>
          <span className="book-title">Designing Data-Intensive Applications</span> by Martin Kleppmann
          <span className="book-rec">★ goated</span>
          <br /><span className="book-note">genuinely rewired how i think about storage, replication, and why databases do the things they do. if you read one tech book, make it this one.</span>
        </li>
        <li>
          <span className="book-title">The Pragmatic Programmer</span> by Andrew Hunt &amp; David Thomas
          <br /><span className="book-note">sounds like common sense until you realize you've been doing everything wrong. humbling in a good way.</span>
        </li>
        <li>
          <span className="book-title">Thinking, Fast and Slow</span> by Daniel Kahneman
          <span className="book-rec">★ goated</span>
          <br /><span className="book-note">made me realize half my "rational decisions" were just vibes. genuinely useful for life, not just work.</span>
        </li>
        <li>
          <span className="book-title">Programming Massively Parallel Processors</span> by Hwu, Kirk &amp; Wen-mei
          <span className="book-rec">★ goated</span>
          <br /><span className="book-note">the GPU programming bible. if you care about inference infra, start here.</span>
        </li>
      </ul>

      <hr />

      <h2>things that keep me up at night</h2>
      <ul>
        <li>most ML code never touches the GPU's actual bottleneck. we're writing kernels that wait on memory, not math. how much performance are we leaving on the table?</li>
        <li>why is LLM inference still so expensive? we're saturating HBM bandwidth on operations that could live in SRAM. the hardware is ahead of the software.</li>
        <li>CUDA's programming model was designed for graphics. we're using it for attention kernels and matrix math. is there a better abstraction we haven't built yet?</li>
        <li>at what point does understanding ML internals from the systems side become more valuable than understanding the math from the research side?</li>
      </ul>

      <hr />
    </div>
  );
};

export default About;
