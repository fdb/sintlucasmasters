import { test, expect } from "@playwright/test";

test.describe("layout", () => {
  test("header and navigation are present on all pages", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("header.site-header")).toBeVisible();
    await expect(page.locator(".site-title")).toBeVisible();
    await expect(page.locator("nav.sub-header")).toBeVisible();
    await expect(page.locator('.sub-header a[href="/archive"]')).toBeVisible();
  });
});

test.describe("homepage", () => {
  test("redirects to current year", async ({ page }) => {
    await page.goto("/");
    // Should redirect to a year page (URL pattern: /YYYY-YYYY/)
    await expect(page).toHaveURL(/\/\d{4}-\d{4}\//);
  });

  test("shows context filters", async ({ page }) => {
    await page.goto("/");
    const filters = page.locator(".context-nav");
    await expect(filters).toBeVisible();
    // Should have "All" filter and context filters
    await expect(filters.locator("a")).toHaveCount(6); // All + 5 contexts
  });

  test("shows project grid", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".grid")).toBeVisible();
    // Should have at least one project card
    await expect(page.locator(".grid .card").first()).toBeVisible();
  });

  test("project cards have expected structure", async ({ page }) => {
    await page.goto("/");
    const card = page.locator(".grid .card").first();
    await expect(card.locator("img")).toBeVisible();
    await expect(card.locator("h2")).toBeVisible();
    await expect(card.locator("p")).toBeVisible();
  });

  test("context filter navigation works", async ({ page }) => {
    await page.goto("/");
    // Click on a context filter (not "All")
    const contextFilter = page.locator(".context-nav a").nth(1);
    await contextFilter.click();
    // URL should have context query param
    await expect(page).toHaveURL(/\?context=/);
    // "All" filter should not be active, clicked filter should be
    await expect(page.locator(".context-nav a.active")).toHaveCount(1);
  });
});

test.describe("archive page", () => {
  test("shows archive heading", async ({ page }) => {
    await page.goto("/archive");
    await expect(page).toHaveTitle(/Archive/);
  });

  test("shows year and context filters", async ({ page }) => {
    await page.goto("/archive");
    // Should have year nav and context nav
    await expect(page.locator(".year-nav")).toBeVisible();
    await expect(page.locator(".context-nav")).toBeVisible();
  });

  test("shows project grid", async ({ page }) => {
    await page.goto("/archive");
    await expect(page.locator(".grid")).toBeVisible();
  });

  test("year filter navigation works", async ({ page }) => {
    await page.goto("/archive");
    // Click on a year filter (not "All")
    const yearFilter = page.locator(".year-nav a").nth(1);
    await yearFilter.click();
    await expect(page).toHaveURL(/\?year=/);
  });

  test("navigating from nav link works", async ({ page }) => {
    await page.goto("/");
    await page.locator('.sub-header a[href="/archive"]').click();
    await expect(page).toHaveURL("/archive");
  });
});

test.describe("project detail page", () => {
  test("can navigate to project from grid", async ({ page }) => {
    await page.goto("/");
    // Click on the first project card (the card itself is an <a>)
    await page.locator(".grid a.card").first().click();
    // Should be on a detail page (URL pattern: /YYYY-YYYY/students/slug/)
    await expect(page).toHaveURL(/\/\d{4}-\d{4}\/students\/[^/]+\//);
  });

  test("shows back link", async ({ page }) => {
    await page.goto("/");
    await page.locator(".grid a.card").first().click();
    await expect(page.locator(".back-link")).toBeVisible();
  });

  test("shows project detail structure", async ({ page }) => {
    await page.goto("/");
    await page.locator(".grid a.card").first().click();
    const detail = page.locator(".detail");
    await expect(detail).toBeVisible();
    await expect(detail.locator(".detail-name")).toBeVisible();
    await expect(detail.locator(".detail-meta")).toBeVisible();
    await expect(detail.locator(".detail-hero img")).toBeVisible();
  });

  test("back link returns to year page", async ({ page }) => {
    await page.goto("/");
    const yearUrl = page.url();
    await page.locator(".grid a.card").first().click();
    await page.locator(".back-link").click();
    await expect(page).toHaveURL(yearUrl);
  });
});
