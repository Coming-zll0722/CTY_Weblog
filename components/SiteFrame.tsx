"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { PublicLink, PublicSettings } from "@/lib/api";

const navigation = [
  ["文章", "/articles"],
  ["项目", "/projects"],
  ["技术栈", "/stack"],
  ["时间线", "/timeline"],
  ["关于", "/about"],
  ["联系", "/contact"],
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
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const next =
      saved === "dark" || (!saved && matchMedia("(prefers-color-scheme: dark)").matches)
        ? "dark"
        : "light";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    const timer = window.setTimeout(() => setTheme(next), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    navRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
      if (event.key === "Tab") {
        const focusable = [
          ...(navRef.current?.querySelectorAll<HTMLAnchorElement>("a") ?? []),
          menuButtonRef.current,
        ].filter(Boolean) as HTMLElement[];
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
  }

  return (
    <>
      <header className="site-header">
        <div className="nav-shell">
          <Link href="/" className="brand" aria-label={`${settings.siteName}首页`}>
            <span className="brand-mark">{settings.brandMark}</span>
            <span>{settings.siteName}</span>
          </Link>
          <nav
            ref={navRef}
            id="primary-navigation"
            className={menuOpen ? "main-nav open" : "main-nav"}
            aria-label="主导航"
          >
            {navigation.map(([label, href]) => (
              <Link
                className={pathname.startsWith(href) ? "active" : ""}
                href={href}
                key={href}
                onClick={() => setMenuOpen(false)}
                aria-current={pathname.startsWith(href) ? "page" : undefined}
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
              ref={menuButtonRef}
              className="menu-button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "关闭导航菜单" : "打开导航菜单"}
              aria-expanded={menuOpen}
              aria-controls="primary-navigation"
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
            <b>浏览</b>
            <Link href="/articles">文章</Link>
            <Link href="/projects">项目</Link>
            <Link href="/timeline">时间线</Link>
            <Link href="/contact">联系</Link>
          </div>
          <div>
            <b>联系</b>
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
            <span>{settings.footerNote}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
