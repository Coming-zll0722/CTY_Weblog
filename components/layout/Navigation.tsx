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
  showIcons = true,
}: {
  group: "home" | "content" | "personal" | "all" | "primary";
  onNavigate?: () => void;
  showIcons?: boolean;
}) {
  const pathname = usePathname();
  return navigation
    .filter((item) => group === "primary" ? ["/", "/articles", "/projects", "/about"].includes(item.href) : group === "all" || item.group === group)
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
          {showIcons && <span className="rail-icon"><Icon name={item.icon} /></span>}
          <span>{group === "primary" && item.href === "/about" ? "关于" : item.label}</span>
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
  menuOpen,
  toggleMenu,
  buttonRef,
}: {
  menuOpen: boolean;
  toggleMenu: () => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <header className="personal-topbar">
      <Link href="/" className="personal-brand" aria-label="从头越首页">
        <strong>{homeProfile.brand}</strong>
        <small className="top-brand-domain">{homeProfile.domain}</small>
      </Link>
      <nav className="top-links" aria-label="顶部导航">
        <NavigationLinks group="primary" showIcons={false} />
        <Link className="nav-search" href="/search" aria-label="搜索"><Icon name="search" size={20} /></Link>
      </nav>
      <div className="top-tools">
        <Link className="tool-button compact-search" href="/search" aria-label="搜索">
          <Icon name="search" />
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
