import { useEffect } from 'react';

/**
 * Sets document.title and restores on unmount.
 * Usage: useDocumentTitle('About | Sreayan De')
 */
const useDocumentTitle = (title) => {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => { document.title = prev; };
  }, [title]);
};

export default useDocumentTitle;
