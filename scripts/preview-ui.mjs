// Local UI preview with public content. No credentials or writes reach production.
import http from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const origin = "https://devlelin.xyz";
const frontendPort = 3011;
const previewPort = 3010;
const environment = { ...process.env, API_BASE_URL: `${origin}/api/v1`, NEXT_PUBLIC_API_BASE_URL: "/api/v1", HOST: "127.0.0.1", PORT: String(frontendPort) };
const build = spawnSync(process.execPath, ["node_modules/vinext/dist/cli.js", "build"], { stdio: "inherit", windowsHide: true, env: environment });
if (build.status !== 0) process.exit(build.status ?? 1);
// Existing Vinext 0.0.50 Windows asset-cache workaround, limited to generated output.
if (process.platform === "win32") {
  const cache = "dist/standalone/node_modules/vinext/dist/server/static-file-cache.js";
  const source = readFileSync(cache, "utf8");
  const needle = "return this.entries.get(pathname);";
  if (!source.includes(needle)) throw new Error("Vinext asset lookup changed; review the Windows preview shim.");
  writeFileSync(cache, source.replace(needle, 'return this.entries.get(pathname) ?? this.entries.get("/" + pathname.slice(1).replaceAll("/", "\\\\"));'));
}
const frontend = spawn(process.execPath, ["dist/standalone/server.js"], { stdio: "inherit", windowsHide: true, env: environment });
const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, `http://127.0.0.1:${previewPort}`);
  if (path.pathname.startsWith("/api/")) {
    if (path.pathname === "/api/v1/analytics/views" && req.method === "POST") {
      res.writeHead(204).end();
      return;
    }
    if (req.method !== "GET" || !/^\/api\/v1\/(posts|projects|categories|tags|timelines|search|links|media|settings\/public|health)(\/|$)/.test(path.pathname)) {
      res.writeHead(403).end("Public read-only preview");
      return;
    }
    try {
      const response = await fetch(`${origin}${path.pathname}${path.search}`, { headers: { Accept: req.headers.accept ?? "application/json" }, redirect: "manual", signal: AbortSignal.timeout(15000) });
      res.writeHead(response.status, { "Content-Type": response.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store" });
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      res.writeHead(502).end("Public content unavailable");
    }
    return;
  }
  const upstream = http.request({ host: "127.0.0.1", port: frontendPort, path: req.url, method: req.method, headers: req.headers }, (response) => {
    res.writeHead(response.statusCode, response.headers);
    response.pipe(res);
  });
  upstream.on("error", () => { if (!res.headersSent) res.writeHead(503); res.end("Preview is starting. Reload shortly."); });
  req.pipe(upstream);
});
server.listen(previewPort, "127.0.0.1", () => console.log(`Read-only public-content preview: http://127.0.0.1:${previewPort}`));
function stop() { server.close(); frontend.kill(); }
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
frontend.on("exit", () => server.close());
