import { test, expect } from "@playwright/test";

for (const site of ["masters", "graduates"]) {
  test(`public search matches accents on ${site}`, async ({ page }) => {
    await page.goto(`/nl/?__site=${site}`);
    await page.locator("[data-search-toggle]").click();
    const input = page.locator("[data-search-input]");
    for (const query of ["Renee", "RENÉE", "Rene\u0301e", "Cafe"]) {
      await input.fill(query);
      await expect(page).toHaveURL(new RegExp(`search=${encodeURIComponent(query)}`));
      await expect(page.locator(".grid .card")).toHaveCount(1);
      await expect(page.locator(".grid .card")).toContainText("Renée Search");
      await expect(page.locator("[data-search-status]")).toHaveText("1 resultaat");
    }
  });
}
