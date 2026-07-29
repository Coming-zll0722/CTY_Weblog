import { publicApiBase } from "@/lib/api";

export type User = {
  id: string;
  email: string;
  display_name: string;
  role: string;
};

export type Taxonomy = {
  id: string;
  name: string;
  slug: string;
  description?: string;
};

export type TimelineItem = {
  id: string;
  event_date: string;
  title: string;
  description: string;
  event_type: string;
  is_public: boolean;
  sort_order: number;
};

export type SiteLink = {
  id: string;
  name: string;
  url: string;
  description: string | null;
  status: string;
  sort_order: number;
};

export type AdminMedia = {
  id: string;
  storage_key: string;
  original_name: string;
  alt_text: string | null;
};

type AdminApiEnvelope<T> = {
  data?: T;
  error?: { message?: string };
};

export const emptyPost = {
  title: "",
  slug: "",
  summary: "",
  content_md: "",
  confidentiality_checked: false,
  cover_media_id: "",
  category_id: "",
  tag_ids: "",
  seo_title: "",
  seo_description: "",
  status: "draft",
};

export const emptyProject = {
  title: "",
  slug: "",
  summary: "",
  content_md: "",
  background_md: "",
  problem_md: "",
  role_md: "",
  architecture_md: "",
  features_md: "",
  challenges_md: "",
  solutions_md: "",
  outcomes_md: "",
  next_steps_md: "",
  status: "active",
  confidentiality_note: "",
  is_public: false,
  confidentiality_checked: false,
  featured: false,
  sort_order: 0,
  started_at: "",
  ended_at: "",
  repo_url: "",
  demo_url: "",
  cover_media_id: "",
  screenshot_media_ids: "",
  related_post_ids: "",
  tag_ids: "",
};

export function parseIds(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function csrfFromCookie(): string {
  const match = document.cookie.match(/(?:^|;\s*)engineering_notes_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function adminRequest<T>(
  path: string,
  options: RequestInit = {},
  csrfToken = "",
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (csrfToken) headers.set("X-CSRF-Token", csrfToken);
  const response = await fetch(`${publicApiBase}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null) as AdminApiEnvelope<T> | null;
  if (!response.ok) {
    throw new Error(body?.error?.message ?? "请求失败，请稍后重试。");
  }
  if (!body || !("data" in body)) throw new Error("服务返回了无效响应。");
  return body.data as T;
}
