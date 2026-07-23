import type { MetadataRoute } from "next";
import { articles, projects } from "@/data/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://example.com";
  const staticPages = ["", "/articles", "/projects", "/stack", "/timeline", "/about", "/search"];
  return [
    ...staticPages.map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: path === "" ? "weekly" as const : "monthly" as const })),
    ...articles.map((item) => ({ url: `${base}/articles/${item.slug}`, lastModified: item.updated, changeFrequency: "monthly" as const })),
    ...projects.map((item) => ({ url: `${base}/projects/${item.slug}`, lastModified: new Date(), changeFrequency: "monthly" as const })),
  ];
}
