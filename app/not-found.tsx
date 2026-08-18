import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "页面未找到",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div className="section-shell not-found">
      <span>404</span>
      <h1>没有找到这个页面</h1>
      <p>地址可能被移动、重命名，或尚未发布。可以从首页、文章或项目继续浏览。</p>
      <div className="hero-actions">
        <Link className="button primary" href="/">返回首页</Link>
        <Link className="button secondary" href="/articles">阅读文章</Link>
      </div>
    </div>
  );
}
