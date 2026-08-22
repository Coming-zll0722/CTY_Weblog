const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("real-api-smoke", Date.now().toString());
const { default: worker } = await import(workerUrl.href);

async function render(path) {
  const response = await worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  return { response, html: await response.text() };
}

const home = await render("/");
if (
  home.response.status !== 200
  || !home.html.includes("跨栈集成文章")
  || !home.html.includes("跨栈集成项目")
  || !home.html.includes("跨栈集成工程笔记")
) {
  throw new Error("real FastAPI content was not rendered on the React dashboard");
}

const contact = await render("/contact");
if (
  contact.response.status !== 200
  || !contact.html.includes("integration@example.com")
  || !contact.html.includes("跨栈工程资料")
) {
  throw new Error("real FastAPI contact settings were not rendered on the contact page");
}
console.log("real FastAPI -> React SSR integration: passed");
