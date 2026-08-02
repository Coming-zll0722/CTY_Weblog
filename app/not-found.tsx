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
      <h1>这条路径没有记录。</h1>
      <p>页面可能被移动、重命名，或尚未发布。</p>
      <Link className="button primary" href="/">返回首页</Link>
    </div>
  );
}
