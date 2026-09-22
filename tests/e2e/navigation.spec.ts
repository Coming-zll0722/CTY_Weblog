import { expect, test } from "@playwright/test";

test("compact desktop keeps navigation and all content visible", async ({ page }) => {
  await page.goto("/");
  for (const width of [320, 768, 980, 1023, 1024, 1100, 1280, 1536, 2560]) {
    await page.setViewportSize({ width, height: 800 });
    const sidebar = page.getByRole("navigation", { name: "侧栏导航" });
    if (width >= 1024) await expect(sidebar).toBeVisible();
    else await expect(sidebar).toBeHidden();
    await expect(page.locator(".hero-eyebrow span").last()).toBeVisible();
    for (const status of await page.locator(".goal-status").all()) await expect(status).toBeVisible();
    await expect(page.locator(".home-bento > section")).toHaveCount(9);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("touch browser can restore automatic layout after a saved desktop reload", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await page.goto(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8766");
    await page.getByRole("button", { name: "打开导航菜单" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "桌面", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: "恢复自动布局" }).tap();
    await expect(page.locator("html")).toHaveAttribute("data-layout", "auto");
    await expect(page.getByRole("button", { name: "打开导航菜单" })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("manual desktop persists through navigation and reload and can return to automatic", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "打开导航菜单" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "桌面", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "侧栏导航" })).toBeVisible();
  expect(await page.locator(".site-layout").evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(1280);
  await page.getByRole("navigation", { name: "侧栏导航" }).getByRole("link", { name: "文章", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-layout", "desktop");
  await page.evaluate(() => window.scrollTo(600, 0));
  await expect(page.getByRole("button", { name: "恢复自动布局" })).toBeInViewport();
  await page.getByRole("button", { name: "恢复自动布局" }).click();
  await expect(page.getByRole("navigation", { name: "侧栏导航" })).toBeHidden();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-layout", "auto");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("resizing to compact desktop closes the drawer and releases page scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 980, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "打开导航菜单" }).click();
  await page.setViewportSize({ width: 1024, height: 800 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.locator("body").evaluate((element) => element.style.overflow)).toBe("");
});

test("desktop navigation is complete, unique and reachable on a short screen", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 650 });
  await page.goto("/");
  await expect(page.getByRole("banner").getByRole("navigation")).toHaveCount(0);
  const sidebar = page.getByRole("navigation", { name: "侧栏导航" });
  await expect(sidebar.getByRole("link")).toHaveText(["首页", "文章", "项目", "笔记", "资源", "技术栈", "时间轴", "关于我"]);
  await sidebar.getByRole("link", { name: "关于我" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await sidebar.getByRole("link", { name: "技术栈" }).click();
  await expect(page).toHaveURL(/\/stack$/);
  await expect(sidebar.getByRole("link", { name: "技术栈" })).toHaveAttribute("aria-current", "page");
});

test("brand assets follow the saved theme and the browser tab uses the brand", async ({ page }) => {
  await page.goto("/");
  const brand = page.getByRole("banner").locator(".ip-brand-mark");
  await expect(brand.locator(".ip-brand-mark-light")).toBeVisible();
  await expect(brand.locator(".ip-brand-mark-dark")).toBeHidden();
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", /\/brand\/icon-light\.png$/);
  await page.getByRole("button", { name: "切换深浅色模式" }).click();
  await page.reload();
  await expect(brand.locator(".ip-brand-mark-dark")).toBeVisible();
  await expect(brand.locator(".ip-brand-mark-light")).toBeHidden();
  expect(await brand.locator(".ip-brand-mark-dark").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
});

test("mobile drawer includes the same sections and closes after navigation", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await page.getByRole("button", { name: "打开导航菜单" }).click();
  const drawer = page.getByRole("dialog", { name: "导航菜单" });
  await expect(drawer.getByRole("link")).toHaveText(["首页", "文章", "项目", "笔记", "资源", "技术栈", "时间轴", "关于我", "联系", "管理入口"]);
  await drawer.getByRole("link", { name: "技术栈" }).click();
  await expect(page).toHaveURL(/\/stack$/);
  await expect(drawer).toHaveCount(0);
});
