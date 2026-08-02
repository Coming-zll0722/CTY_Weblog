import { isValidElement, ReactElement, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypePrism from "rehype-prism-plus/common";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { MermaidBlock } from "@/components/MermaidBlock";
import { CopyableCode } from "@/components/CopyableCode";
import { ZoomableImage } from "@/components/ZoomableImage";
import { createHeadingIdFactory } from "@/lib/markdown";

function nodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") {
    return String(node);
  }
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement(node)) {
    return nodeText((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return "";
}

export function MarkdownContent({ source }: { source: string }) {
  const nextHeadingId = createHeadingIdFactory();
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeSanitize, rehypeKatex, [rehypePrism, { ignoreMissing: true }]]}
      components={{
        pre({ children }) {
          const child = isValidElement(children)
            ? children as ReactElement<{ className?: string; children?: ReactNode }>
            : null;
          if (child?.props.className?.includes("language-mermaid")) {
            return <MermaidBlock chart={nodeText(child.props.children).trim()} />;
          }
          return (
            <CopyableCode text={nodeText(child?.props.children)}>
              {children}
            </CopyableCode>
          );
        },
        img({ src, alt, title }) {
          return typeof src === "string"
            ? <ZoomableImage src={src} alt={alt ?? ""} title={title} />
            : null;
        },
        h1({ children }) {
          return <h2 id={nextHeadingId(nodeText(children))}>{children}</h2>;
        },
        h2({ children }) {
          return <h2 id={nextHeadingId(nodeText(children))}>{children}</h2>;
        },
        h3({ children }) {
          return <h3 id={nextHeadingId(nodeText(children))}>{children}</h3>;
        },
      }}
    >
      {source}
    </ReactMarkdown>
  );
}
