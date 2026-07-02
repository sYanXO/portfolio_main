/**
 * Local dev server for API routes — mirrors the Vercel serverless functions.
 * Runs on port 3001, proxied by Vite at /api/*.
 */
import http from 'http';

const GITHUB_USERNAME = 'sYanXO';
const PORT = 3001;

async function handleContributions(res) {
  const url = `https://github.com/users/${GITHUB_USERNAME}/contributions`;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) throw new Error(`GitHub ${response.status}`);

    const html = await response.text();

    // Parse <td data-date="..." id="contribution-day-component-R-C" data-level="N">
    const tdRegex =
      /data-date="(\d{4}-\d{2}-\d{2})"[^>]*id="(contribution-day-component-[\d-]+)"[^>]*data-level="(\d)"/g;

    const cells = {};
    let m;
    while ((m = tdRegex.exec(html)) !== null) {
      cells[m[2]] = { date: m[1], level: parseInt(m[3], 10) };
    }

    // Also handle reverse attribute order
    const tdRegex2 =
      /id="(contribution-day-component-[\d-]+)"[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d)"/g;
    while ((m = tdRegex2.exec(html)) !== null) {
      if (!cells[m[1]]) cells[m[1]] = { date: m[2], level: parseInt(m[3], 10) };
    }

    // Extract counts from <tool-tip for="...">N contributions on ...</tool-tip>
    const tooltipRegex =
      /<tool-tip[^>]*for="(contribution-day-component-[\d-]+)"[^>]*>([\s\S]*?)<\/tool-tip>/g;
    while ((m = tooltipRegex.exec(html)) !== null) {
      const id = m[1];
      const text = m[2].trim();
      if (cells[id] !== undefined) {
        const countMatch = text.match(/^(\d+)\s+contribution/);
        cells[id].count = countMatch ? parseInt(countMatch[1], 10) : 0;
      }
    }

    const contributions = Object.values(cells)
      .map(c => ({ date: c.date, count: c.count ?? 0, level: c.level }))
      .filter(c => c.date >= '2026-01-01')
      .sort((a, b) => a.date.localeCompare(b.date));

    const total = contributions.reduce((s, d) => s + d.count, 0);
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
    await handleContributions(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`[dev-api] Local API server running on http://localhost:${PORT}`);
});
