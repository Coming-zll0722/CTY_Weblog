import type { Heading, Root } from "mdast";
import { toString } from "mdast-util-to-string";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

export type MarkdownHeading = {
  level: 2 | 3;
  title: string;
  id: string;
};

function headingBase(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "section";
}

export function createHeadingIdFactory(): (title: string) => string {
  const counts = new Map<string, number>();
  return (title: string) => {
    const base = headingBase(title);
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}

export function headingId(title: string): string {
  return headingBase(title);
}

export function extractHeadings(source: string): MarkdownHeading[] {
  const tree = unified().use(remarkParse).parse(source) as Root;
  const nextId = createHeadingIdFactory();
  const headings: MarkdownHeading[] = [];
  visit(tree, "heading", (node: Heading) => {
    if (node.depth !== 1 && node.depth !== 2 && node.depth !== 3) return;
    const title = toString(node).trim();
    headings.push({ level: node.depth === 3 ? 3 : 2, title, id: nextId(title) });
  });
  return headings;
}
