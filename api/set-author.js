export default function handler(req, res) {
  const { secret } = req.query;

  if (secret !== process.env.AUTHOR_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Set a long-lived HttpOnly cookie so the author's views are never counted
  res.setHeader(
    'Set-Cookie',
    'blog_author=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000'
  );

  return res.status(200).json({ ok: true, message: 'Author cookie set. Your views will no longer be counted.' });
}
