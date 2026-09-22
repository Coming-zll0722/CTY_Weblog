/* Native images use the existing FastAPI variants or precompressed local WebP assets. */
/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PublicSettings } from "@/lib/api";
import type { LayoutMode } from "@/components/layout/LayoutChoice";
import {
  MobileNavigation,
  Sidebar,
  TopNavigation,
} from "@/components/layout/Navigation";

export function SiteFrame({
  children,
  settings,
}: {
  children: React.ReactNode;
  settings: PublicSettings;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [layout, setLayout] = useState<LayoutMode>("auto");
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const recoveryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (layout !== "desktop") return;
    const viewport = window.visualViewport;
    const recovery = recoveryRef.current;
    if (!viewport || !recovery) return;
    const positionRecovery = () => {
      recovery.style.top = `${Math.max(12, viewport.offsetTop + viewport.height - recovery.offsetHeight - 12)}px`;
      recovery.style.left = `${viewport.offsetLeft + 12}px`;
      recovery.style.maxWidth = `${Math.max(0, viewport.width - 24)}px`;
    };
    positionRecovery();
    viewport.addEventListener("resize", positionRecovery);
    viewport.addEventListener("scroll", positionRecovery);
    window.addEventListener("resize", positionRecovery);
    return () => {
      viewport.removeEventListener("resize", positionRecovery);
      viewport.removeEventListener("scroll", positionRecovery);
      window.removeEventListener("resize", positionRecovery);
    };
  }, [layout]);

  useEffect(() => {
    const next =
      document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const timer = window.setTimeout(() => {
      setTheme(next);
      setLayout(document.documentElement.dataset.layout === "desktop" ? "desktop" : "auto");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const trigger = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    navRef.current?.querySelector<HTMLElement>("button, a")?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
      if (event.key === "Tab") {
        const elements =
          navRef.current?.querySelectorAll<HTMLElement>("a, button");
        const first = elements?.[0];
        const last = elements?.[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const desktop = matchMedia("(min-width: 1024px)");
    const onResize = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener("change", onResize);
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", close);
      desktop.removeEventListener("change", onResize);
      if (trigger && getComputedStyle(trigger).display !== "none") trigger.focus();
    };
  }, [menuOpen]);

  function changeLayout(next: LayoutMode) {
    setLayout(next);
    document.documentElement.dataset.layout = next;
    try {
      localStorage.setItem("site-layout", next);
    } catch {
      /* The current page still changes when storage is unavailable. */
    }
    setMenuOpen(false);
    window.scrollTo({ left: 0, behavior: "instant" });
  }

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* Theme still works without storage. */
    }
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
  }

  return (
    <>
    <div className="site-layout">
    <div className="personal-site">
      <TopNavigation
        theme={theme}
        toggleTheme={toggleTheme}
        menuOpen={menuOpen}
        toggleMenu={() => setMenuOpen(!menuOpen)}
        buttonRef={menuButtonRef}
      />
      <div className="personal-body">
        <Sidebar layout={layout} onLayoutChange={changeLayout} />
        <div className="personal-main">
          <main id="main-content">{children}</main>
          <footer className="personal-footer">
            <div>
              <span>
                © {new Date().getFullYear()} {settings.authorName} ·{" "}
                {settings.siteName}
              </span>
              <Link href="/contact">联系与订阅 ↗</Link>
            </div>
            <div className="personal-filing">
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
              >
                鲁ICP备2026044690号
              </a>
              <a
                href="https://beian.mps.gov.cn/#/query/webSearch?code=37088102000564"
                target="_blank"
                rel="noreferrer"
              >
                <img src="/beian-gongan.png" alt="" width={16} height={16} />
                鲁公网安备37088102000564号
              </a>
            </div>
          </footer>
        </div>
      </div>
    </div>
    </div>
      <div className="layout-recovery" ref={recoveryRef}>
        <span>桌面布局 · 可左右滑动</span>
        <button type="button" onClick={() => changeLayout("auto")}>恢复自动布局</button>
      </div>
      <MobileNavigation
        open={menuOpen}
        navRef={navRef}
        onClose={() => setMenuOpen(false)}
        layout={layout}
        onLayoutChange={changeLayout}
      />
    </>
  );
}
