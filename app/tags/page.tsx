import type { Metadata } from "next";
import Link from "next/link";
import { getTags } from "@/lib/api";

export const metadata: Metadata = {
  title: "技术标签",
  description: "按技术线索浏览文章。",
  alternates: { canonical: "/tags" },
};

export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const tags = await getTags();
  return (
    <div className="section-shell page-shell">
      <header className="page-heading">
        <h1>标签</h1>
        <p>按技术线索查找文章。</p>
      </header>
      <div className="tag-row">
        {tags.map((item) => <Link href={`/tags/${item.slug}`} key={item.id}>#{item.name}</Link>)}
      </div>
      {!tags.length ? (
        <div className="empty-state"><h2>暂无标签</h2><p>标签创建后会显示在这里。</p></div>
      ) : null}
    </div>
  );
}
