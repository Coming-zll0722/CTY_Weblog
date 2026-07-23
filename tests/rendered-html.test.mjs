import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the technical portfolio home page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html lang="zh-CN"/i);
  assert.match(html, /林序/);
  assert.match(html, /把复杂协议/);
  assert.match(html, /嵌入式通信协议自动化测试平台/);
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
});

test("serves RSS with stable article links", async () => {
  const response = await render("/rss.xml");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /application\/rss\+xml/i);
  assert.match(await response.text(), /tcp-udp-test-platform-design/);
});
