import { test, expect } from "@playwright/test";
import { E2E_PROJECTS } from "./fixtures";

test.describe("admin projects table", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin");
    // Wait for projects table to load
    await expect(page.locator(".admin-list table")).toBeVisible();
  });

  test("shows projects in table", async ({ page }) => {
    // Should have table headers
    const headers = page.locator("thead th");
    await expect(headers.filter({ hasText: "Student name" })).toBeVisible();
    await expect(headers.filter({ hasText: "Project title" })).toBeVisible();
    await expect(headers.filter({ hasText: "Context" })).toBeVisible();
    await expect(headers.filter({ hasText: "Academic year" })).toBeVisible();
  });

  test("has expected columns and no id column", async ({ page }) => {
    // Should have exactly 4 columns
    const headers = page.locator("thead th");
    await expect(headers).toHaveCount(4);

    // Verify each expected column header
    await expect(headers.nth(0)).toHaveText("Student name");
    await expect(headers.nth(1)).toHaveText("Project title");
    await expect(headers.nth(2)).toHaveText("Context");
    await expect(headers.nth(3)).toHaveText("Academic year");
  });

  test("year filter works", async ({ page }) => {
    // Get initial row count
    const allRowsCount = await page.locator("tbody tr").count();

    // Select 2023-2024 year (should have 1 project)
    await page.locator(".filter-select").first().selectOption("2023-2024");

    // Wait for filter to apply
    await page.waitForTimeout(100);

    // Should have fewer rows (only Carol White is in 2023-2024)
    const filteredRowsCount = await page.locator("tbody tr").count();
    expect(filteredRowsCount).toBeLessThan(allRowsCount);

    // Should show Carol White's project
    await expect(page.locator("tbody")).toContainText("Carol White");
    await expect(page.locator("tbody")).not.toContainText("Alice Smith");
  });

  test("context filter works", async ({ page }) => {
    // First, select "All years" to see all projects
    await page.locator(".filter-select").first().selectOption("");

    // Select Digital Context (should have 1 project: Alice Smith)
    await page.locator(".filter-select").nth(1).selectOption("Digital Context");

    // Wait for filter to apply
    await page.waitForTimeout(100);

    // Should show Alice Smith's project
    await expect(page.locator("tbody")).toContainText("Alice Smith");
    await expect(page.locator("tbody")).toContainText("Digital Dreams");

    // Should not show Bob Jones (Autonomous Context)
    await expect(page.locator("tbody")).not.toContainText("Bob Jones");
  });

  test("search filter works", async ({ page }) => {
    // First, select "All years" to see all projects
    await page.locator(".filter-select").first().selectOption("");

    // Wait for filter to apply
    await page.waitForTimeout(200);

    // Click search button to expand
    await page.locator(".search-toggle").click();

    // Type in search - search for "Alice" which is in the default year
    await page.locator(".search-input").fill("Alice");

    // Wait for filter to apply
    await page.waitForTimeout(200);

    // Should only show Alice Smith
    await expect(page.locator("tbody")).toContainText("Alice Smith");
    await expect(page.locator("tbody")).not.toContainText("Carol White");
    await expect(page.locator("tbody")).not.toContainText("Bob Jones");
  });

  test("clicking row selects project", async ({ page }) => {
    // Click on first row
    const firstRow = page.locator("tbody tr").first();
    await firstRow.click();

    // Row should be selected
    await expect(firstRow).toHaveClass(/row-selected/);

    // Detail panel should show project info (class is admin-detail-panel)
    const detailPanel = page.locator(".admin-detail-panel");
    await expect(detailPanel).toBeVisible();
  });

  test("row shows status styling", async ({ page }) => {
    // First, select "All years" to see all projects
    await page.locator(".filter-select").first().selectOption("");

    // Bob Jones is draft status
    const draftRow = page.locator("tbody tr", { hasText: "Bob Jones" });
    await expect(draftRow).toHaveClass(/status-draft/);

    // Alice Smith is published
    const publishedRow = page.locator("tbody tr", { hasText: "Alice Smith" });
    await expect(publishedRow).toHaveClass(/status-published/);
  });
});
