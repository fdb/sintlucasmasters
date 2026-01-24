import { test, expect } from "@playwright/test";

test.describe("admin projects table", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin");
    // Wait for projects table to load
    await expect(page.locator(".admin-list table")).toBeVisible();
  });

  test("shows projects in table", async ({ page }) => {
    // Should have table headers
    const headers = page.locator("thead th");
    await expect(headers.filter({ hasText: "Student" })).toBeVisible();
    await expect(headers.filter({ hasText: "Project" })).toBeVisible();
    await expect(headers.filter({ hasText: "Context" })).toBeVisible();
    await expect(headers.filter({ hasText: "Year" })).toBeVisible();
  });

  test("has expected columns", async ({ page }) => {
    // Should have 6 columns (Student, Project, Context, Year, Status, Updated)
    const headers = page.locator("thead th");
    await expect(headers).toHaveCount(6);

    // Verify expected column headers
    await expect(headers.nth(0)).toHaveText("Student");
    await expect(headers.nth(1)).toHaveText("Project");
    await expect(headers.nth(2)).toHaveText("Context");
    await expect(headers.nth(3)).toHaveText("Year");
    await expect(headers.nth(4)).toHaveText("Status");
    await expect(headers.nth(5)).toHaveText("Updated");
  });

  test("year filter works", async ({ page }) => {
    // Get initial row count
    const allRowsCount = await page.locator("tbody tr").count();

    // Select 2023-2024 year using the year filter select
    const yearSelect = page.locator('select[name="year"]');
    await yearSelect.selectOption("2023-2024");

    // Wait for page to reload with filter
    await page.waitForURL(/year=2023-2024/);

    // Should have fewer rows (only Carol White is in 2023-2024)
    const filteredRowsCount = await page.locator("tbody tr").count();
    expect(filteredRowsCount).toBeLessThan(allRowsCount);

    // Should show Carol White's project
    await expect(page.locator("tbody")).toContainText("Carol White");
  });

  test("status filter works", async ({ page }) => {
    // Select draft status
    const statusSelect = page.locator('select[name="status"]');
    await statusSelect.selectOption("draft");

    // Wait for page to reload with filter
    await page.waitForURL(/status=draft/);

    // Should show Bob Jones's draft project
    await expect(page.locator("tbody")).toContainText("Bob Jones");
  });

  test("search filter works", async ({ page }) => {
    // Type in search input
    const searchInput = page.locator('.search-input[name="q"]');
    await searchInput.fill("Alice");
    await searchInput.press("Enter");

    // Wait for page to reload with search
    await page.waitForURL(/q=Alice/);

    // Should only show Alice Smith
    await expect(page.locator("tbody")).toContainText("Alice Smith");
  });

  test("clicking row navigates to project detail", async ({ page }) => {
    // Click on first row
    const firstRow = page.locator("tbody tr").first();
    await firstRow.click();

    // Should navigate to project detail page
    await expect(page).toHaveURL(/\/admin\/projects\/[^/]+$/);

    // Detail panel should show project info
    await expect(page.locator(".admin-detail-panel")).toBeVisible();
  });

  test("row shows status styling", async ({ page }) => {
    // Bob Jones is draft status
    const draftRow = page.locator("tbody tr", { hasText: "Bob Jones" });
    await expect(draftRow).toHaveClass(/status-draft/);

    // Alice Smith is published
    const publishedRow = page.locator("tbody tr", { hasText: "Alice Smith" });
    await expect(publishedRow).toHaveClass(/status-published/);
  });

  test("deletes a project", async ({ page }) => {
    // Click on Bob Jones' project (draft status, good candidate for deletion)
    const bobRow = page.locator("tbody tr", { hasText: "Bob Jones" });
    await bobRow.click();

    // Wait for detail page to load
    await expect(page).toHaveURL(/\/admin\/projects\/[^/]+$/);

    // Navigate to edit page
    await page.locator(".detail-action-btn", { hasText: "Edit" }).click();

    // Wait for edit page
    await expect(page).toHaveURL(/\/edit$/);

    // Set up dialog handler before clicking delete
    page.on("dialog", (dialog) => dialog.accept());

    // Click delete button
    await page.locator("#delete-project-btn").click();

    // Wait for redirect to admin list (with longer timeout for API call + redirect)
    await expect(page).toHaveURL(/\/admin$/, { timeout: 10000 });

    // Project should be removed from table
    await expect(page.locator("tbody")).not.toContainText("Bob Jones");
  });
});
