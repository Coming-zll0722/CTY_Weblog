"use client";

import { useEffect, useId, useState } from "react";

export function MermaidBlock({ chart }: { chart: string }) {
  const reactId = useId();
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const id = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
    import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: document.documentElement.dataset.theme === "dark" ? "dark" : "default",
        });
        const result = await mermaid.render(id, chart);
        if (active) setSvg(result.svg);
      })
      .catch(() => { if (active) setError("图表语法无法解析。"); });
    return () => { active = false; };
  }, [chart, reactId]);

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
