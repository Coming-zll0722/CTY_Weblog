import type { Metadata } from "next";
import Link from "next/link";
import { formatDate, getPosts } from "@/lib/api";

export const metadata: Metadata = {
  title: "学习笔记",
  description: "从公开文章中整理的学习笔记与实验记录。",
  alternates: { canonical: "/notes" },
};
export const dynamic = "force-dynamic";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const requested = Number((await searchParams).page ?? 1);
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1;
  const { data: posts, meta } = await getPosts(15, { q: "笔记" }, page);
  const pages = Math.max(1, Math.ceil(meta.total / meta.page_size));
  return (
    <div className="section-shell page-shell">
      <header className="page-heading">
        <h1>学习笔记</h1>
        <p>从公开文章中，收集与“笔记”相关的学习、实验与思考。</p>
      </header>
      <div className="article-list archive-list">
        {posts.map((post) => (
          <article className="article-row" key={post.id}>
            <div>
              <span className="article-category">{post.category}</span>
              <h2>
                <Link href={`/articles/${post.slug}`}>{post.title}</Link>
              </h2>
              <p>{post.summary}</p>
            </div>
            <aside>
              <time dateTime={post.published_at ?? undefined}>
                {formatDate(post.published_at)}
              </time>
              <span>{post.reading_time} 分钟</span>
            </aside>
          </article>
        ))}
      </div>
      {!posts.length && (
        <div className="empty-state">
          <h2>笔记正在整理</h2>
          <p>可以先从已发布的技术文章开始阅读。</p>
          <Link className="button primary" href="/articles">
            浏览文章
          </Link>
        </div>
      )}
      {pages > 1 && (
        <nav className="archive-pagination" aria-label="笔记分页">
          {page > 1 ? (
            <Link href={`/notes?page=${page - 1}`}>上一页</Link>
          ) : (
            <span />
          )}
          <span>
            第 {page} / {pages} 页
          </span>
          {page < pages ? (
            <Link href={`/notes?page=${page + 1}`}>下一页</Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
