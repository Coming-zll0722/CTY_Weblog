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
    const articles = (await page.locator(".home-recent").boundingBox())!;
    const projects = (await page.locator(".home-project").boundingBox())!;
    const focus = (await page.locator(".minimal-focus").boundingBox())!;
    expect(articles.y).toBeGreaterThan(about.y + about.height);
    expect(focus.y).toBeGreaterThan(Math.max(articles.y + articles.height, projects.y + projects.height));
    const updates = await page.locator(".minimal-focus li").evaluateAll((items) =>
      items.map((item) => item.getBoundingClientRect().top)
    );
    if (width > 700) {
      expect(about.x).toBeGreaterThan(hero.x + hero.width);
      expect(Math.abs(articles.y - projects.y)).toBeLessThan(1);
      expect(projects.x).toBeGreaterThan(articles.x + articles.width);
      expect(new Set(updates).size).toBe(1);
    } else {
      expect(about.y).toBeGreaterThan(hero.y + hero.height);
      expect(projects.y).toBeGreaterThan(articles.y + articles.height);
      expect(new Set(updates).size).toBe(updates.length);
    }
    if ([390, 1440].includes(width)) {
      const filename = `home-${width}-light.png`;
      await page.screenshot({ path: process.env.UI_SCREENSHOT_DIR ? path.join(process.env.UI_SCREENSHOT_DIR, filename) : testInfo.outputPath(filename), fullPage: true });
    }
  }
  expect(errors).toEqual([]);
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
