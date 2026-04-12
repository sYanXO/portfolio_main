import { Link } from 'react-router-dom';
import useDocumentTitle from '../hooks/useDocumentTitle';

// Import all markdown files from /src/posts/
const postModules = import.meta.glob('../posts/*.md', { eager: true, query: '?raw', import: 'default' });

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, content: raw };

  const metaBlock = match[1];
  const content = match[2];
  const meta = {};

  for (const line of metaBlock.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    meta[key] = value;
  }

  return { meta, content };
}

function getAllPosts() {
  const posts = [];

  for (const [path, raw] of Object.entries(postModules)) {
    const slug = path.split('/').pop().replace('.md', '');
    const { meta } = parseFrontmatter(raw);
    posts.push({ slug, ...meta });
  }

  // Sort by date, newest first
  posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return posts;
}

const Blog = () => {
  useDocumentTitle('Blog — Sreayan De');

  const posts = getAllPosts();

  return (
    <div className="page">
      <h1>Blog</h1>

      {posts.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>nothing here yet. soon™</p>
      ) : (
        <ul className="post-list">
          {posts.map((post) => (
            <li key={post.slug} className="post-item">
              <Link to={`/blog/${post.slug}`}>{post.title || post.slug}</Link>
              {post.date && <div className="post-meta">{post.date}</div>}
              {post.description && <div className="post-desc">{post.description}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export { parseFrontmatter, postModules };
export default Blog;
