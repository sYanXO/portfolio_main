#!/usr/bin/env node

/**
 * Generates public/feed.xml from src/posts/*.md
 * Run: node scripts/generate-feed.mjs
 * 
 * Add to package.json scripts:
 *   "build": "node scripts/generate-feed.mjs && vite build"
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SITE_URL = 'https://sreayan.dev'; // Update with your actual domain
const postsDir = join(__dirname, '..', 'src', 'posts');
const outputPath = join(__dirname, '..', 'public', 'feed.xml');

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const meta = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    meta[key] = value;
  }
  return meta;
}

function toRFC822(dateStr) {
  return new Date(dateStr + 'T00:00:00Z').toUTCString();
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const files = readdirSync(postsDir).filter(f => f.endsWith('.md'));
const posts = files.map(file => {
  const raw = readFileSync(join(postsDir, file), 'utf-8');
  const meta = parseFrontmatter(raw);
  const slug = basename(file, '.md');
  return { slug, ...meta };
}).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

const items = posts.map(p => `    <item>
      <title>${escapeXml(p.title || p.slug)}</title>
      <link>${SITE_URL}/blog/${p.slug}</link>
      <guid>${SITE_URL}/blog/${p.slug}</guid>
      <pubDate>${p.date ? toRFC822(p.date) : ''}</pubDate>
      <description>${escapeXml(p.description || '')}</description>
    </item>`).join('\n');

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Sreayan De</title>
    <link>${SITE_URL}</link>
    <description>Writing about systems programming, distributed systems, and things I'm building.</description>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;

writeFileSync(outputPath, feed, 'utf-8');
console.log(`✓ Generated feed.xml with ${posts.length} posts`);
