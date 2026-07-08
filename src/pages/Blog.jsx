import { Link } from 'react-router-dom';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { parseFrontmatter, postModules } from '../utils/blog';

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

function formatMonth(dateString) {
  if (!dateString) return 'undated';

  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'undated';

  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  }).toLowerCase();
}

function groupPostsByMonth(posts) {
  return posts.reduce((groups, post) => {
    const month = formatMonth(post.date);
    const existing = groups.find((group) => group.month === month);

    if (existing) {
      existing.posts.push(post);
    } else {
      groups.push({ month, posts: [post] });
    }

    return groups;
  }, []);
}

const Blog = () => {
  useDocumentTitle('Blog | Sreayan De');

  const posts = getAllPosts();
  const groupedPosts = groupPostsByMonth(posts);

  return (
    <div className="page">
      <h1>Blog</h1>

      {posts.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>nothing here yet. soon™</p>
      ) : (
        <div className="post-archive">
          {groupedPosts.map((group) => (
            <section key={group.month} className="post-month-group">
              <h2>{group.month}</h2>
              <ul className="post-list">
                {group.posts.map((post) => (
                  <li key={post.slug} className="post-item">
                    <Link to={`/blog/${post.slug}`}>{post.title || post.slug}</Link>
                    {post.date && <div className="post-meta">{post.date}</div>}
                    {post.description && <div className="post-desc">{post.description}</div>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default Blog;
