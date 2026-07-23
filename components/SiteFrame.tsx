"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navigation = [
  ["文章", "/articles"],
  ["项目", "/projects"],
  ["技术栈", "/stack"],
  ["时间线", "/timeline"],
  ["关于", "/about"],
] as const;

export function SiteFrame({ children }: { children: React.ReactNode }) {
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
          <Link href="/" className="brand" aria-label="林序工程笔记首页">
            <span className="brand-mark">LX</span>
            <span>林序<span className="brand-muted"> / 工程笔记</span></span>
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
              aria-label="打开导航菜单"
              aria-expanded={menuOpen}
            >
              <i /><i />
            </button>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="section-shell footer-grid">
          <div>
            <Link href="/" className="brand footer-brand">
              <span className="brand-mark">LX</span>
              <span>林序 / 工程笔记</span>
            </Link>
            <p>记录技术实践、项目开发与持续学习。</p>
          </div>
          <div>
            <b>浏览</b>
            <Link href="/articles">文章</Link>
            <Link href="/projects">项目</Link>
            <Link href="/timeline">时间线</Link>
          </div>
          <div>
            <b>联系</b>
            <a href="https://github.com/" target="_blank" rel="noreferrer">GitHub ↗</a>
            <a href="mailto:hello@example.com">Email ↗</a>
            <a href="/rss.xml">RSS ↗</a>
          </div>
          <div className="footer-note">
            <span>© 2026 林序</span>
            <span>内容经过脱敏处理</span>
          </div>
        </div>
      </footer>
    </>
  );
}
