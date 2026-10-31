import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import ContactPage from "@/app/contact/page";
import { defaultPublicSettings, getPublicSettingsOrDefaults, getPublicLinksOrEmpty } from "@/lib/api";

vi.mock("@/lib/api", async (original) => ({
  ...await original<typeof import("@/lib/api")>(),
  getPublicSettingsOrDefaults: vi.fn(),
  getPublicLinksOrEmpty: vi.fn(),
}));

test("contact page describes RSS accurately when no contact details are public", async () => {
  vi.mocked(getPublicSettingsOrDefaults).mockResolvedValue(defaultPublicSettings);
  vi.mocked(getPublicLinksOrEmpty).mockResolvedValue([]);
  render(await ContactPage());
  expect(screen.getByText(/目前提供 RSS 订阅/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "订阅 RSS" })).toHaveAttribute("href", "/rss.xml");
  expect(screen.queryByText(/正在配置/)).not.toBeInTheDocument();
});

test("configured public email remains available", async () => {
  vi.mocked(getPublicSettingsOrDefaults).mockResolvedValue({
    ...defaultPublicSettings, contactEmail: "public@example.com",
  });
  vi.mocked(getPublicLinksOrEmpty).mockResolvedValue([]);
  render(await ContactPage());
  expect(screen.getByRole("link", { name: "public@example.com" }))
    .toHaveAttribute("href", "mailto:public@example.com");
});
