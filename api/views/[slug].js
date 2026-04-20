import crypto from 'crypto';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(command, ...args) {
  const res = await fetch(`${UPSTASH_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([command, ...args]),
  });
  if (!res.ok) {
    throw new Error(`Upstash error: ${res.status}`);
  }
  const data = await res.json();
  return data.result;
}

function hashIP(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

export default async function handler(req, res) {
  // CORS headers for the SPA
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Missing slug' });
  }

  const countKey = `views:${slug}:count`;
  const visitorsKey = `views:${slug}:visitors`;

  try {
    if (req.method === 'POST') {
      // Check if the visitor is the author (cookie set via /api/set-author)
      const cookies = req.headers.cookie || '';
      const isAuthor = cookies.split(';').some(
        (c) => c.trim() === 'blog_author=1'
      );

      if (!isAuthor) {
        const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1')
          .split(',')[0]
          .trim();
        const fingerprint = hashIP(ip);

        // SADD returns 1 if the member was added (new), 0 if it already existed
        const isNew = await redis('SADD', visitorsKey, fingerprint);

        if (isNew) {
          await redis('INCR', countKey);
        }
      }

      const count = (await redis('GET', countKey)) || 0;
      return res.status(200).json({ count: Number(count) });
    }

    if (req.method === 'GET') {
      const count = (await redis('GET', countKey)) || 0;
      return res.status(200).json({ count: Number(count) });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('View counter error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
