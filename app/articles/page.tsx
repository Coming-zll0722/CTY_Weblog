import type { Metadata } from "next";
import Link from "next/link";
import { formatDate, getCategories, getPosts } from "@/lib/api";

export const metadata: Metadata = {
  title: "技术文章",
  description: "关于嵌入式通信、测试自动化、软件工具与数字系统的工程笔记。",
  alternates: { canonical: "/articles" },
};

export const dynamic = "force-dynamic";

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const requestedPage = Number((await searchParams).page ?? "1");
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [{ data: articles, meta }, categories] = await Promise.all([
    getPosts(20, {}, page),
    getCategories(),
  ]);
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.page_size));
  return (
    <div className="section-shell page-shell">
      <header className="page-heading">
        <p className="eyebrow">FIELD NOTES / 文章</p>
        <h1>从问题现场开始写。</h1>
        <p>实验记录、问题排查、项目复盘与概念辨析。重点不是给出标准答案，而是说明结论如何被验证。</p>
      </header>
      <div className="filter-row" aria-label="文章分类">
        <Link className="selected" href="/articles">全部</Link>
        {categories.map((item) => <Link href={`/categories/${item.slug}`} key={item.id}>{item.name}</Link>)}
      </div>
      <div className="archive-layout">
        <div className="article-list archive-list">
          {articles.map((article) => (
            <Link href={`/articles/${article.slug}`} className="article-row" key={article.slug}>
              <div>
                <span className="article-category">{article.category}</span>
                <h2>{article.title}</h2>
                <p>{article.summary}</p>
                <div className="tag-row">{article.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              </div>
              <aside><time>{formatDate(article.published_at)}</time><span>{article.reading_time} 分钟阅读</span></aside>
            </Link>
          ))}
          {!articles.length ? (
            <div className="empty-state">
              <h2>还没有已发布文章</h2>
              <p>完成保密检查并发布后，文章会出现在这里。</p>
            </div>
          ) : null}
          {totalPages > 1 ? (
            <nav className="archive-pagination" aria-label="文章分页">
              {page > 1 ? <Link href={`/articles?page=${page - 1}`}>上一页</Link> : <span />}
              <span>第 {page} / {totalPages} 页</span>
              {page < totalPages ? <Link href={`/articles?page=${page + 1}`}>下一页</Link> : <span />}
            </nav>
          ) : null}
        </div>
        <aside className="archive-side">
          <div><span>文章</span><strong>{meta.total}</strong></div>
          <div><span>分类</span><strong>{categories.length}</strong></div>
          <div><span>当前页</span><strong>{page} / {totalPages}</strong></div>
          <p>所有工作相关内容均经过脱敏和重新建模，不包含内部协议、真实数据或未公开信息。</p>
        </aside>
      </div>
    </div>
  );
}
