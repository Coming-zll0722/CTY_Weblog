import type { Metadata } from "next";
import Link from "next/link";
import { getCategories } from "@/lib/api";

export const metadata: Metadata = {
  title: "文章分类",
  description: "按工程问题域浏览技术文章。",
  alternates: { canonical: "/categories" },
};

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getCategories();
  return (
    <div className="section-shell page-shell">
      <header className="page-heading">
        <h1>分类</h1>
        <p>从工程问题域进入文章归档。</p>
      </header>
      <div className="taxonomy-grid">
        {categories.map((item) => (
          <Link href={`/categories/${item.slug}`} key={item.id}>
            <h2>{item.name}</h2>
            <p>{item.description}</p>
          </Link>
        ))}
        {!categories.length ? (
          <div className="empty-state"><h2>暂无分类</h2><p>分类创建后会显示在这里。</p></div>
        ) : null}
      </div>
    </div>
  );
}
