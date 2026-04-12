import useDocumentTitle from '../hooks/useDocumentTitle';

const projects = [
  {
    name: 'mini-git',
    desc: 'A from-scratch Git implementation in Go — exploring the object model, plumbing commands, and how version control actually works under the hood.',
    github: '#',
    live: null,
    status: 'wip',
  },
  {
    name: 'DB Uploader',
    desc: 'Benchmarked Go ingestion pipeline for large JSON datasets into PostgreSQL, built around concurrent workers to maximize throughput under load.',
    github: 'https://github.com/sYanXO/db-uploader',
    live: null,
    status: null,
  },
  {
    name: 'Stake IPL',
    desc: 'Full-stack IPL prediction platform with fictional coins, admin-managed markets, and live leaderboards.',
    github: 'https://github.com/sYanXO/Steak',
    live: 'https://steak-hjli.vercel.app/',
    status: null,
  },
  {
    name: 'OptiShrink',
    desc: 'Client-side image compressor built to hit strict file-size targets with no uploads or backend dependency.',
    github: 'https://github.com/sYanXO/Opti-Shrink',
    live: 'https://opti-shrink.vercel.app/',
    status: null,
  },
  {
    name: 'Market-Neutral Quant Strategy',
    desc: 'Backtested mean reversion strategy with regime filters and ATR-based risk controls across 60+ tickers.',
    github: 'https://github.com/sYanXO/NSE-meanReversion-strategy',
    live: null,
    status: null,
  },
  {
    name: 'Vercel Clone',
    desc: 'Static-site deployment platform exploring queued builds, object storage, and Vercel-style architecture.',
    github: null,
    live: null,
    status: 'archived',
  },
];

const Projects = () => {
  useDocumentTitle('Projects — Sreayan De');

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
