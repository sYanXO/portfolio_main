import useDocumentTitle from '../hooks/useDocumentTitle';

const projects = [
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
    name: 'Stake IPL',
    desc: 'full-stack IPL prediction app with fake coins, admin-managed markets, and live leaderboards. built it for cricket nerds who like putting hypothetical money where their mouth is.',
    github: 'https://github.com/sYanXO/Steak',
    live: 'https://steak-hjli.vercel.app/',
    status: null,
  },
  {
    name: 'OptiShrink',
    desc: 'client-side image compressor that hits exact file size targets. no uploads, no backend, just vibes and math.',
    github: 'https://github.com/sYanXO/Opti-Shrink',
    live: 'https://opti-shrink.vercel.app/',
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
