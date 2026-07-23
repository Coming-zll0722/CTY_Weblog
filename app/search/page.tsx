import type { Metadata } from "next";
import { SearchClient } from "@/components/SearchClient";

export const metadata: Metadata = { title: "搜索", description: "搜索文章、项目、分类和标签。" };

export default function SearchPage() {
  return <SearchClient />;
}
