import { Link, useLocation } from 'react-router-dom';

const Nav = () => {
  const { pathname } = useLocation();

  return (
    <nav className="site-nav">
      <div className="content-wrapper">
        <Link to="/" className="site-name">Sreayan De</Link>
        <ul className="nav-links">
          <li><Link to="/about" className={pathname === '/about' ? 'active' : ''}>About</Link></li>
          <li><Link to="/blog" className={pathname.startsWith('/blog') ? 'active' : ''}>Blog</Link></li>
          <li><Link to="/projects" className={pathname === '/projects' ? 'active' : ''}>Projects</Link></li>
          <li><a href="https://drive.google.com/file/d/1j5ZqrJQD6dl32i5z0Rc9J27M_F5zzyeS/view?usp=sharing" target="_blank" rel="noopener noreferrer">Resume</a></li>
        </ul>
      </div>
    </nav>
  );
};

export default Nav;
