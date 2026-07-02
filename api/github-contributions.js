/**
 * Vercel serverless function: /api/github-contributions
 * Fetches the public GitHub contributions graph for a user and extracts
 * contribution data as JSON. No auth required.
 *
 * GitHub's current HTML (2025+):
 *   <td data-date="YYYY-MM-DD" data-level="0-4" id="contribution-day-component-R-C" ...>
 *   <tool-tip for="contribution-day-component-R-C">N contributions on [date].</tool-tip>
 *
 * Response: { contributions: [ { date: "YYYY-MM-DD", count: N, level: 0-4 } ], total: N }
 */
export default async function handler(req, res) {
  const username = 'sYanXO';
  const url = `https://github.com/users/${username}/contributions`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) throw new Error(`GitHub responded with ${response.status}`);

    const html = await response.text();

    // Step 1: collect all <td> cells with data-date + data-level
    // Pattern: data-date="YYYY-MM-DD" ... data-level="N" ... id="contribution-day-component-R-C"
    const tdRegex =
      /data-date="(\d{4}-\d{2}-\d{2})"[^>]*id="(contribution-day-component-[\d-]+)"[^>]*data-level="(\d)"/g;

    const cells = {}; // id -> { date, level }
    let m;
    while ((m = tdRegex.exec(html)) !== null) {
      cells[m[2]] = { date: m[1], level: parseInt(m[3], 10) };
    }

    // Also try the reverse attribute order (id before data-level, etc.)
    const tdRegex2 =
      /id="(contribution-day-component-[\d-]+)"[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d)"/g;
    while ((m = tdRegex2.exec(html)) !== null) {
      if (!cells[m[1]]) {
        cells[m[1]] = { date: m[2], level: parseInt(m[3], 10) };
      }
    }

    // Step 2: extract counts from <tool-tip> elements
    // Pattern: <tool-tip ... for="contribution-day-component-R-C" ...>N contributions on ...</tool-tip>
    // or: <tool-tip ...>No contributions on ...</tool-tip>
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

    // Step 3: build sorted contributions array
    const contributions = Object.values(cells)
      .map(c => ({ date: c.date, count: c.count ?? 0, level: c.level }))
      .filter(c => c.date >= '2026-01-01')
      .sort((a, b) => a.date.localeCompare(b.date));

    const total = contributions.reduce((s, d) => s + d.count, 0);

    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=3600');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).json({ contributions, total });
  } catch (err) {
    console.error('[github-contributions]', err.message);
    return res.status(500).json({ error: 'Failed to fetch contributions' });
  }
}
