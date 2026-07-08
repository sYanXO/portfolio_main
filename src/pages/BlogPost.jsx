import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import useDocumentTitle from '../hooks/useDocumentTitle';
import useViewCount from '../hooks/useViewCount';
import TableOfContents from '../components/TableOfContents';
import { getHeadingsFromContent } from '../utils/headings';
import { parseFrontmatter, postModules } from '../utils/blog';

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
  const views = useViewCount(slug);

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
  const headings = getHeadingsFromContent(content);

  const renderHeading = (level) => {
    const HeadingTag = `h${level}`;

    return ({ node, children, ...props }) => {
      const line = node?.position?.start?.line;
      const heading = headings.find((item) => item.level === level && item.line === line);

      return (
        <HeadingTag id={heading?.slug} {...props}>
          {children}
        </HeadingTag>
      );
    };
  };

  return (
    <div className="page page--post">
      <div className="post-layout">
        <TableOfContents content={content} />

        <article className="post-article">
          <div className="post-header">
            <h1>{meta.title || slug}</h1>
            <div className="post-meta">
              {meta.date && <span>{meta.date}</span>}
              {meta.date && <span className="meta-sep">·</span>}
              <span>{estimateReadingTime(content)}</span>
              {views !== null && (
                <>
                  <span className="meta-sep">·</span>
                  <span className="view-count">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    {views}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="post-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeHighlight, rehypeKatex]}
              components={{
                h2: renderHeading(2),
                h3: renderHeading(3),
                a: ({ href, children, ...props }) => {
                  const isExternal = href?.startsWith('http://') || href?.startsWith('https://');
                  return (
                    <a
                      href={href}
                      target={isExternal ? '_blank' : undefined}
                      rel={isExternal ? 'noopener noreferrer' : undefined}
                      {...props}
                    >
                      {children}
                    </a>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
          <hr />
          <p><Link to="/blog">&larr; All posts</Link></p>
        </article>
      </div>
    </div>
  );
};

export default BlogPost;
