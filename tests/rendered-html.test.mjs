import assert from "node:assert/strict";
import test from "node:test";

const post = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "从协议分析到自动化执行：网络测试工具的设计方法",
  slug: "tcp-udp-test-platform-design",
  summary: "网络测试工具的设计方法。",
  content_md: "# 示例正文\n\n## 安全渲染\n\n<script>alert('xss')</script>\n\n```python\nprint('ok')\n```\n\n```mermaid\nflowchart LR\n  API --> DB\n```",
  category: "测试工具开发",
  category_slug: "test-tools",
  category_id: null,
  tags: ["Python", "TCP"],
  tag_slugs: ["python", "tcp"],
  reading_time: 8,
  seo_title: null,
  seo_description: null,
  published_at: "2026-07-18T00:00:00Z",
  updated_at: "2026-07-21T00:00:00Z",
};

const project = {
  id: "22222222-2222-4222-8222-222222222222",
  title: "嵌入式通信协议自动化测试平台",
  slug: "protocol-test-platform",
  summary: "统一用例、数据帧、设备适配、断言与报告。",
  content_md: "# 项目",
  background_md: "重复测试需要统一入口。",
  problem_md: "",
  role_md: "架构设计与核心开发。",
  architecture_md: "",
  features_md: "",
  challenges_md: "",
  solutions_md: "",
  outcomes_md: "建立统一执行模型。",
  next_steps_md: "",
  confidentiality_note: "使用模拟数据。",
  status: "持续迭代",
  tags: ["Python", "FastAPI"],
  started_at: "2025-01-01",
  ended_at: null,
  repo_url: null,
  demo_url: null,
  is_public: true,
  confidentiality_checked: true,
  featured: true,
  sort_order: 0,
  version: 1,
  cover_media_id: null,
  cover: null,
  screenshots: [],
  screenshot_media_ids: [],
  related_posts: [],
  related_post_ids: [],
  deleted_at: null,
  updated_at: "2026-07-21T00:00:00Z",
};

function mockApi(input) {
  const url = new URL(typeof input === "string" ? input : input.url);
  if (!url.pathname.startsWith("/api/v1")) return null;
  if (url.pathname === "/api/v1/posts") {
    return Response.json({ success: true, data: [post], meta: { page: 1, page_size: 20, total: 1 } });
  }
  if (url.pathname === `/api/v1/posts/${post.slug}`) {
    return Response.json({ success: true, data: post });
  }
  if (url.pathname === "/api/v1/projects") {
    return Response.json({ success: true, data: [project], meta: { page: 1, page_size: 20, total: 1 } });
  }
  if (url.pathname === `/api/v1/projects/${project.slug}`) {
    return Response.json({ success: true, data: project });
  }
  if (url.pathname === "/api/v1/timelines") {
    return Response.json({ success: true, data: [] });
  }
  if (url.pathname === "/api/v1/settings/public") {
    return Response.json({
      success: true,
      data: {
        "public.site_name": "可配置工程笔记",
        "public.author_name": "测试作者",
        "public.brand_mark": "QA",
        "public.site_description": "由数据库设置驱动的站点说明。",
        "public.seo_description": "由数据库设置驱动的 SEO 描述。",
        "public.seo_keywords": ["工程测试", "可配置站点"],
        "public.contact_email": "settings@example.com",
        "public.github_url": "https://github.com/example",
        "public.footer_note": "公开设置已生效",
      },
    });
  }
  if (url.pathname === "/api/v1/links") {
    return Response.json({
      success: true,
      data: [{
        id: "44444444-4444-4444-8444-444444444444",
        name: "工程资料",
        url: "https://example.com/engineering",
        description: "公开资料",
      }],
    });
  }
  if (url.pathname === "/api/v1/categories" || url.pathname === "/api/v1/tags") {
    return Response.json({ success: true, data: [] });
  }
  return Response.json(
    { success: false, error: { code: "NOT_FOUND", message: "Not found" } },
    { status: 404 },
  );
}

async function render(path = "/", accept = "text/html") {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => mockApi(input) ?? originalFetch(input, init);
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  try {
    const { default: worker } = await import(workerUrl.href);
    const response = await worker.fetch(
      new Request(`http://localhost${path}`, { headers: { accept } }),
      { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
      { waitUntil() {}, passThroughOnException() {} },
    );
    const body = await response.arrayBuffer();
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("server-renders the technical publication home page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html lang="zh-CN"/i);
  assert.match(html, /测试作者/);
  assert.match(html, /可配置工程笔记/);
  assert.match(html, /settings@example\.com/);
  assert.match(html, /公开设置已生效/);
  assert.match(html, /工程资料/);
  assert.match(html, /记录技术/);
  assert.match(html, /嵌入式通信协议自动化测试平台/);
  assert.match(html, /2025 — 至今/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("server-renders core public routes", async () => {
  for (const [path, expected] of [
    ["/articles", "工程问题"],
    ["/projects", "完整实践"],
    ["/stack", "实际使用"],
    ["/about", "软硬件边界"],
  ]) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), new RegExp(expected));
  }
  const about = await render("/about");
  assert.match(await about.text(), /测试作者/);
});

test("serves RSS with stable article links", async () => {
  const response = await render("/rss.xml");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /application\/rss\+xml/i);
  const xml = await response.text();
  assert.match(xml, /tcp-udp-test-platform-design/);
  assert.match(xml, /可配置工程笔记/);
  assert.match(xml, /由数据库设置驱动的 SEO 描述/);
});

test("renders database Markdown without executable HTML", async () => {
  const response = await render("/articles/tcp-udp-test-platform-design");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /安全渲染/);
  assert.match(html, /language-python/);
  assert.match(html, /class="token keyword"/);
  assert.match(html, /"name":"测试作者"/);
  // Vinext emits its own inline bootstrap scripts. The security boundary here is
  // that untrusted Markdown cannot preserve or execute the submitted payload.
  assert.doesNotMatch(html, /alert\('xss'\)|&lt;script&gt;alert/i);
});

test("renders Mermaid Markdown during RSC client navigation", async () => {
  const response = await render(
    "/articles/tcp-udp-test-platform-design.rsc",
    "text/x-component",
  );
  assert.equal(response.status, 200);
  const payload = await response.text();
  assert.match(payload, /tcp-udp-test-platform-design/);
  assert.match(payload, /flowchart LR\\n  API --> DB/);
  assert.doesNotMatch(payload, /\[object Object\]/);
  assert.doesNotMatch(payload, /"digest":/);
});
