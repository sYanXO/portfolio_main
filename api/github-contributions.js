import { fetchGitHubContributions } from './_lib/github.js';

/**
 * Vercel serverless function: /api/github-contributions
 */
export default async function handler(req, res) {
  const username = req.query.username || 'sYanXO';

  try {
    const { contributions, total } = await fetchGitHubContributions(username);

    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=3600');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).json({ contributions, total });
  } catch (err) {
    console.error('[github-contributions]', err.message);
    return res.status(500).json({ error: 'Failed to fetch contributions' });
  }
}
