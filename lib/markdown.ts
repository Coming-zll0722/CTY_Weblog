export type MarkdownHeading = {
  level: 2 | 3;
  title: string;
  id: string;
};

export function headingId(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function extractHeadings(source: string): MarkdownHeading[] {
  return source
    .split(/\r?\n/)
    .map((line) => /^(##|###)\s+(.+?)\s*#*$/.exec(line))
    .filter((match): match is RegExpExecArray => Boolean(match))
    .map((match) => ({
      level: match[1].length as 2 | 3,
      title: match[2].trim(),
      id: headingId(match[2]),
    }));
}
