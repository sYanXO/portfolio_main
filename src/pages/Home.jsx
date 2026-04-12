import useDocumentTitle from '../hooks/useDocumentTitle';

const Home = () => {
  useDocumentTitle('Sreayan De');

  return (
    <div className="page">
      <h1>Sreayan De</h1>

      {/* [PLACEHOLDER: Write your own bio here] */}
      <p className="home-bio">
        I'm a software developer who thinks in systems. I spend most of my time writing Go and Python,
        building things that handle concurrency well, and trying to understand how distributed systems
        actually fail. When I'm not coding, I'm probably reading about market microstructure or going
        down some rabbit hole I found at 2am.
      </p>

      <hr />

      <h2>Currently</h2>
      <ul className="currently-list">
        {/* [PLACEHOLDER: Replace with your actual items] */}
        <li>Building a mini-git implementation from scratch in Go</li>
        <li>Reading about consensus algorithms and Raft</li>
        <li>Exploring WebSocket-based real-time data pipelines</li>
      </ul>

      <hr />

      <h2>Links</h2>
      <ul className="home-links">
        <li><a href="https://github.com/sYanXO" target="_blank" rel="noopener noreferrer">GitHub</a></li>
        <li><a href="https://leetcode.com/u/Sreayan/" target="_blank" rel="noopener noreferrer">LeetCode</a></li>
        <li><a href="https://drive.google.com/file/d/1j5ZqrJQD6dl32i5z0Rc9J27M_F5zzyeS/view?usp=sharing" target="_blank" rel="noopener noreferrer">Resume</a></li>
      </ul>
    </div>
  );
};

export default Home;
