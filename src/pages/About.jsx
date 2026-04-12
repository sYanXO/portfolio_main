import useDocumentTitle from '../hooks/useDocumentTitle';

const About = () => {
  useDocumentTitle('Sreayan De');

  return (
    <div className="page">
      <h1>About</h1>

      <p className="home-bio">
        hey, i'm sreayan — i write code that doesn't fall apart when things get weird.
        mostly Go and Python, mostly backend stuff, mostly at 2am. when i'm not debugging
        race conditions, i'm probably deep in some rabbit hole about how markets work or
        why distributed systems lie to you.
      </p>

      <hr />

      <h2>what i'm into</h2>
      <p>
        i like building stuff that actually holds up under pressure — not the "it works on
        my machine" kind, but the kind where if your concurrency model is wrong, you lose
        data and cry. that's what got me hooked on backend engineering and distributed systems.
      </p>
      <p>
        outside of code, i'm into quant finance, game theory, and figuring out why
        humans are so bad at making decisions (spoiler: we just are).
      </p>

      <hr />

      <h2>currently obsessed with</h2>
      <ul>
        <li>building a mini-git from scratch in Go (yes, the plumbing commands too)</li>
        <li>how consensus protocols handle it when the network just... doesn't</li>
        <li>high-throughput data pipelines that don't melt under load</li>
        <li>WebSocket-based real-time stuff — because polling is <strong>BORING</strong></li>
        <li>market-neutral trading strategies and backtesting them until they break</li>
        <li>prediction markets — why they exist, why they're wrong, and what that says about us</li>
      </ul>

      <hr />

      <h2>books that actually changed how i think</h2>
      <ul className="book-list">
        <li>
          <span className="book-title">Designing Data-Intensive Applications</span> — Martin Kleppmann
          <span className="book-rec">★ goated</span>
          <br /><span className="book-note">genuinely rewired how i think about storage, replication, and why databases do the things they do. if you read one tech book, make it this one.</span>
        </li>
        <li>
          <span className="book-title">The Pragmatic Programmer</span> — Andrew Hunt &amp; David Thomas
          <br /><span className="book-note">sounds like common sense until you realize you've been doing everything wrong. humbling in a good way.</span>
        </li>
        <li>
          <span className="book-title">Thinking, Fast and Slow</span> — Daniel Kahneman
          <span className="book-rec">★ goated</span>
          <br /><span className="book-note">made me realize half my "rational decisions" were just vibes. genuinely useful for life, not just work.</span>
        </li>
        <li>
          <span className="book-title">The Art of Strategy</span> — Avinash K. Dixit &amp; Barry J. Nalebuff
          <br /><span className="book-note">game theory but actually understandable. applies to way more than just economics.</span>
        </li>
      </ul>

      <hr />

      <h2>things that keep me up at night</h2>
      <ul>
        <li>why do distributed systems papers just assume clocks work? they don't. they literally drift.</li>
        <li>prediction markets should be smart but they're weirdly noisy — what's up with that?</li>
        <li>do programming languages shape how we think about problems, or are we overthinking it?</li>
        <li>is there a clean way to handle errors that isn't monads or exceptions? asking for a friend.</li>
      </ul>

      <hr />

      <h2>find me</h2>
      <ul className="home-links">
        <li><a href="https://github.com/sYanXO" target="_blank" rel="noopener noreferrer">GitHub</a></li>
        <li><a href="https://leetcode.com/u/Sreayan/" target="_blank" rel="noopener noreferrer">LeetCode</a></li>
        <li><a href="https://drive.google.com/file/d/1j5ZqrJQD6dl32i5z0Rc9J27M_F5zzyeS/view?usp=sharing" target="_blank" rel="noopener noreferrer">Resume</a></li>
      </ul>
    </div>
  );
};

export default About;
