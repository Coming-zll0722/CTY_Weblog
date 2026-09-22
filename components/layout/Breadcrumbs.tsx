import Link from "next/link";

export function Breadcrumbs({ section, href, title }: { section: string; href: string; title: string }) {
  return (
    <nav className="page-breadcrumbs" aria-label="当前位置">
      <Link href={href}>{section}</Link>
      <span aria-hidden="true">›</span>
      <span aria-current="page">{title}</span>
    </nav>
  );
}
