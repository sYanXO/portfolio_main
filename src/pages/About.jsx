import useDocumentTitle from '../hooks/useDocumentTitle';

const About = () => {
  useDocumentTitle('About — Sreayan De');

  return (
    <div className="page">
      <h1>About</h1>

      <h2>Interests</h2>
      {/* [PLACEHOLDER: Write your own interests here] */}
      <p>
        I care about systems that work reliably under pressure — the kind of software where getting
        the concurrency model wrong means data loss, not just a slow page load. That's what drew me
        to backend engineering and distributed systems in the first place.
      </p>
      <p>
        Outside of code, I'm interested in quantitative finance, game theory, and the intersection
        of mathematics and decision-making.
      </p>

      <hr />

      <h2>Currently exploring</h2>
      {/* [PLACEHOLDER: Replace with your actual items] */}
      <ul>
        <li>How consensus protocols handle network partitions in practice</li>
        <li>The internals of Git — plumbing commands, packfiles, the object model</li>
        <li>Building high-throughput data ingestion pipelines in Go</li>
        <li>Market-neutral trading strategies and quantitative backtesting</li>
        <li>Prediction markets — how they work, why they're often wrong, and what that tells us</li>
      </ul>

      <hr />

      <h2>Books</h2>
      <ul className="book-list">
        {/* [PLACEHOLDER: Replace with your actual books — ★ = recommended] */}
        <li>
          <span className="book-title">Designing Data-Intensive Applications</span> — Martin Kleppmann
          <span className="book-rec">★ recommended</span>
          <br /><span className="book-note">The most useful technical book I've read. Changed how I think about storage and replication.</span>
        </li>
        <li>
          <span className="book-title">The Pragmatic Programmer</span> — Andrew Hunt &amp; David Thomas
          <br /><span className="book-note">Full of advice that sounds obvious but isn't, until you've made the mistakes yourself.</span>
        </li>
        <li>
          <span className="book-title">Thinking, Fast and Slow</span> — Daniel Kahneman
          <span className="book-rec">★ recommended</span>
          <br /><span className="book-note">Changes how you evaluate your own reasoning. Genuinely useful.</span>
        </li>
        <li>
          <span className="book-title">The Art of Strategy</span> — Avinash K. Dixit &amp; Barry J. Nalebuff
          <br /><span className="book-note">Game theory made accessible. Useful beyond economics.</span>
        </li>
      </ul>

      <hr />

      <h2>Curious about</h2>
      {/* [PLACEHOLDER: Replace with your actual curiosities] */}
      <ul>
        <li>Why most distributed systems papers assume reliable clocks when real clocks drift</li>
        <li>The economics of prediction markets and why crowd-sourced forecasts are surprisingly noisy</li>
        <li>How programming language design shapes the way people think about problems</li>
        <li>Whether there's a clean abstraction for error handling that isn't monads or exceptions</li>
      </ul>
    </div>
  );
};

export default About;
