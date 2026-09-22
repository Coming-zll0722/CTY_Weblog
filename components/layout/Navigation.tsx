"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RefObject } from "react";
import { homeProfile, navigation } from "@/data/home";
import { Icon } from "@/components/ui/Icon";
import { BrandMark } from "@/components/ui/BrandMark";
import { LayoutChoice, type LayoutMode } from "./LayoutChoice";

function NavigationLinks({
  group,
  onNavigate,
}: {
  group: "home" | "content" | "personal";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return navigation
    .filter((item) => item.group === group)
    .map((item) => {
      const active =
        item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
      return (
        <Link
          href={item.href}
          key={item.href}
          className={active ? "is-active" : undefined}
          aria-current={active ? "page" : undefined}
          onClick={onNavigate}
        >
          <span className="rail-icon"><Icon name={item.icon} /></span>
          <span>{item.label}</span>
        </Link>
      );
    });
}

function NavigationGroups({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="navigation-group"><NavigationLinks group="home" onNavigate={onNavigate} /></div>
      <div className="navigation-group" role="group" aria-label="内容">
        <p className="navigation-group-label" aria-hidden="true">内容</p>
        <NavigationLinks group="content" onNavigate={onNavigate} />
      </div>
      <div className="navigation-group" role="group" aria-label="个人">
        <p className="navigation-group-label" aria-hidden="true">个人</p>
        <NavigationLinks group="personal" onNavigate={onNavigate} />
      </div>
    </>
  );
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
        <BrandMark />
        <span>
          <strong>{homeProfile.brand}</strong>
          <small>{homeProfile.domain}</small>
        </span>
      </Link>
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

export function Sidebar({ layout, onLayoutChange }: { layout: LayoutMode; onLayoutChange: (mode: LayoutMode) => void }) {
  return (
    <aside className="personal-sidebar">
      <nav aria-label="侧栏导航">
        <NavigationGroups />
      </nav>
      <LayoutChoice mode={layout} onChange={onLayoutChange} />
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
  layout,
  onLayoutChange,
}: {
  open: boolean;
  navRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  layout: LayoutMode;
  onLayoutChange: (mode: LayoutMode) => void;
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
          <span className="drawer-brand"><BrandMark /><strong>从头越</strong></span>
          <button
            className="tool-button"
            onClick={onClose}
            aria-label="关闭导航"
          >
            <Icon name="close" />
          </button>
        </div>
        <nav aria-label="移动导航">
          <NavigationGroups onNavigate={onClose} />
          <Link href="/contact" onClick={onClose}>
            <span className="rail-icon">
              <Icon name="mail" />
            </span>
            联系
          </Link>
        </nav>
        <Link className="drawer-admin" href="/admin" onClick={onClose}>管理入口</Link>
        <LayoutChoice mode={layout} onChange={onLayoutChange} />
        <p className="drawer-slogan">{homeProfile.slogan}</p>
      </div>
    </div>
  );
}
