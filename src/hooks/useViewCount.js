import { useState, useEffect } from 'react';

export default function useViewCount(slug) {
  const [views, setViews] = useState(null);

  useEffect(() => {
    if (!slug) return;

    // Fire-and-forget POST to record the view, then read the count from the response
    fetch(`/api/views/${encodeURIComponent(slug)}`, { method: 'POST' })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => setViews(data.count))
      .catch(() => {
        // Silently fail — the view count just won't show
      });
  }, [slug]);

  return views;
}
