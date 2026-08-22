"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { PublicSettings } from "@/lib/api";

const navigation = [
  ["总览", "/", "⌂"],
  ["文章", "/articles", "▤"],
  ["项目", "/projects", "◇"],
  ["技术栈", "/stack", "◫"],
  ["时间线", "/timeline", "↗"],
  ["关于", "/about", "○"],
  ["联系", "/contact", "@"],
] as const;

export function SiteFrame({
  children,
  settings,
}: {
  children: React.ReactNode;
  settings: PublicSettings;
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

  const currentSection = navigation.find(([, href]) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href),
  )?.[0] ?? "工作区";

  return (
    <div className="app-shell">
      <aside className={menuOpen ? "site-sidebar open" : "site-sidebar"}>
        <div className="sidebar-panel">
          <Link href="/" className="brand" aria-label={`${settings.siteName}首页`}>
            <span className="brand-logo" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/fromtouyue-brand.png" alt="" width={1365} height={601} />
            </span>
            <span className="brand-copy">
              <strong>{settings.siteName}</strong>
              <small>Engineering OS</small>
            </span>
          </Link>
          <nav
            ref={navRef}
            id="primary-navigation"
            className={menuOpen ? "main-nav open" : "main-nav"}
            aria-label="主导航"
          >
            {navigation.map(([label, href, icon]) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  className={active ? "active" : ""}
                  href={href}
                  key={href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="nav-icon" aria-hidden="true">{icon}</span>
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="sidebar-tools">
            <Link href="/search" className="sidebar-tool" aria-label="搜索">
              <span aria-hidden="true">⌕</span>
              <span>全局搜索</span>
            </Link>
            <button className="sidebar-tool" onClick={toggleTheme} aria-label="切换深浅色模式">
              <span aria-hidden="true">{theme === "light" ? "◐" : "☼"}</span>
              <span>{theme === "light" ? "深色模式" : "浅色模式"}</span>
            </button>
          </div>
          <div className="sidebar-filing">
            <span>合规信息</span>
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
              鲁ICP备2026044690号
            </a>
            <a
              href="https://beian.mps.gov.cn/#/query/webSearch?code=37088102000564"
              rel="noreferrer"
              target="_blank"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/beian-gongan.png" alt="" width={16} height={16} />
              鲁公网安备37088102000564号
            </a>
            <span className="sidebar-copyright">
              © {new Date().getFullYear()} {settings.authorName}
            </span>
          </div>
        </div>
      </aside>
      {menuOpen ? (
        <button className="sidebar-backdrop" aria-label="关闭侧栏遮罩" onClick={() => setMenuOpen(false)} />
      ) : null}
      <div className="site-workspace">
        <header className="workspace-header">
          <div>
            <span className="workspace-eyebrow">从头越 / KNOWLEDGE SYSTEM</span>
            <strong>{currentSection}</strong>
          </div>
          <div className="workspace-status">
            <Link className="workspace-admin-link" href="/admin" aria-label="管理员入口">
              ADMIN 管理入口
            </Link>
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
        </header>
        <main id="main-content">{children}</main>
        <footer className="site-footer">
          <div className="section-shell footer-grid">
            <div>
              <b>{settings.siteName}</b>
              <p>{settings.siteDescription}</p>
            </div>
            <div className="footer-quote" aria-label="欲与天公试比高？">
              <p>欲与天公试比高？</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
