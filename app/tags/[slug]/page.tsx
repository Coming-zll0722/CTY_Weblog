import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPosts, getTags } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tag = (await getTags()).find((item) => item.slug === slug);
  return tag
    ? {
        title: `#${tag.name}`,
        description: `浏览标记为 ${tag.name} 的技术文章。`,
        alternates: { canonical: `/tags/${tag.slug}` },
      }
    : {};
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ data: articles, meta }, tags] = await Promise.all([
    getPosts(100, { tag: slug }),
    getTags(),
  ]);
  const tag = tags.find((item) => item.slug === slug);
  if (!tag) notFound();
  return (
    <div className="section-shell page-shell">
      <header className="page-heading">
        <p className="eyebrow">TAG / 标签</p>
        <h1>#{tag.name}</h1>
        <p>该标签下共有 {meta.total} 篇已发布文章。</p>
      </header>
      <div className="article-list archive-list">
        {articles.map((article) => (
          <Link href={`/articles/${article.slug}`} className="article-row" key={article.id}>
            <div><h2>{article.title}</h2><p>{article.summary}</p></div>
          </Link>
        ))}
        {!articles.length ? <p className="search-empty">该标签暂时没有已发布文章。</p> : null}
      </div>
    </div>
  );
}
