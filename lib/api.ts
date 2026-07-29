export type MediaAsset = {
  id: string;
  storage_key: string;
  alt_text: string | null;
  width: number | null;
  height: number | null;
};

export type Post = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content_md: string;
  status: "draft" | "published" | "archived";
  category: string;
  category_slug: string;
  category_id: string | null;
  cover_media_id: string | null;
  cover: MediaAsset | null;
  tags: string[];
  tag_ids: string[];
  tag_slugs: string[];
  reading_time: number;
  seo_title: string | null;
  seo_description: string | null;
  confidentiality_checked: boolean;
  version: number;
  published_at: string | null;
  updated_at: string;
  deleted_at: string | null;
};

export type Project = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content_md: string;
  background_md: string;
  problem_md: string;
  role_md: string;
  architecture_md: string;
  features_md: string;
  challenges_md: string;
  solutions_md: string;
  outcomes_md: string;
  next_steps_md: string;
  confidentiality_note: string;
  status: string;
  tags: string[];
  tag_ids: string[];
  started_at: string | null;
  ended_at: string | null;
  repo_url: string | null;
  demo_url: string | null;
  cover_media_id: string | null;
  cover: MediaAsset | null;
  screenshots: MediaAsset[];
  screenshot_media_ids: string[];
  related_posts: { id: string; title: string; slug: string }[];
  related_post_ids: string[];
  is_public: boolean;
  confidentiality_checked: boolean;
  featured: boolean;
  sort_order: number;
  version: number;
  updated_at: string;
  deleted_at: string | null;
};

export type TimelineEvent = {
  id: string;
  event_date: string;
  title: string;
  description: string;
  event_type: string;
};

export type TaxonomyItem = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
};

export type PublicSettings = {
  siteName: string;
  authorName: string;
  brandMark: string;
  siteDescription: string;
  seoDescription: string;
  seoKeywords: string[];
  contactEmail: string;
  githubUrl: string;
  footerNote: string;
};

export type PublicLink = {
  id: string;
  name: string;
  url: string;
  description: string | null;
};

export const defaultPublicSettings: PublicSettings = {
  siteName: "从头越.log",
  authorName: "林序",
  brandMark: "LOG",
  siteDescription: "记录技术实践、项目开发与持续学习。",
  seoDescription:
    "从头越.log：记录嵌入式通信测试、自动化工具、软件架构与工程实践的个人技术博客。",
  seoKeywords: ["嵌入式软件测试", "自动化测试", "TCP UDP", "CAN", "Python", "C++", "FPGA"],
  contactEmail: "",
  githubUrl: "",
  footerNote: "内容经过脱敏处理",
};

type ApiEnvelope<T> = { success: true; data: T };
type PageEnvelope<T> = ApiEnvelope<T[]> & {
  meta: { page: number; page_size: number; total: number };
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const serverApiBase =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8000/api/v1";

export const publicApiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${serverApiBase}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    redirect: "manual",
  });
  if (response.status >= 300 && response.status < 400) {
    throw new ApiError(
      response.status,
      "MOVED_PERMANENTLY",
      response.headers.get("location") ?? "/",
    );
  }
  const body = await response.json().catch(() => null) as {
    error?: { code?: string; message?: string };
  } | null;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? "API_ERROR",
      body?.error?.message ?? "内容服务暂时不可用。",
    );
  }
  return body as T;
}

export async function getPosts(
  limit = 20,
  filters: { category?: string; tag?: string; q?: string } = {},
  page = 1,
): Promise<PageEnvelope<Post>> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(limit),
  });
  if (filters.category) params.set("category", filters.category);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.q) params.set("q", filters.q);
  return apiFetch<PageEnvelope<Post>>(`/posts?${params}`);
}

export async function getPost(slug: string): Promise<Post> {
  const response = await apiFetch<ApiEnvelope<Post>>(
    `/posts/${encodeURIComponent(slug)}`,
  );
  return response.data;
}

export async function getProjects(
  limit = 20,
  page = 1,
): Promise<PageEnvelope<Project>> {
  return apiFetch<PageEnvelope<Project>>(`/projects?page=${page}&page_size=${limit}`);
}

export async function getProject(slug: string): Promise<Project> {
  const response = await apiFetch<ApiEnvelope<Project>>(
    `/projects/${encodeURIComponent(slug)}`,
  );
  return response.data;
}

export async function getTimeline(): Promise<TimelineEvent[]> {
  const response = await apiFetch<ApiEnvelope<TimelineEvent[]>>("/timelines");
  return response.data;
}

export async function getCategories(): Promise<TaxonomyItem[]> {
  const response = await apiFetch<ApiEnvelope<TaxonomyItem[]>>("/categories");
  return response.data;
}

export async function getTags(): Promise<TaxonomyItem[]> {
  const response = await apiFetch<ApiEnvelope<TaxonomyItem[]>>("/tags");
  return response.data;
}

async function collectAll<T>(
  fetchPage: (page: number) => Promise<PageEnvelope<T>>,
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const response = await fetchPage(page);
    items.push(...response.data);
    if (items.length >= response.meta.total || response.data.length === 0) break;
  }
  return items;
}

export function getAllPosts(): Promise<Post[]> {
  return collectAll((page) => getPosts(100, {}, page));
}

export function getAllProjects(): Promise<Project[]> {
  return collectAll((page) => getProjects(100, page));
}

function publicSettingString(
  values: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const value = values[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const response = await apiFetch<ApiEnvelope<Record<string, unknown>>>("/settings/public");
  const values = response.data;
  const keywords = values["public.seo_keywords"];
  return {
    siteName: publicSettingString(values, "public.site_name", defaultPublicSettings.siteName),
    authorName: publicSettingString(values, "public.author_name", defaultPublicSettings.authorName),
    brandMark: publicSettingString(values, "public.brand_mark", defaultPublicSettings.brandMark),
    siteDescription: publicSettingString(
      values,
      "public.site_description",
      defaultPublicSettings.siteDescription,
    ),
    seoDescription: publicSettingString(
      values,
      "public.seo_description",
      defaultPublicSettings.seoDescription,
    ),
    seoKeywords:
      Array.isArray(keywords) &&
      keywords.length > 0 &&
      keywords.every((keyword) => typeof keyword === "string" && keyword.trim())
        ? keywords
        : defaultPublicSettings.seoKeywords,
    contactEmail: publicSettingString(
      values,
      "public.contact_email",
      defaultPublicSettings.contactEmail,
    ),
    githubUrl: publicSettingString(values, "public.github_url", defaultPublicSettings.githubUrl),
    footerNote: publicSettingString(values, "public.footer_note", defaultPublicSettings.footerNote),
  };
}

export async function getPublicSettingsOrDefaults(): Promise<PublicSettings> {
  try {
    return await getPublicSettings();
  } catch {
    return defaultPublicSettings;
  }
}

export async function getPublicLinksOrEmpty(): Promise<PublicLink[]> {
  try {
    const response = await apiFetch<ApiEnvelope<PublicLink[]>>("/links");
    return response.data.filter((item) => {
      try {
        return new URL(item.url).protocol === "https:";
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

export function formatDate(value: string | null): string {
  if (!value) return "未发布";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function formatProjectPeriod(
  startedAt: string | null,
  endedAt: string | null,
): string {
  if (!startedAt) return "持续维护";
  const year = (value: string) => new Date(`${value}T00:00:00Z`).getUTCFullYear();
  return `${year(startedAt)} — ${endedAt ? year(endedAt) : "至今"}`;
}
