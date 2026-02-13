import { test, expect } from "@playwright/test";

test.describe("layout", () => {
  test("header and navigation are present on all pages", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/nl\/$/);
    await expect(page.locator("header.site-header")).toBeVisible();
    await expect(page.locator(".site-title")).toBeVisible();
    await expect(page.locator("nav.sub-header")).toBeVisible();
    await expect(page.locator('.sub-header a[href="/nl/archive"]')).toBeVisible();
  });

  test("language switch is shown in the black top bar", async ({ page }) => {
    await page.goto("/nl/");
    await expect(page.locator(".top-bar .locale-switch")).toBeVisible();
    await expect(page.locator(".top-bar .locale-switch a.active")).toHaveText("NL");
  });

  test("mobile search takes over the sub-header row", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/nl/");

    const subHeader = page.locator("nav.sub-header");
    const searchToggle = page.locator(".site-search [data-search-toggle]");
    const searchInput = page.locator("[data-search-input]");
    await expect(searchToggle).toBeVisible();
    await expect(subHeader).not.toHaveClass(/sub-header--search-open/);

    await searchToggle.click();
    await expect(subHeader).toHaveClass(/sub-header--search-open/);
    await expect(searchInput).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(subHeader).not.toHaveClass(/sub-header--search-open/);
  });
});

test.describe("locale routing", () => {
  test("english locale pages render under /en", async ({ page }) => {
    await page.goto("/en/");
    await expect(page).toHaveURL(/\/en\/$/);
    await expect(page.locator('.sub-header a[href="/en/archive"]')).toBeVisible();
  });

  test("language switch preserves path and query", async ({ page }) => {
    await page.goto("/nl/archive?year=2024-2025&context=digital");
    await page.locator(".locale-switch a", { hasText: "EN" }).click();
    await expect(page).toHaveURL("/en/archive?year=2024-2025&context=digital");
  });

  test("legacy public routes redirect to /nl", async ({ page }) => {
    await page.goto("/about");
    await expect(page).toHaveURL("/nl/about");

    await page.goto("/2024-2025/students/alice-smith/");
    await expect(page).toHaveURL("/nl/2024-2025/students/alice-smith/");
  });
});

test.describe("localized content", () => {
  test("NL page shows Dutch navigation labels", async ({ page }) => {
    await page.goto("/nl/");
    const nav = page.locator("nav.sub-header");
    await expect(nav.locator('a[href="/nl/"]')).toHaveText("projecten");
    await expect(nav.locator('a[href="/nl/archive"]')).toHaveText("archief");
    await expect(nav.locator('a[href="/nl/about"]')).toHaveText("over");
  });

  test("EN page shows English navigation labels", async ({ page }) => {
    await page.goto("/en/");
    const nav = page.locator("nav.sub-header");
    await expect(nav.locator('a[href="/en/"]')).toHaveText("projects");
    await expect(nav.locator('a[href="/en/archive"]')).toHaveText("archive");
    await expect(nav.locator('a[href="/en/about"]')).toHaveText("about");
  });

  test("NL page shows Dutch context filter labels", async ({ page }) => {
    await page.goto("/nl/");
    const filters = page.locator(".context-nav");
    await expect(filters.locator("a").first()).toHaveText("alle");
    await expect(filters.locator("a", { hasText: "digitaal" })).toBeVisible();
    await expect(filters.locator("a", { hasText: "autonoom" })).toBeVisible();
  });

  test("EN page shows English context filter labels", async ({ page }) => {
    await page.goto("/en/");
    const filters = page.locator(".context-nav");
    await expect(filters.locator("a").first()).toHaveText("all");
    await expect(filters.locator("a", { hasText: "digital" })).toBeVisible();
    await expect(filters.locator("a", { hasText: "autonomous" })).toBeVisible();
  });

  test("NL project detail shows Dutch title and description", async ({ page }) => {
    await page.goto("/nl/2024-2025/students/alice-smith/");
    await expect(page.locator(".detail-project-title")).toHaveText("Digitale Dromen");
    await expect(page.locator(".detail-location")).toHaveText("Antwerpen, België");
  });

  test("EN project detail shows English title and description", async ({ page }) => {
    await page.goto("/en/2024-2025/students/alice-smith/");
    await expect(page.locator(".detail-project-title")).toHaveText("Digital Dreams");
    await expect(page.locator(".detail-location")).toHaveText("Antwerp, Belgium");
  });

  test("NL project card shows Dutch title in grid", async ({ page }) => {
    await page.goto("/nl/?context=digital");
    await expect(page.locator(".card-subtitle", { hasText: "Digitale Dromen" })).toBeVisible();
  });

  test("EN project card shows English title in grid", async ({ page }) => {
    await page.goto("/en/?context=digital");
    await expect(page.locator(".card-subtitle", { hasText: "Digital Dreams" })).toBeVisible();
  });

  test("switching language updates labels and content", async ({ page }) => {
    await page.goto("/nl/2024-2025/students/alice-smith/");
    await expect(page.locator(".detail-project-title")).toHaveText("Digitale Dromen");
    await expect(page.locator("nav.sub-header a").first()).toHaveText("projecten");

    await page.locator(".locale-switch a", { hasText: "EN" }).click();
    await expect(page).toHaveURL("/en/2024-2025/students/alice-smith/");
    await expect(page.locator(".detail-project-title")).toHaveText("Digital Dreams");
    await expect(page.locator("nav.sub-header a").first()).toHaveText("projects");
  });
});

test.describe("homepage", () => {
  test("renders current year at homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/nl\/$/);
    const firstCard = page.locator(".grid a.card").first();
    await expect(firstCard).toHaveAttribute("href", /\/nl\/\d{4}-\d{4}\/students\//);
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
    await page.goto("/nl/archive");
    await expect(page).toHaveTitle(/archief/i);
  });

  test("shows year and context filters", async ({ page }) => {
    await page.goto("/nl/archive");
    // Should have year nav and context nav
    await expect(page.locator(".year-nav")).toBeVisible();
    await expect(page.locator(".context-nav")).toBeVisible();
  });

  test("shows project grid", async ({ page }) => {
    await page.goto("/nl/archive");
    await expect(page.locator(".grid")).toBeVisible();
  });

  test("year filter navigation works", async ({ page }) => {
    await page.goto("/nl/archive");
    // Click on a year filter (not "All")
    const yearFilter = page.locator(".year-nav a").nth(1);
    await yearFilter.click();
    await expect(page).toHaveURL(/\?year=/);
  });

  test("navigating from nav link works", async ({ page }) => {
    await page.goto("/");
    await page.locator('.sub-header a[href="/nl/archive"]').click();
    await expect(page).toHaveURL("/nl/archive");
  });
});

test.describe("project detail page", () => {
  test("can navigate to project from grid", async ({ page }) => {
    await page.goto("/");
    // Click on the first project card (the card itself is an <a>)
    await page.locator(".grid a.card").first().click();
    // Should be on a detail page (URL pattern: /nl/YYYY-YYYY/students/slug/)
    await expect(page).toHaveURL(/\/nl\/\d{4}-\d{4}\/students\/[^/]+\//);
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
    await page.locator(".grid a.card").first().click();
    await page.locator(".back-link").click();
    await expect(page).toHaveURL(/\/nl\/$/);
  });
});
