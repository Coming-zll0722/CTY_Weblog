import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.cookie = "engineering_notes_csrf=; Max-Age=0; path=/";
  document.cookie = "engineering_notes_session=; Max-Age=0; path=/";
  document.documentElement.removeAttribute("data-theme");
  vi.useRealTimers();
});
