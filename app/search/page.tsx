import type { Metadata } from "next";
import { SearchClient } from "@/components/SearchClient";
import { getCategories } from "@/lib/api";

export const metadata: Metadata = {
  title: "搜索",
  description: "搜索文章、项目、分类和标签。",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const requestedPage = Number(params.page ?? "1");
  const categories = await getCategories();
  return (
    <SearchClient
      categories={categories}
      initialQuery={(params.q ?? "").slice(0, 100)}
      initialCategory={(params.category ?? "").slice(0, 100)}
      initialPage={Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1}
    />
  );
}
