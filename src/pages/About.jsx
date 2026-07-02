import useDocumentTitle from '../hooks/useDocumentTitle';
import GithubHeatmap from '../components/GithubHeatmap';

const About = () => {
  useDocumentTitle('Sreayan De');

  return (
    <div className="page">
      <h1>About</h1>

      <p className="home-bio">
        hey, i'm sreayan. i write code that doesn't fall apart when things get weird.
        mostly Go, C++ and Python, mostly backend stuff, mostly at 2am. when i'm not debugging
        race conditions, i'm probably deep in some rabbit hole about how database storage engines
        actually store bytes on disk or why distributed systems lie to you.
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
        you lose data. that's still the foundation, but lately i've been pulling the thread on how databases 
        actually work under the hood rather than just treating them as black boxes.
      </p>
      <p>
        right now that means building custom storage engines from scratch, understanding disk I/O bottlenecks 
        (SSTables, Write-Ahead Logs, Memtables), and reading papers about Raft consensus from the perspective 
        of someone who cares about data integrity and raw throughput.
      </p>

      <hr />

      <h2>currently obsessed with</h2>
      <p className="obsessed-disclaimer">
        (this list rotates fast. maybe it's an attention issue, maybe it's too many interesting problems. either way, if you're reading this a month from now, assume half of it has changed.)
      </p>
      <ul>
        <li>building LSM-Tree key-value stores from scratch — Memtables, SSTables, Bloom Filters, and levelized compaction</li>
        <li>distributed systems that don't lie — raft consensus, log replication, and the massive gap between "eventually consistent" and "actually correct"</li>
        <li>lock-free concurrency, memory management, and writing thread-safe data structures in Go and C++</li>
        <li>storage engine architectures — B-Trees vs LSM-Trees, and avoiding kernel page cache overhead</li>
        <li>networking internals — building layer 4 TCP load balancers, connection poolers, and bypassing standard GC pauses</li>
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
          <span className="book-title">Database Internals</span> by Alex Petrov
          <span className="book-rec">★ goated</span>
          <br /><span className="book-note">if you want to know how databases actually store and retrieve bytes without corrupting them, this is the holy text.</span>
        </li>
      </ul>

      <hr />

      <GithubHeatmap />

      <hr />
    </div>
  );
};

export default About;
