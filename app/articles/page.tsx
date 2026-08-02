import type { Metadata } from "next";
import Link from "next/link";
import { formatDate, getCategories, getPosts } from "@/lib/api";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const page = Number((await searchParams).page ?? "1");
  return {
    title: "技术文章",
    description: "嵌入式通信、测试自动化、工程工具、FPGA 与软件交付文章。",
    alternates: { canonical: page > 1 ? `/articles?page=${page}` : "/articles" },
    robots: page > 1 ? { index: false, follow: true } : undefined,
  };
}
export const dynamic = "force-dynamic";

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const requestedPage = Number((await searchParams).page ?? "1");
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [{ data: articles, meta }, categories] = await Promise.all([
    getPosts(15, {}, page),
    getCategories(),
  ]);
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.page_size));
  return (
    <div className="section-shell page-shell articles-page">
      <header className="page-heading editorial-heading">
        <p className="eyebrow">FIELD NOTES / 工程文章</p>
        <h1>不只记录答案，<br />也保留验证答案的路径。</h1>
        <p>技术教程、问题排查、项目复盘与学习笔记。文章优先说明问题边界、失败路径、方案取舍与验证方式。</p>
      </header>
      <nav className="filter-row" aria-label="文章分类">
        <Link className="selected" href="/articles" aria-current="page">全部</Link>
        {categories.map((item) => <Link href={`/categories/${item.slug}`} key={item.id}>{item.name}</Link>)}
      </nav>
      <div className="archive-layout editorial-archive">
        <div className="article-list archive-list">
          {articles.map((article, index) => (
            <article className="article-row" key={article.id}>
              <span className="story-no">{String((page - 1) * 15 + index + 1).padStart(2, "0")}</span>
              <div>
                <div className="article-kicker"><span className="article-category">{article.category}</span>{article.series ? <span>系列 · {article.series}</span> : null}</div>
                <h2><Link href={`/articles/${article.slug}`}>{article.title}</Link></h2>
                <p>{article.summary}</p>
                <div className="tag-row">{article.tags.map((tag, tagIndex) => <Link href={`/tags/${article.tag_slugs[tagIndex]}`} key={tag}>#{tag}</Link>)}</div>
              </div>
              <aside><time dateTime={article.published_at ?? undefined}>{formatDate(article.published_at)}</time><span>{article.reading_time} 分钟阅读</span><Link href={`/articles/${article.slug}`} aria-label={`阅读《${article.title}》`}>阅读全文 ↗</Link></aside>
            </article>
          ))}
          {!articles.length ? (
            <div className="empty-state"><h2>还没有已发布文章</h2><p>你可以先查看项目案例、能力地图或时间线。</p><div className="hero-actions"><Link href="/projects">浏览项目</Link><Link href="/stack">查看能力地图</Link></div></div>
          ) : null}
          {totalPages > 1 ? (
            <nav className="archive-pagination" aria-label="文章分页">
              {page > 1 ? <Link href={`/articles?page=${page - 1}`} rel="prev">上一页</Link> : <span />}
              <span>第 {page} / {totalPages} 页</span>
              {page < totalPages ? <Link href={`/articles?page=${page + 1}`} rel="next">下一页</Link> : <span />}
            </nav>
          ) : null}
        </div>
        <aside className="archive-side">
          <p className="eyebrow">ARCHIVE INDEX</p>
          <div><span>公开文章</span><strong>{meta.total}</strong></div>
          <div><span>主题分类</span><strong>{categories.length}</strong></div>
          <div><span>当前页</span><strong>{page} / {totalPages}</strong></div>
          <p>工作相关内容均经过脱敏和重新建模，不包含内部协议、真实数据或未公开信息。</p>
          <Link href="/rss.xml">订阅 RSS 更新 ↗</Link>
        </aside>
      </div>
    </div>
  );
}
