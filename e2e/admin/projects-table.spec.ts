import { test, expect } from "@playwright/test";
test.describe("admin projects table", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator(".admin-list table")).toBeVisible({ timeout: 15000 });
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

  test("all years option stays selected", async ({ page }) => {
    const yearSelect = page.locator(".filter-select").first();

    await expect(yearSelect).toHaveValue("2024-2025");
    const defaultRowsCount = await page.locator("tbody tr").count();

    await yearSelect.selectOption("");
    await page.waitForTimeout(200);

    await expect(yearSelect).toHaveValue("");
    await expect(page.locator("tbody")).toContainText("Carol White");
    const allRowsCount = await page.locator("tbody tr").count();
    expect(allRowsCount).toBeGreaterThanOrEqual(defaultRowsCount);
  });

  test("context filter works", async ({ page }) => {
    // First, select "All years" to see all projects
    await page.locator(".filter-select").first().selectOption("");

    // Select Digital context (canonical key; should have 1 project: Alice Smith)
    // nth(2) because dropdowns are: year, programme, context
    await page.locator(".filter-select").nth(2).selectOption("digital");

    // Wait for filter to apply
    await page.waitForTimeout(100);

    // Should show Alice Smith's project
    await expect(page.locator("tbody")).toContainText("Alice Smith");
    await expect(page.locator("tbody")).toContainText("Digitale Dromen");

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

  test("deletes a project", async ({ page }) => {
    // First, select "All years" to see all projects
    await page.locator(".filter-select").first().selectOption("");

    // Click on Bob Jones' project (draft status, good candidate for deletion)
    const bobRow = page.locator("tbody tr", { hasText: "Bob Jones" });
    await bobRow.click();

    // Wait for detail panel to load
    await expect(page.locator(".admin-detail-panel")).toBeVisible();

    // Click delete button
    await page.locator(".detail-action-btn.danger", { hasText: "Delete" }).click();

    // Confirm dialog should appear
    const confirmDialog = page.locator(".confirm-overlay");
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog.locator("h3")).toHaveText("Delete project?");

    // Click confirm
    await confirmDialog.locator(".btn-danger").click();

    // Wait for dialog to close
    await expect(confirmDialog).not.toBeVisible();

    // Project should be removed from table
    await expect(page.locator("tbody")).not.toContainText("Bob Jones");

    // Detail panel should be empty
    await expect(page.locator(".admin-detail-empty")).toBeVisible();
  });
});
