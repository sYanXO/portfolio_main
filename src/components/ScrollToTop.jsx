import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls to top on route change.
 * Placed inside <BrowserRouter> in main.jsx.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
