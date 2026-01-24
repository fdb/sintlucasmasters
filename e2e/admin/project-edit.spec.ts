import { test, expect } from "@playwright/test";

test.describe("admin project editing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin");
    // Wait for projects table to load
    await expect(page.locator(".admin-list table")).toBeVisible();
  });

  test("clicking row navigates to project detail", async ({ page }) => {
    // Click first row
    const firstRow = page.locator("tbody tr").first();
    await firstRow.click();

    // Should navigate to project detail page
    await expect(page).toHaveURL(/\/admin\/projects\/[^/]+$/);

    // Should see project details
    await expect(page.locator(".detail-header-row h3")).toBeVisible();
  });

  test("edit page has all sections", async ({ page }) => {
    // Navigate to a project edit page
    await page.locator("tbody tr").first().click();
    await page.locator(".detail-action-btn", { hasText: "Edit" }).click();

    // Should be on edit page
    await expect(page).toHaveURL(/\/admin\/projects\/[^/]+\/edit/);

    // Check all sections are present
    await expect(page.locator(".edit-section-title", { hasText: "Identity" })).toBeVisible();
    await expect(page.locator(".edit-section-title", { hasText: "Status" })).toBeVisible();
    await expect(page.locator(".edit-section-title", { hasText: "Bio & Description" })).toBeVisible();
    await expect(page.locator(".edit-section-title", { hasText: "Tags" })).toBeVisible();
    await expect(page.locator(".edit-section-title", { hasText: "Social Links" })).toBeVisible();
    await expect(page.locator(".edit-section-title", { hasText: "Images" })).toBeVisible();
  });

  test("can edit student name field", async ({ page }) => {
    // Navigate to edit page
    await page.locator("tbody tr").first().click();
    await page.locator(".detail-action-btn", { hasText: "Edit" }).click();

    // Find student name input
    const studentNameInput = page.locator("#student_name");
    await expect(studentNameInput).toBeVisible();

    // Clear and type new value
    await studentNameInput.clear();
    await studentNameInput.fill("Test Student Name");
    await expect(studentNameInput).toHaveValue("Test Student Name");
  });

  test("status buttons toggle correctly", async ({ page }) => {
    // Navigate to edit page
    await page.locator("tbody tr").first().click();
    await page.locator(".detail-action-btn", { hasText: "Edit" }).click();

    // Find status buttons (first project is "published" per seed data)
    const draftBtn = page.locator(".edit-status-option", { hasText: "draft" });
    const publishedBtn = page.locator(".edit-status-option", { hasText: "published" });

    // Published should be active initially (first project is Alice Smith, status: published)
    await expect(publishedBtn).toHaveClass(/active/);

    // Click draft - it should become active
    await draftBtn.click();
    await expect(draftBtn).toHaveClass(/active/);
    await expect(publishedBtn).not.toHaveClass(/active/);
  });

  test("tags input accepts comma-separated values", async ({ page }) => {
    // Navigate to edit page
    await page.locator("tbody tr").first().click();
    await page.locator(".detail-action-btn", { hasText: "Edit" }).click();

    // Find tags input
    const tagsInput = page.locator("#tags");
    await expect(tagsInput).toBeVisible();

    // Get current value
    const currentValue = await tagsInput.inputValue();

    // Add a new tag
    await tagsInput.clear();
    await tagsInput.fill(currentValue + ", newtag");

    // Should have new value
    await expect(tagsInput).toHaveValue(currentValue + ", newtag");
  });

  test("cancel button goes back to detail page", async ({ page }) => {
    // Navigate to edit page
    await page.locator("tbody tr").first().click();
    await page.locator(".detail-action-btn", { hasText: "Edit" }).click();

    // Should be on edit page
    await expect(page).toHaveURL(/\/admin\/projects\/[^/]+\/edit/);

    // Click cancel
    await page.locator(".btn-secondary", { hasText: "Cancel" }).click();

    // Should be back on detail page (not list page)
    await expect(page).toHaveURL(/\/admin\/projects\/[^/]+$/);
    await expect(page).not.toHaveURL(/\/edit$/);
  });

  test("can select context from dropdown", async ({ page }) => {
    // Navigate to edit page
    await page.locator("tbody tr").first().click();
    await page.locator(".detail-action-btn", { hasText: "Edit" }).click();

    // Find context select
    const contextSelect = page.locator("#context");
    await expect(contextSelect).toBeVisible();

    // Select a different context
    await contextSelect.selectOption("Applied Context");
    await expect(contextSelect).toHaveValue("Applied Context");
  });

  test("save button submits form and shows success", async ({ page }) => {
    // Navigate to edit page
    await page.locator("tbody tr").first().click();
    await page.locator(".detail-action-btn", { hasText: "Edit" }).click();

    // Make a small change
    const descriptionInput = page.locator("#description");
    await descriptionInput.fill("Updated description for test");

    // Click save
    await page.locator(".btn-primary", { hasText: "Save Changes" }).click();

    // Should stay on edit page with success message
    await expect(page).toHaveURL(/message=saved/);
    await expect(page.locator(".save-indicator.saved")).toBeVisible();
  });
});
