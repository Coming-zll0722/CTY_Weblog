"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RefObject } from "react";
import { homeProfile, navigation } from "@/data/home";
import { Icon } from "@/components/ui/Icon";

function NavigationLinks({
  variant,
  onNavigate,
}: {
  variant: "top" | "side" | "mobile";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return navigation
    .filter((item) => variant === "mobile" || item[variant])
    .map((item) => {
      const active =
        item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
      return (
        <Link
          href={item.href}
          key={item.href}
          className={active ? "is-active" : undefined}
          aria-current={active ? "page" : undefined}
          onClick={onNavigate}
        >
          {variant !== "top" && (
            <span className="rail-icon">
              <Icon name={item.icon} />
            </span>
          )}
          <span>{item.label}</span>
        </Link>
      );
    });
}

export function TopNavigation({
  theme,
  toggleTheme,
  menuOpen,
  toggleMenu,
  buttonRef,
}: {
  theme: "light" | "dark";
  toggleTheme: () => void;
  menuOpen: boolean;
  toggleMenu: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <header className="personal-topbar">
      <Link href="/" className="personal-brand" aria-label="从头越首页">
        <svg
          width="40"
          height="42"
          viewBox="0 0 40 42"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M6 35C9 17 15 5 30 6M14 35c2-10 7-15 14-15"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="m20 34 5-5 5 5"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>
          <strong>{homeProfile.brand}</strong>
          <small>{homeProfile.domain}</small>
        </span>
      </Link>
      <nav className="top-links" aria-label="顶部导航">
        <NavigationLinks variant="top" />
      </nav>
      <div className="top-tools">
        <form action="/search" role="search" className="top-search">
          <Icon name="search" size={17} />
          <input
            name="q"
            maxLength={100}
            placeholder="搜索文章、项目或内容..."
            aria-label="搜索文章、项目或内容"
          />
          <button type="submit" aria-label="提交搜索">
            <Icon name="arrow" size={15} />
          </button>
        </form>
        <Link
          className="tool-button compact-search"
          href="/search"
          aria-label="搜索"
        >
          <Icon name="search" />
        </Link>
        <button
          className="theme-switch"
          onClick={toggleTheme}
          aria-label="切换深浅色模式"
          aria-pressed={theme === "dark"}
        >
          <span className={theme === "light" ? "selected" : ""}>
            <Icon name="sun" size={18} />
          </span>
          <span className={theme === "dark" ? "selected" : ""}>
            <Icon name="moon" size={18} />
          </span>
        </button>
        <Link
          className="tool-button admin-tool"
          href="/admin"
          aria-label="管理员入口"
          title="管理入口"
        >
          <Icon name="code" />
        </Link>
        <Link
          href="/about"
          className="profile-monogram"
          aria-label={`关于${homeProfile.name}`}
        >
          {homeProfile.name}
        </Link>
        <button
          ref={buttonRef}
          className="tool-button mobile-menu-trigger"
          onClick={toggleMenu}
          aria-label={menuOpen ? "关闭导航菜单" : "打开导航菜单"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
        >
          <Icon name={menuOpen ? "close" : "menu"} />
        </button>
      </div>
    </header>
  );
}

export function Sidebar() {
  return (
    <aside className="personal-sidebar">
      <nav aria-label="侧栏导航">
        <NavigationLinks variant="side" />
      </nav>
      <div className="rail-quote">
        <p>
          雄关漫道真如铁，
          <br />
          而今迈步从头越。
        </p>
        <span>—— 毛泽东</span>
      </div>
      <div className="rail-mountains" aria-hidden="true" />
    </aside>
  );
}

export function MobileNavigation({
  open,
  navRef,
  onClose,
}: {
  open: boolean;
  navRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="mobile-nav-layer">
      <button
        className="mobile-nav-backdrop"
        aria-label="关闭侧栏遮罩"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={navRef}
        className="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="导航菜单"
        id="mobile-navigation"
      >
        <div className="drawer-heading">
          <strong>从头越</strong>
          <button
            className="tool-button"
            onClick={onClose}
            aria-label="关闭导航"
          >
            <Icon name="close" />
          </button>
        </div>
        <nav aria-label="移动导航">
          <NavigationLinks variant="mobile" onNavigate={onClose} />
          <Link href="/contact" onClick={onClose}>
            <span className="rail-icon">
              <Icon name="mail" />
            </span>
            联系
          </Link>
        </nav>
        <p className="drawer-slogan">{homeProfile.slogan}</p>
      </div>
    </div>
  );
}
