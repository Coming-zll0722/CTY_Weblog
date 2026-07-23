import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "@/data/site";

export const metadata: Metadata = {
  title: "技术文章",
  description: "嵌入式软件测试、工具开发、网络通信、FPGA 与软件工程文章。",
  alternates: { canonical: "/articles" },
};

const categories = ["全部", "嵌入式软件测试", "自动化测试", "测试工具开发", "FPGA 和数字电路", "AI 辅助开发"];

export default function ArticlesPage() {
  return (
    <div className="section-shell page-shell">
      <header className="page-heading">
        <p className="eyebrow">WRITING / 文章</p>
        <h1>工程问题，完整记录。</h1>
        <p>技术教程、问题排查、项目复盘与学习笔记。重点记录为什么这样做，以及如何验证结果。</p>
      </header>
      <div className="filter-row" aria-label="文章分类">
        {categories.map((item, index) => <button className={index === 0 ? "selected" : ""} key={item}>{item}</button>)}
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
              <aside><time>{article.date}</time><span>{article.readingTime} 分钟阅读</span></aside>
            </Link>
          ))}
        </div>
        <aside className="archive-side">
          <div><span>文章</span><strong>{articles.length}</strong></div>
          <div><span>分类</span><strong>14</strong></div>
          <div><span>最近更新</span><strong>07 / 21</strong></div>
          <p>所有工作相关内容均经过脱敏和重新建模，不包含内部协议、真实数据或未公开信息。</p>
        </aside>
      </div>
    </div>
  );
}
