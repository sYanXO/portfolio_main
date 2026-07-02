/**
 * Shared logic to fetch and parse GitHub contributions.
 */
export async function fetchGitHubContributions(username) {
  const url = `https://github.com/users/${username}/contributions`;

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
  const tdRegex =
    /data-date="(\d{4}-\d{2}-\d{2})"[^>]*id="(contribution-day-component-[\d-]+)"[^>]*data-level="(\d)"/g;

  const cells = {};
  let m;
  while ((m = tdRegex.exec(html)) !== null) {
    cells[m[2]] = { date: m[1], level: parseInt(m[3], 10) };
  }

  // Handle reverse attribute order
  const tdRegex2 =
    /id="(contribution-day-component-[\d-]+)"[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d)"/g;
  while ((m = tdRegex2.exec(html)) !== null) {
    if (!cells[m[1]]) {
      cells[m[1]] = { date: m[2], level: parseInt(m[3], 10) };
    }
  }

  // Step 2: extract counts from <tool-tip> elements
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

  return { contributions, total };
}
