import type { MetadataRoute } from "next";
import {
  getAllPosts,
  getAllProjects,
  getCategories,
  getTags,
} from "@/lib/api";
import { getSiteOrigin } from "@/lib/site-origin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteOrigin();
  const staticPages = [
    "",
    "/articles",
    "/projects",
    "/categories",
    "/tags",
    "/stack",
    "/timeline",
    "/about",
    "/contact",
  ];
  const [articles, projects, categories, tags] = await Promise.all([
    getAllPosts(),
    getAllProjects(),
    getCategories(),
    getTags(),
  ]);
  return [
    ...staticPages.map((path) => ({
      url: `${base}${path}`,
      lastModified: new Date(),
      changeFrequency: path === "" ? "weekly" as const : "monthly" as const,
    })),
    ...articles.map((item) => ({
      url: `${base}/articles/${item.slug}`,
      lastModified: item.updated_at,
      changeFrequency: "monthly" as const,
    })),
    ...projects.map((item) => ({
      url: `${base}/projects/${item.slug}`,
      lastModified: item.updated_at,
      changeFrequency: "monthly" as const,
    })),
    ...categories.map((item) => ({
      url: `${base}/categories/${item.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
    })),
    ...tags.map((item) => ({
      url: `${base}/tags/${item.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
    })),
  ];
}
