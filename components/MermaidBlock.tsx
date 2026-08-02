"use client";

import { useEffect, useId, useState } from "react";

export function MermaidBlock({ chart }: { chart: string }) {
  const reactId = useId();
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<"dark" | "default">("default");

  useEffect(() => {
    const sync = () => setTheme(
      document.documentElement.dataset.theme === "dark" ? "dark" : "default",
    );
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    const id = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
    import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme,
        });
        const result = await mermaid.render(id, chart);
        if (active) {
          setError("");
          setSvg(result.svg);
        }
      })
      .catch(() => {
        if (active) {
          setSvg("");
          setError("图表语法无法解析。");
        }
      });
    return () => { active = false; };
  }, [chart, reactId, theme]);

  if (error) return <p className="diagram-error">{error}</p>;
  if (!svg) return <div className="diagram-loading">正在绘制图表…</div>;
  return (
    <div
      className="mermaid-diagram"
      role="img"
      aria-label="文章中的 Mermaid 图表"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
