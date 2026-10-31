import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"] as const) {
  for (const width of [390, 1440]) {
    test(`public pages remain usable at ${width}px in ${theme} mode`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      for (const [route, title] of [
        ["/", "从头越"], ["/notes", "学习笔记"],
        ["/search?q=跨栈", "搜索"], ["/contact", "联系"],
      ]) {
        await page.goto(route);
        await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.getByText("页面暂时无法打开", { exact: true })).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (route.startsWith("/search")) {
          await expect(page.locator(".search-results")).toContainText("跨栈集成文章");
        }
        if (route === "/") {
          await expect(page.locator(".home-status, .home-learning")).toHaveCount(0);
          await page.screenshot({ path: testInfo.outputPath(`home-${width}-${theme}.png`), fullPage: true });
        }
        if (route === "/notes") {
          await expect(page.getByRole("heading", { name: "笔记正在整理" })).toBeVisible();
        }
      }
    });
  }
}
