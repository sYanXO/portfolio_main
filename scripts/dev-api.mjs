/**
 * Local dev server for API routes — mirrors the Vercel serverless functions.
 * Runs on port 3001, proxied by Vite at /api/*.
 */
import http from 'http';
import { fetchGitHubContributions } from '../api/_lib/github.js';

const PORT = 3001;

async function handleContributions(req, res) {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const username = urlObj.searchParams.get('username') || 'sYanXO';
  
  try {
    const { contributions, total } = await fetchGitHubContributions(username);
    const body = JSON.stringify({ contributions, total });

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(body);
  } catch (err) {
    console.error('[dev-api] error:', err.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to fetch contributions' }));
  }
}

const server = http.createServer(async (req, res) => {
  const path = req.url.split('?')[0];
  if (path === '/api/github-contributions') {
    await handleContributions(req, res);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`[dev-api] Local API server running on http://localhost:${PORT}`);
});
