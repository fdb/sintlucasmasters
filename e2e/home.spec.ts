import { test, expect } from "@playwright/test";

// Localhost resolves to the graduates site by default. Existing tests target
// the masters chrome (legacy behaviour), so they pin themselves with
// ?__site=masters. Per-site behaviour is covered in the "site routing" block
// below.

test.describe("layout (masters chrome)", () => {
  test("header and navigation are present on all pages", async ({ page }) => {
    await page.goto("/?__site=masters");
    await expect(page).toHaveURL(/\/nl\/(\?__site=masters)?$/);
    await expect(page.locator("header.site-header")).toBeVisible();
    await expect(page.locator(".site-title")).toBeVisible();
    await expect(page.locator("nav.sub-header")).toBeVisible();
    await expect(page.locator('.sub-header a[href="/nl/archive"]')).toBeVisible();
  });

  test("language switch is shown in the black top bar", async ({ page }) => {
    await page.goto("/nl/?__site=masters");
    await expect(page.locator(".top-bar .locale-switch")).toBeVisible();
    await expect(page.locator(".top-bar .locale-switch a.active")).toHaveText("NL");
  });

  test("mobile search takes over the sub-header row", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/nl/?__site=masters");

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
    await page.goto("/en/?__site=masters");
    await expect(page).toHaveURL(/\/en\/(\?__site=masters)?$/);
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

    // Bare-year project URL → first redirects to /nl/, then again to the
    // programme-aware canonical URL once the project's programme is known.
    await page.goto("/2024-2025/students/alice-smith/");
    await expect(page).toHaveURL("/nl/2024-2025/ma-bk/students/alice-smith/");
  });

  test("pre-programme project URL redirects to programme-aware canonical", async ({ page }) => {
    await page.goto("/nl/2024-2025/students/alice-smith/");
    await expect(page).toHaveURL("/nl/2024-2025/ma-bk/students/alice-smith/");
  });

  test("URL with wrong programme redirects to canonical programme", async ({ page }) => {
    // Frida Lens is BA_FO; visiting under ma-bk should 301 to ba-fo.
    await page.goto("/nl/2024-2025/ma-bk/students/frida-lens/");
    await expect(page).toHaveURL("/nl/2024-2025/ba-fo/students/frida-lens/");
  });
});

test.describe("localized content (masters chrome)", () => {
  test("NL page shows Dutch navigation labels", async ({ page }) => {
    await page.goto("/nl/?__site=masters");
    const nav = page.locator("nav.sub-header");
    await expect(nav.locator('a[href="/nl/"]')).toHaveText("projecten");
    await expect(nav.locator('a[href="/nl/archive"]')).toHaveText("archief");
    await expect(nav.locator('a[href="/nl/about"]')).toHaveText("over");
  });

  test("EN page shows English navigation labels", async ({ page }) => {
    await page.goto("/en/?__site=masters");
    const nav = page.locator("nav.sub-header");
    await expect(nav.locator('a[href="/en/"]')).toHaveText("projects");
    await expect(nav.locator('a[href="/en/archive"]')).toHaveText("archive");
    await expect(nav.locator('a[href="/en/about"]')).toHaveText("about");
  });

  test("NL programme page shows Dutch context filter labels", async ({ page }) => {
    await page.goto("/nl/2024-2025/ma-bk/?__site=masters");
    const filters = page.locator(".context-nav");
    await expect(filters.locator("a").first()).toHaveText("alle");
    await expect(filters.locator("a", { hasText: "digitaal" })).toBeVisible();
    await expect(filters.locator("a", { hasText: "autonoom" })).toBeVisible();
  });

  test("EN programme page shows English context filter labels", async ({ page }) => {
    await page.goto("/en/2024-2025/ma-bk/?__site=masters");
    const filters = page.locator(".context-nav");
    await expect(filters.locator("a").first()).toHaveText("all");
    await expect(filters.locator("a", { hasText: "digital" })).toBeVisible();
    await expect(filters.locator("a", { hasText: "autonomous" })).toBeVisible();
  });

  test("NL project detail shows Dutch title and description", async ({ page }) => {
    await page.goto("/nl/2024-2025/ma-bk/students/alice-smith/");
    await expect(page.locator(".detail-project-title")).toHaveText("Digitale Dromen");
    await expect(page.locator(".detail-location")).toHaveText("Antwerpen, België");
  });

  test("EN project detail shows English title and description", async ({ page }) => {
    await page.goto("/en/2024-2025/ma-bk/students/alice-smith/");
    await expect(page.locator(".detail-project-title")).toHaveText("Digital Dreams");
    await expect(page.locator(".detail-location")).toHaveText("Antwerp, Belgium");
  });

  test("NL project card shows Dutch title in grid", async ({ page }) => {
    await page.goto("/nl/?__site=masters");
    await expect(page.locator(".card-subtitle", { hasText: "Digitale Dromen" })).toBeVisible();
  });

  test("EN project card shows English title in grid", async ({ page }) => {
    await page.goto("/en/?__site=masters");
    await expect(page.locator(".card-subtitle", { hasText: "Digital Dreams" })).toBeVisible();
  });

  test("switching language updates labels and content", async ({ page }) => {
    await page.goto("/nl/2024-2025/ma-bk/students/alice-smith/?__site=masters");
    await expect(page.locator(".detail-project-title")).toHaveText("Digitale Dromen");
    await expect(page.locator("nav.sub-header a").first()).toHaveText("projecten");

    await page.locator(".locale-switch a", { hasText: "EN" }).click();
    await expect(page).toHaveURL("/en/2024-2025/ma-bk/students/alice-smith/?__site=masters");
    await expect(page.locator(".detail-project-title")).toHaveText("Digital Dreams");
    await expect(page.locator("nav.sub-header a").first()).toHaveText("projects");
  });
});

test.describe("homepage (masters chrome)", () => {
  test("renders current year at homepage", async ({ page }) => {
    await page.goto("/?__site=masters");
    await expect(page).toHaveURL(/\/nl\/(\?__site=masters)?$/);
    const firstCard = page.locator(".grid a.card").first();
    await expect(firstCard).toHaveAttribute("href", /\/nl\/\d{4}-\d{4}\/[a-z-]+\/students\//);
  });

  test("shows project grid", async ({ page }) => {
    await page.goto("/?__site=masters");
    await expect(page.locator(".grid")).toBeVisible();
    await expect(page.locator(".grid .card").first()).toBeVisible();
  });

  test("project cards have expected structure", async ({ page }) => {
    await page.goto("/?__site=masters");
    const card = page.locator(".grid .card").first();
    await expect(card.locator("img")).toBeVisible();
    await expect(card.locator("h2")).toBeVisible();
    await expect(card.locator("p")).toBeVisible();
  });
});

test.describe("programme listing pages", () => {
  test("MA_BK listing shows context filters and only masters projects", async ({ page }) => {
    await page.goto("/nl/2024-2025/ma-bk/");
    const filters = page.locator(".context-nav");
    await expect(filters).toBeVisible();
    await expect(filters.locator("a")).toHaveCount(6); // All + 5 contexts
  });

  test("MA_BK + context page filters to that context", async ({ page }) => {
    await page.goto("/nl/2024-2025/ma-bk/digital/");
    // Active context chip should be "digitaal" (NL).
    await expect(page.locator(".context-nav a.active")).toHaveText("digitaal");
  });

  test("BA_FO listing has no context filter (no taxonomy)", async ({ page }) => {
    await page.goto("/nl/2024-2025/ba-fo/");
    await expect(page.locator(".context-nav")).toHaveCount(0);
  });

  test("Invalid programme slug returns 404", async ({ page }) => {
    const response = await page.goto("/nl/2024-2025/not-a-programme/");
    expect(response?.status()).toBe(404);
  });

  test("Invalid context slug returns 404", async ({ page }) => {
    const response = await page.goto("/nl/2024-2025/ma-bk/not-a-context/");
    expect(response?.status()).toBe(404);
  });

  test("Context route under non-context programme returns 404", async ({ page }) => {
    const response = await page.goto("/nl/2024-2025/ba-fo/digital/");
    expect(response?.status()).toBe(404);
  });
});

test.describe("site routing (host / __site override)", () => {
  test("default localhost site is graduates", async ({ page }) => {
    await page.goto("/nl/");
    // Graduates header has filter chips for the registered programmes.
    const nav = page.locator("nav.sub-header");
    await expect(nav.locator("a", { hasText: /^master$/ })).toBeVisible();
    await expect(nav.locator("a", { hasText: "fotografie" })).toBeVisible();
  });

  test("?__site=fotografie homepage shows only photography projects", async ({ page }) => {
    await page.goto("/nl/?__site=fotografie");
    // Frida Lens (BA_FO) is the only published photography project for 2024-2025.
    await expect(page.locator(".grid .card", { hasText: "Frida Lens" })).toBeVisible();
    // Alice Smith is MA_BK and must NOT show.
    await expect(page.locator(".grid .card", { hasText: "Alice Smith" })).toHaveCount(0);
  });

  test("?__site=masters homepage shows masters and premasters mixed", async ({ page }) => {
    await page.goto("/nl/?__site=masters");
    await expect(page.locator(".grid .card", { hasText: "Alice Smith" })).toBeVisible();
    await expect(page.locator(".grid .card", { hasText: "Milo Thread" })).toBeVisible();
    // Frida Lens is BA_FO and must NOT show on masters.
    await expect(page.locator(".grid .card", { hasText: "Frida Lens" })).toHaveCount(0);
  });

  test("graduates homepage shows all programmes", async ({ page }) => {
    await page.goto("/nl/?__site=graduates");
    await expect(page.locator(".grid .card", { hasText: "Alice Smith" })).toBeVisible();
    await expect(page.locator(".grid .card", { hasText: "Frida Lens" })).toBeVisible();
    await expect(page.locator(".grid .card", { hasText: "Milo Thread" })).toBeVisible();
  });

  test("project URL works on a non-primary domain (cross-domain access)", async ({ page }) => {
    // Frida Lens is BA_FO — primary site is fotografie. Access via masters
    // using the canonical programme-aware URL.
    await page.goto("/nl/2024-2025/ba-fo/students/frida-lens/?__site=masters");
    await expect(page.locator(".detail-project-title")).toHaveText("Lange Schaduwen");
    // Canonical must point to the primary (fotografie) domain.
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", /sintlucasfotografie\.com/);
  });

  test("graduates project meta prefixes context with programme", async ({ page }) => {
    // Alice Smith is MA_BK + digital. On graduates we want the prefixed label.
    // Page is /nl/ → Dutch context label ("Digitale context").
    await page.goto("/nl/2024-2025/ma-bk/students/alice-smith/?__site=graduates");
    await expect(page.locator(".detail-meta")).toContainText("Master Digitale context");
  });

  test("graduates project meta for BA_FO uses programme label only", async ({ page }) => {
    // Frida Lens is BA_FO. The schema's `context` column is irrelevant for
    // photography — we show the programme label instead.
    await page.goto("/nl/2024-2025/ba-fo/students/frida-lens/?__site=graduates");
    await expect(page.locator(".detail-meta")).toContainText("Professionele bachelor fotografie");
    await expect(page.locator(".detail-meta")).not.toContainText("Autonoom");
  });

  test("masters project meta keeps the flat context label (no programme prefix)", async ({ page }) => {
    // Same project on masters: programme is implicit from the domain, so we
    // don't repeat it in the meta line.
    await page.goto("/en/2024-2025/ma-bk/students/alice-smith/?__site=masters");
    await expect(page.locator(".detail-meta")).toContainText("Digital Context");
    await expect(page.locator(".detail-meta")).not.toContainText("Master Digital");
  });

  test("fotografie project meta uses programme label, drops spurious context", async ({ page }) => {
    await page.goto("/en/2024-2025/ba-fo/students/frida-lens/?__site=fotografie");
    await expect(page.locator(".detail-meta")).toContainText("Professional Bachelor Photography");
    await expect(page.locator(".detail-meta")).not.toContainText("Autonomous");
  });

  test("masters site title differs from fotografie site title", async ({ page }) => {
    await page.goto("/nl/?__site=masters");
    const mastersTitle = await page.title();
    expect(mastersTitle).toContain("Sint Lucas Masters");

    await page.goto("/nl/?__site=fotografie");
    const fotografieTitle = await page.title();
    expect(fotografieTitle).toContain("Sint Lucas Fotografie");
  });
});

test.describe("archive page", () => {
  test("shows archive heading", async ({ page }) => {
    await page.goto("/nl/archive?__site=masters");
    await expect(page).toHaveTitle(/archief/i);
  });

  test("shows year and context filters", async ({ page }) => {
    await page.goto("/nl/archive?__site=masters");
    await expect(page.locator(".year-nav")).toBeVisible();
    await expect(page.locator(".context-nav")).toBeVisible();
  });

  test("shows project grid", async ({ page }) => {
    await page.goto("/nl/archive?__site=masters");
    await expect(page.locator(".grid")).toBeVisible();
  });

  test("year filter navigation works", async ({ page }) => {
    await page.goto("/nl/archive?__site=masters");
    const yearFilter = page.locator(".year-nav a").nth(1);
    await yearFilter.click();
    await expect(page).toHaveURL(/\?(__site=masters&)?year=|year=.*&__site=masters/);
  });

  test("navigating from nav link works", async ({ page }) => {
    await page.goto("/?__site=masters");
    await page.locator('.sub-header a[href="/nl/archive"]').click();
    await expect(page).toHaveURL(/\/nl\/archive/);
  });
});

test.describe("project detail page", () => {
  test("can navigate to project from grid", async ({ page }) => {
    await page.goto("/?__site=masters");
    await page.locator(".grid a.card").first().click();
    await expect(page).toHaveURL(/\/nl\/\d{4}-\d{4}\/[a-z-]+\/students\/[^/]+\//);
  });

  test("shows back link", async ({ page }) => {
    await page.goto("/?__site=masters");
    await page.locator(".grid a.card").first().click();
    await expect(page.locator(".back-link")).toBeVisible();
  });

  test("shows project detail structure", async ({ page }) => {
    await page.goto("/?__site=masters");
    await page.locator(".grid a.card").first().click();
    const detail = page.locator(".detail");
    await expect(detail).toBeVisible();
    await expect(detail.locator(".detail-name")).toBeVisible();
    await expect(detail.locator(".detail-meta")).toBeVisible();
    await expect(detail.locator(".detail-hero img")).toBeVisible();
  });

  test("back link returns to year page", async ({ page }) => {
    await page.goto("/?__site=masters");
    await page.locator(".grid a.card").first().click();
    await page.locator(".back-link").click();
    await expect(page).toHaveURL(/\/nl\/(\?__site=masters)?$/);
  });
});
