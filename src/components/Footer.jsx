const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="content-wrapper">
        <p>
          &copy; {year} Sreayan De
          <span style={{ margin: '0 0.75rem', color: 'var(--border)' }}>·</span>
          <span className="footer-links">
            <a href="https://github.com/sYanXO" target="_blank" rel="noopener noreferrer">GitHub</a>
            <span className="sep">|</span>
            <a href="https://leetcode.com/u/Sreayan/" target="_blank" rel="noopener noreferrer">LeetCode</a>
            <span className="sep">|</span>
            <a href="mailto:desreayan@gmail.com">Email</a>
          </span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
