import { getAllPosts, getPublicSettingsOrDefaults } from "@/lib/api";
import { getSiteOrigin } from "@/lib/site-origin";

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    "\"": "&quot;",
  })[character] ?? character);

export async function GET(request: Request) {
  const [articles, settings] = await Promise.all([
    getAllPosts(),
    getPublicSettingsOrDefaults(),
  ]);
  const base = getSiteOrigin(new URL(request.url).origin);
  const items = articles.map((item) => {
    const url = `${base}/articles/${encodeURIComponent(item.slug)}`;
    return [
      "<item>",
      `<title>${escapeXml(item.title)}</title>`,
      `<link>${escapeXml(url)}</link>`,
      `<guid>${escapeXml(url)}</guid>`,
      `<pubDate>${new Date(item.published_at ?? item.updated_at).toUTCString()}</pubDate>`,
      `<description>${escapeXml(item.summary)}</description>`,
      "</item>",
    ].join("");
  }).join("");
  const xml = [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<rss version=\"2.0\"><channel>",
    `<title>${escapeXml(settings.siteName)}</title>`,
    `<link>${escapeXml(base)}</link>`,
    `<description>${escapeXml(settings.seoDescription)}</description>`,
    items,
    "</channel></rss>",
  ].join("");
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
