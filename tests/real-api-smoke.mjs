const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("real-api-smoke", Date.now().toString());
const { default: worker } = await import(workerUrl.href);
const response = await worker.fetch(
  new Request("http://localhost/", { headers: { accept: "text/html" } }),
  { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} },
);
const html = await response.text();
if (
  response.status !== 200
  || !html.includes("跨栈集成文章")
  || !html.includes("跨栈集成项目")
  || !html.includes("跨栈集成工程笔记")
  || !html.includes("integration@example.com")
  || !html.includes("跨栈工程资料")
) {
  throw new Error("real FastAPI content was not rendered by the React frontend");
}
console.log("real FastAPI -> React SSR integration: passed");
