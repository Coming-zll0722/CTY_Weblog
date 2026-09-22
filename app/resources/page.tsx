import type { Metadata } from "next";
import Link from "next/link";
import { getPublicLinksOrEmpty } from "@/lib/api";

export const metadata: Metadata = {
  title: "资源",
  description: "技术资料、公开链接与内容索引。",
  alternates: { canonical: "/resources" },
};
export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const links = await getPublicLinksOrEmpty();
  return (
    <div className="section-shell page-shell">
      <header className="page-heading">
        <h1>资源</h1>
        <p>让值得反复阅读的资料，有一个方便返回的入口。</p>
      </header>
      <div className="taxonomy-grid">
        <Link href="/categories">
          <h2>文章分类</h2>
          <p>按技术方向浏览内容</p>
        </Link>
        <Link href="/tags">
          <h2>技术标签</h2>
          <p>从关键词发现相关文章</p>
        </Link>
        {links.map((link) => (
          <a
            href={link.url}
            key={link.id}
            target="_blank"
            rel="noopener noreferrer"
          >
            <h2>{link.name} ↗</h2>
            <p>{link.description}</p>
          </a>
        ))}
      </div>
      {!links.length && <p className="empty-state">更多外部资源正在整理。</p>}
    </div>
  );
}
