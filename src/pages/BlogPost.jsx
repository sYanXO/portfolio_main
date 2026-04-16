import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { parseFrontmatter, postModules } from './Blog';

function getPost(slug) {
  for (const [path, raw] of Object.entries(postModules)) {
    const fileSlug = path.split('/').pop().replace('.md', '');
    if (fileSlug === slug) {
      return parseFrontmatter(raw);
    }
  }
  return null;
}

function estimateReadingTime(text) {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 230);
  return `${minutes} min read`;
}

const BlogPost = () => {
  const { slug } = useParams();
  const post = getPost(slug);

  useDocumentTitle(
    post ? `${post.meta.title || slug} | Sreayan De` : 'Not found | Sreayan De'
  );

  if (!post) {
    return (
      <div className="page">
        <h1>Not found</h1>
        <p>This post doesn't exist. <Link to="/blog">Back to blog</Link></p>
      </div>
    );
  }

  const { meta, content } = post;

  return (
    <div className="page">
      <div className="post-header">
        <h1>{meta.title || slug}</h1>
        <div className="post-meta">
          {meta.date && <span>{meta.date}</span>}
          {meta.date && <span style={{ margin: '0 0.5rem' }}>·</span>}
          <span>{estimateReadingTime(content)}</span>
        </div>
      </div>

      <div className="post-body">
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeHighlight, rehypeKatex]}>
          {content}
        </ReactMarkdown>
      </div>

      <hr />
      <p><Link to="/blog">&larr; All posts</Link></p>
    </div>
  );
};

export default BlogPost;
