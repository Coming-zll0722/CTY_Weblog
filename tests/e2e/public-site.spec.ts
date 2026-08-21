import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("visitor can move from the dashboard home to a complete article", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("可验证的解决路径");
  await page.getByRole("link", { name: "进入知识库" }).click();
  await expect(page).toHaveURL(/\/articles$/);
  const firstArticle = page.locator(".archive-list .article-row h2 a").first();
  const firstTitle = await firstArticle.innerText();
  await firstArticle.click();
  await expect(page).toHaveURL(/\/articles\/.+$/);
  await expect(page.getByRole("heading", { name: firstTitle, level: 1 })).toBeVisible();
  await expect(page.locator("article.prose")).not.toBeEmpty();
});

test("core public pages have no serious axe violations", async ({ page }) => {
  for (const route of ["/", "/articles", "/projects", "/about", "/admin"]) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((item) =>
      item.impact === "serious" || item.impact === "critical"
    );
    expect(serious, `${route}: ${serious.map((item) => item.id).join(", ")}`).toEqual([]);
  }
});
