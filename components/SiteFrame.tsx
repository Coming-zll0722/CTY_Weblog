"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { PublicLink, PublicSettings } from "@/lib/api";

const navigation = [
  ["文章", "/articles"],
  ["项目", "/projects"],
  ["技术地图", "/stack"],
  ["时间线", "/timeline"],
  ["关于本站", "/about"],
] as const;

export function SiteFrame({
  children,
  settings,
  publicLinks,
}: {
  children: React.ReactNode;
  settings: PublicSettings;
  publicLinks: PublicLink[];
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const next =
      saved === "dark" || (!saved && matchMedia("(prefers-color-scheme: dark)").matches)
        ? "dark"
        : "light";
    document.documentElement.dataset.theme = next;
    const timer = window.setTimeout(() => setTheme(next), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen]);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.dataset.theme = next;
  }

  return (
    <>
      <header className="site-header">
        <div className="nav-shell">
          <Link href="/" className="brand" aria-label={`${settings.siteName}首页`}>
            <span className="brand-mark">{settings.brandMark}</span>
            <span>{settings.siteName}</span>
          </Link>
          <nav className={menuOpen ? "main-nav open" : "main-nav"} aria-label="主导航">
            {navigation.map(([label, href]) => (
              <Link
                className={pathname.startsWith(href) ? "active" : ""}
                href={href}
                key={href}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="nav-actions">
            <Link href="/search" className="icon-button" aria-label="搜索">⌕</Link>
            <button className="icon-button" onClick={toggleTheme} aria-label="切换深浅色模式">
              {theme === "light" ? "◐" : "☼"}
            </button>
            <button
              className="menu-button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "关闭导航菜单" : "打开导航菜单"}
              aria-expanded={menuOpen}
            >
              <i /><i />
            </button>
          </div>
        </div>
      </header>
      <main id="main-content">{children}</main>
      <footer className="site-footer">
        <div className="section-shell footer-grid">
          <div>
            <Link href="/" className="brand footer-brand">
              <span className="brand-mark">{settings.brandMark}</span>
              <span>{settings.siteName}</span>
            </Link>
            <p>{settings.siteDescription}</p>
          </div>
          <div>
            <b>内容索引</b>
            <Link href="/articles">文章</Link>
            <Link href="/projects">项目</Link>
            <Link href="/stack">技术地图</Link>
            <Link href="/timeline">时间线</Link>
          </div>
          <div>
            <b>关注更新</b>
            {settings.githubUrl ? (
              <a href={settings.githubUrl} target="_blank" rel="noreferrer">GitHub ↗</a>
            ) : null}
            {settings.contactEmail ? (
              <a href={`mailto:${settings.contactEmail}`}>Email ↗</a>
            ) : null}
            <a href="/rss.xml">RSS ↗</a>
            {publicLinks.slice(0, 3).map((item) => (
              <a href={item.url} target="_blank" rel="noreferrer" title={item.description ?? undefined} key={item.id}>
                {item.name} ↗
              </a>
            ))}
          </div>
          <div className="footer-note">
            <span>© {new Date().getFullYear()} {settings.authorName}</span>
            <span>写作、实验与持续修订</span>
          </div>
        </div>
      </footer>
    </>
  );
}
