import { useState, useEffect, useMemo, useCallback } from 'react';
import { getHeadingsFromContent } from '../utils/headings';

const TableOfContents = ({ content }) => {
  const headings = useMemo(() => getHeadingsFromContent(content), [content]);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    if (headings.length === 0) return;

    const handleScroll = () => {
      let current = null;
      const scrollTop = window.scrollY + 120;
      const scrollBottom = window.innerHeight + window.scrollY;
      const pageBottom = document.documentElement.scrollHeight - 2;

      for (const { slug } of headings) {
        const el = document.getElementById(slug);
        if (el && el.offsetTop <= scrollTop) {
          current = slug;
        } else {
          break;
        }
      }

      if (scrollBottom >= pageBottom) {
        current = headings[headings.length - 1].slug;
      }

      setActiveId(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);

  const handleClick = useCallback((e, slug) => {
    e.preventDefault();
    const el = document.getElementById(slug);
    if (el) {
      setActiveId(slug);
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  if (headings.length === 0) return null;

  return (
    <nav className="toc" aria-label="On this page">
      <span className="toc-label">ON THIS PAGE</span>
      <ul className="toc-list">
        {headings.map(({ level, text, slug }) => (
          <li
            key={slug}
            className={`toc-item toc-item--${level}${activeId === slug ? ' toc-active' : ''}`}
          >
            <a href={`#${slug}`} onClick={(e) => handleClick(e, slug)}>
              {text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default TableOfContents;
