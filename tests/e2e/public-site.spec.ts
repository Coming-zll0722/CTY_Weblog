import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("visitor can move from the publication home to a complete article", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("可验证的问题");
  await page.getByRole("link", { name: "浏览工程文章" }).click();
  await expect(page).toHaveURL(/\/articles$/);
  await page.getByRole("link", { name: "跨栈集成文章", exact: true }).click();
  await expect(page.getByRole("heading", { name: "跨栈集成文章", level: 1 })).toBeVisible();
  await expect(page.locator("article.prose")).toContainText("跨栈集成");
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
