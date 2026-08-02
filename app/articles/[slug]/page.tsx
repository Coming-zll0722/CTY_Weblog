import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MarkdownContent } from "@/components/MarkdownContent";
import { ReadingProgress } from "@/components/ReadingProgress";
import { ZoomableImage } from "@/components/ZoomableImage";
import { ShareLink } from "@/components/ShareLink";
import {
  ApiError,
  formatDate,
  getPost,
  getPostContext,
  getPublicSettingsOrDefaults,
} from "@/lib/api";
import { extractHeadings } from "@/lib/markdown";
import { absoluteSiteUrl } from "@/lib/site-origin";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const article = await getPost(slug);
    return {
      title: article.seo_title ?? article.title,
      description: article.seo_description ?? article.summary,
      alternates: { canonical: `/articles/${article.slug}` },
      openGraph: {
        type: "article",
        title: article.title,
        description: article.summary,
        publishedTime: article.published_at ?? undefined,
        modifiedTime: article.updated_at,
        images: article.cover ? [{
          url: `/api/v1/media/${article.cover.storage_key}`,
          width: article.cover.width ?? undefined,
          height: article.cover.height ?? undefined,
          alt: article.cover.alt_text ?? article.title,
        }] : undefined,
      },
    };
  } catch {
    return {};
  }
}

export default async function ArticleDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let article;
  try {
    article = await getPost(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 301) redirect(error.message);
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const [context, settings] = await Promise.all([
    getPostContext(article.slug),
    getPublicSettingsOrDefaults(),
  ]);
  const { previous, next, related } = context;
  const headings = extractHeadings(article.content_md);
  const canonicalUrl = absoluteSiteUrl(`/articles/${article.slug}`);
  const articleJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.summary,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    mainEntityOfPage: canonicalUrl,
    author: { "@type": "Person", name: settings.authorName },
    image: article.cover
      ? absoluteSiteUrl(`/api/v1/media/${article.cover.storage_key}`)
      : undefined,
  }).replace(/</g, "\\u003c");

  return (
    <div className="section-shell article-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: articleJsonLd }} />
      <ReadingProgress />
      <header className="article-hero">
        <Link href="/articles" className="back-link">← 返回文章</Link>
        {article.category_slug ? (
          <Link className="article-category" href={`/categories/${article.category_slug}`}>
            {article.category}
          </Link>
        ) : <span className="article-category">{article.category}</span>}
        <h1>{article.title}</h1>
        <p>{article.summary}</p>
        <div className="article-info">
          <span>发布于 {formatDate(article.published_at)}</span>
          <span>更新于 {formatDate(article.updated_at)}</span>
          <span>{article.reading_time} 分钟阅读</span>
          <ShareLink title={article.title} url={canonicalUrl} />
        </div>
        {article.cover ? (
          <ZoomableImage
            src={`/api/v1/media/${article.cover.storage_key}`}
            alt={article.cover.alt_text ?? article.title}
            width={article.cover.width}
            height={article.cover.height}
            sizes="(max-width: 900px) 100vw, 1120px"
          />
        ) : null}
      </header>
      <div className="article-layout">
        <article className="prose">
          <MarkdownContent source={article.content_md} />
        </article>
        <aside className="toc">
          <b>本文目录</b>
          {headings.map((heading) => (
            <a className={heading.level === 3 ? "toc-child" : ""} href={`#${heading.id}`} key={`${heading.level}:${heading.id}`}>
              {heading.title}
            </a>
          ))}
          {!headings.length ? <span>正文暂无分节</span> : null}
          <b>文章标签</b>
          {article.tags.map((tag, index) => (
            <Link key={tag} href={`/tags/${article.tag_slugs[index]}`}>
              #{tag}
            </Link>
          ))}
        </aside>
      </div>
      {headings.length ? (
        <details className="mobile-toc">
          <summary>本文目录 · {headings.length} 节</summary>
          <nav>
            {headings.map((heading) => (
              <a className={heading.level === 3 ? "toc-child" : ""} href={`#${heading.id}`} key={`mobile:${heading.id}`}>
                {heading.title}
              </a>
            ))}
          </nav>
        </details>
      ) : null}
      <nav className="article-pagination">
        {previous ? (
          <Link href={`/articles/${previous.slug}`}>
            <span>上一篇</span>{previous.title}
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/articles/${next.slug}`}>
            <span>下一篇</span>{next.title}
          </Link>
        ) : <span />}
      </nav>
      {related.length ? (
        <section className="section-block">
          <div className="section-heading compact"><div><p className="eyebrow">RELATED</p><h2>相关文章</h2></div></div>
          <div className="project-grid">
            {related.map((item) => (
              <Link className="project-card" href={`/articles/${item.slug}`} key={item.id}>
                <span className="article-category">{item.category}</span>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
