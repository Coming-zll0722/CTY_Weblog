import { articles } from "@/data/site";

export async function GET() {
  const items = articles.map((item) => `<item><title><![CDATA[${item.title}]]></title><link>https://example.com/articles/${item.slug}</link><guid>https://example.com/articles/${item.slug}</guid><pubDate>${new Date(item.date).toUTCString()}</pubDate><description><![CDATA[${item.summary}]]></description></item>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>林序 · 工程笔记</title><link>https://example.com</link><description>嵌入式测试、工具开发与工程实践</description>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
