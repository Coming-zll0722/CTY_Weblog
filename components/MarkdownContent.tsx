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
import { headingId } from "@/lib/markdown";

export function MarkdownContent({ source }: { source: string }) {
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
            return <MermaidBlock chart={String(child.props.children).trim()} />;
          }
          return (
            <CopyableCode text={String(child?.props.children ?? "")}>
              {children}
            </CopyableCode>
          );
        },
        img({ src, alt, title }) {
          return typeof src === "string"
            ? <ZoomableImage src={src} alt={alt ?? ""} title={title} />
            : null;
        },
        h2({ children }) {
          return <h2 id={headingId(String(children))}>{children}</h2>;
        },
        h3({ children }) {
          return <h3 id={headingId(String(children))}>{children}</h3>;
        },
      }}
    >
      {source}
    </ReactMarkdown>
  );
}
