import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getPosts } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = (await getCategories()).find((item) => item.slug === slug);
  return category
    ? {
        title: category.name,
        description: category.description ?? `浏览 ${category.name} 分类下的技术文章。`,
        alternates: { canonical: `/categories/${category.slug}` },
      }
    : {};
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ data: articles, meta }, categories] = await Promise.all([
    getPosts(100, { category: slug }),
    getCategories(),
  ]);
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();
  return (
    <div className="section-shell page-shell">
      <header className="page-heading">
        <p className="eyebrow">CATEGORY / 分类</p>
        <h1>{category.name}</h1>
        {category.description ? <p>{category.description}</p> : null}
        <p>该分类下共有 {meta.total} 篇已发布文章。</p>
      </header>
      <div className="article-list archive-list">
        {articles.map((article) => (
          <Link href={`/articles/${article.slug}`} className="article-row" key={article.id}>
            <div><h2>{article.title}</h2><p>{article.summary}</p></div>
          </Link>
        ))}
        {!articles.length ? <div className="empty-state"><h2>该分类暂时没有已发布文章</h2><p>可以返回全部文章，或按技术标签继续浏览。</p><div className="hero-actions"><Link href="/articles">全部文章</Link><Link href="/tags">技术标签</Link></div></div> : null}
      </div>
    </div>
  );
}
