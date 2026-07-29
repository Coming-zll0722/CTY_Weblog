import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { gzipSync } from "node:zlib";

const manifest = JSON.parse(
  readFileSync(new URL("../dist/client/.vite/manifest.json", import.meta.url), "utf8"),
);
const clientRoot = new URL("../dist/client/", import.meta.url);

function gzipSize(entry) {
  return gzipSync(readFileSync(new URL(entry.file, clientRoot))).length;
}

function staticGraph(entryKey, visited = new Set()) {
  if (visited.has(entryKey)) return visited;
  visited.add(entryKey);
  for (const imported of manifest[entryKey]?.imports ?? []) {
    staticGraph(imported, visited);
  }
  return visited;
}

test("keeps the shared browser entry below the gzip performance budget", () => {
  const graph = staticGraph("virtual:vinext-app-browser-entry");
  const total = [...graph].reduce((size, key) => size + gzipSize(manifest[key]), 0);
  assert.ok(total <= 110_000, `initial shared graph is ${total} bytes gzip`);
});

test("keeps heavy Markdown and Mermaid runtimes out of the initial graph", () => {
  const browserEntry = manifest["virtual:vinext-app-browser-entry"];
  assert.ok(browserEntry.dynamicImports.includes("components/AdminApp.tsx"));
  assert.ok(browserEntry.dynamicImports.includes("components/MermaidBlock.tsx"));

  const admin = manifest["components/AdminApp.tsx"];
  assert.ok(admin.dynamicImports.includes("components/MarkdownContent.tsx"));
  assert.ok(gzipSize(manifest["components/MarkdownContent.tsx"]) <= 210_000);

  const mermaid = manifest["components/MermaidBlock.tsx"];
  assert.ok(
    mermaid.dynamicImports.includes("node_modules/mermaid/dist/mermaid.core.mjs"),
  );
});
