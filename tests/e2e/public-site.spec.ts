import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("visitor can move from the dashboard home to a complete article", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("从头越");
  await page.getByRole("link", { name: "阅读最新文章" }).click();
  await expect(page).toHaveURL(/\/articles$/);
  const firstArticle = page.locator(".archive-list .article-row h2 a").first();
  const firstTitle = await firstArticle.innerText();
  await firstArticle.click();
  await expect(page).toHaveURL(/\/articles\/.+$/);
  await expect(page.getByRole("heading", { name: firstTitle, level: 1 })).toBeVisible();
  await expect(page.locator("article.prose")).not.toBeEmpty();
});

test("core public pages have no serious axe violations", async ({ page }) => {
  for (const route of ["/", "/articles", "/projects", "/notes", "/resources", "/about", "/admin"]) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((item) =>
      item.impact === "serious" || item.impact === "critical"
    );
    expect(serious, `${route}: ${serious.map((item) => item.id).join(", ")}`).toEqual([]);
  }
});

test("home adapts across breakpoints without overflow or browser errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  for (const width of [320, 375, 390, 768, 1024, 1279, 1280, 1440, 1536, 1920]) {
    await page.setViewportSize({ width, height: 1024 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), { message: `${width}px overflow` }).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("mobile navigation restores focus and keeps project before status", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const project = await page.locator(".home-project").boundingBox();
  const status = await page.locator(".home-status").boundingBox();
  expect(project!.y).toBeLessThan(status!.y);
  const trigger = page.getByRole("button", { name: "打开导航菜单" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "导航菜单" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "关闭导航" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("link", { name: "联系" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("link", { name: "资源" }).click();
  await expect(page).toHaveURL(/\/resources$/);
  await expect(page.getByRole("heading", { level: 1, name: "资源" })).toBeVisible();
});

test("home theme persists and chart periods work without claiming live data", async ({ page }) => {
  await page.goto("/");
  const theme = page.getByRole("button", { name: "切换深浅色模式" });
  await theme.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "本月", exact: true }).click();
  await expect(page.getByText("112h", { exact: true })).toBeVisible();
  await expect(page.getByText("计划示例", { exact: true })).toHaveCount(2);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""))).toEqual([]);
});

test("top search reaches the existing search page with its query", async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.goto("/");
  await page.getByRole("textbox", { name: "搜索文章、项目或内容" }).fill("测试");
  await page.getByRole("button", { name: "提交搜索" }).click();
  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page.getByRole("textbox", { name: "搜索文章和项目" })).toHaveValue("测试");
});
