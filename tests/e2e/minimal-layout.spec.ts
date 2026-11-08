import { expect, test } from "@playwright/test";
import path from "node:path";

test("minimal home aligns columns, wraps real titles and preserves mobile order", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "近期文章", exact: true })).toBeVisible();
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1080 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px`).toBe(true);
    const hero = (await page.locator(".minimal-hero").boundingBox())!;
    const about = (await page.locator(".minimal-about").boundingBox())!;
    const articles = (await page.getByRole("region", { name: "近期文章" }).boundingBox())!;
    const stack = (await page.getByRole("region", { name: "技术栈" }).boundingBox())!;
    const projects = (await page.getByRole("region", { name: "代表项目" }).boundingBox())!;
    const focus = (await page.getByRole("region", { name: "最近在做" }).boundingBox())!;
    expect(articles.y).toBeGreaterThan(about.y + about.height);
    const updates = await page.locator(".minimal-focus li").evaluateAll((items) =>
      items.map((item) => item.getBoundingClientRect().top)
    );
    expect(updates).toHaveLength(3);
    expect(updates[0]).toBeLessThan(updates[1]);
    expect(updates[1]).toBeLessThan(updates[2]);
    if (width > 700) {
      expect(about.x).toBeGreaterThan(hero.x + hero.width);
      expect(stack.y).toBe(articles.y);
      expect(focus.y).toBe(projects.y);
      expect(projects.y).toBeGreaterThan(Math.max(articles.y + articles.height, stack.y + stack.height));
      expect(projects.x).toBe(articles.x);
      expect(projects.width).toBe(articles.width);
      expect(focus.x).toBe(stack.x);
      expect(focus.width).toBe(stack.width);
      expect(stack.x).toBeGreaterThan(articles.x + articles.width);
      expect(articles.width / stack.width).toBeCloseTo(width <= 900 ? 1.2 : 1.5, 2);
    } else {
      expect(about.y).toBeGreaterThan(hero.y + hero.height);
      expect(stack.y).toBeGreaterThan(articles.y + articles.height);
      expect(projects.y).toBeGreaterThan(stack.y + stack.height);
      expect(focus.y).toBeGreaterThan(projects.y + projects.height);
      for (const section of [stack, projects, focus]) {
        expect(section.x).toBe(articles.x);
        expect(section.width).toBe(articles.width);
      }
    }
    if ([390, 1440].includes(width)) {
      const filename = `home-${width}-light.png`;
      await page.screenshot({ path: process.env.UI_SCREENSHOT_DIR ? path.join(process.env.UI_SCREENSHOT_DIR, filename) : testInfo.outputPath(filename), fullPage: true });
    }
  }
  expect(errors).toEqual([]);
});

test("home links to the capability map and project archive", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "能力地图" }).click();
  await expect(page).toHaveURL(/\/stack$/);
  await expect(page.getByRole("heading", { level: 1, name: "能力地图" })).toBeVisible();

  await page.goto("/");
  await page.getByRole("region", { name: "代表项目" }).getByRole("link", { name: "查看全部" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.locator("main h1")).toBeVisible();
});

test("article, project and about archives share the visual system without overflow", async ({ page }, testInfo) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1080 });
    for (const route of ["articles", "projects", "about"]) {
      await page.goto(`/${route}`);
      await expect(page.locator("main h1")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const filename = `${route}-${width}-light.png`;
      await page.screenshot({ path: process.env.UI_SCREENSHOT_DIR ? path.join(process.env.UI_SCREENSHOT_DIR, filename) : testInfo.outputPath(filename), fullPage: true });
    }
  }
});
