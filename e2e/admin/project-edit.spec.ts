import { test, expect } from "@playwright/test";

test.describe("admin project editing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin");
    // Wait for projects table to load
    await expect(page.locator(".admin-list table")).toBeVisible();
  });

  test("double-clicking row opens edit modal", async ({ page }) => {
    // Double-click first row
    const firstRow = page.locator("tbody tr").first();
    await firstRow.dblclick();

    // Edit modal should open (use overlay with is-open to find the active modal)
    const modalOverlay = page.locator(".edit-modal-overlay.is-open");
    await expect(modalOverlay).toBeVisible();
    await expect(modalOverlay.locator("h2")).toHaveText("Edit Project");
  });

  test("edit modal has all sections", async ({ page }) => {
    // Double-click first row
    await page.locator("tbody tr").first().dblclick();

    const modal = page.locator(".edit-modal-overlay.is-open .edit-modal");

    // Check all sections are present
    await expect(modal.locator(".edit-section-title", { hasText: "Identity" })).toBeVisible();
    await expect(modal.locator(".edit-section-title", { hasText: "Classification" })).toBeVisible();
    await expect(modal.locator(".edit-section-title", { hasText: "Content" })).toBeVisible();
    await expect(modal.locator(".edit-section-title", { hasText: "Media" })).toBeVisible();
    await expect(modal.locator(".edit-section-title", { hasText: "Tags" })).toBeVisible();
  });

  test("can edit student name field", async ({ page }) => {
    // Double-click first row
    await page.locator("tbody tr").first().dblclick();

    const modal = page.locator(".edit-modal-overlay.is-open");

    // Find student name input
    const studentNameInput = modal.locator('.edit-field:has-text("Student Name") input');
    await expect(studentNameInput).toBeVisible();

    // Clear and type new value
    await studentNameInput.clear();
    await studentNameInput.fill("Test Student Name");
    await expect(studentNameInput).toHaveValue("Test Student Name");
  });

  test("status buttons toggle correctly", async ({ page }) => {
    // Double-click first row
    await page.locator("tbody tr").first().dblclick();

    const modal = page.locator(".edit-modal-overlay.is-open");

    // Find status buttons
    const draftBtn = modal.locator(".edit-status-option", { hasText: "draft" });
    const publishedBtn = modal.locator(".edit-status-option", { hasText: "published" });

    // Click draft
    await draftBtn.click();
    await expect(draftBtn).toHaveClass(/active/);

    // Click published
    await publishedBtn.click();
    await expect(publishedBtn).toHaveClass(/active/);
    await expect(draftBtn).not.toHaveClass(/active/);
  });

  test("can add and remove tags", async ({ page }) => {
    // Double-click first row
    await page.locator("tbody tr").first().dblclick();

    const modal = page.locator(".edit-modal-overlay.is-open");
    await expect(modal).toBeVisible();

    // Wait for Tags section to be visible (find section by title)
    const tagsSection = modal.locator('.edit-section:has(.edit-section-title:text("Tags"))');
    await expect(tagsSection).toBeVisible();

    // Wait for existing tags to be rendered (seeded data has tags)
    const tagInput = tagsSection.locator(".edit-tag-input");
    await expect(tagInput).toBeVisible();

    // Get initial tag count (wait for at least some tags to be present)
    await expect(tagsSection.locator(".edit-tag")).not.toHaveCount(0);
    const initialTagCount = await tagsSection.locator(".edit-tag").count();

    // Add a new tag
    await tagInput.fill("newtag");
    await tagInput.press("Enter");

    // Should have one more tag
    await expect(tagsSection.locator(".edit-tag")).toHaveCount(initialTagCount + 1);

    // Remove the new tag
    const newTag = tagsSection.locator(".edit-tag", { hasText: "newtag" });
    await newTag.locator(".edit-tag-remove").click();

    // Should be back to original count
    await expect(tagsSection.locator(".edit-tag")).toHaveCount(initialTagCount);
  });

  test("escape key closes modal", async ({ page }) => {
    // Double-click first row
    await page.locator("tbody tr").first().dblclick();

    const modalOverlay = page.locator(".edit-modal-overlay.is-open");

    // Modal should be visible
    await expect(modalOverlay).toBeVisible();

    // Press escape
    await page.keyboard.press("Escape");

    // Modal should be hidden (no is-open class on first overlay)
    await expect(page.locator(".edit-modal-overlay").first()).not.toHaveClass(/is-open/);
  });

  test("cancel button closes modal", async ({ page }) => {
    // Double-click first row
    await page.locator("tbody tr").first().dblclick();

    const modalOverlay = page.locator(".edit-modal-overlay.is-open");

    // Modal should be visible
    await expect(modalOverlay).toBeVisible();

    // Click cancel
    await modalOverlay.locator(".edit-modal-footer .btn-secondary").click();

    // Modal should be hidden
    await expect(page.locator(".edit-modal-overlay").first()).not.toHaveClass(/is-open/);
  });

  test("can select context from dropdown", async ({ page }) => {
    // Double-click first row
    await page.locator("tbody tr").first().dblclick();

    const modal = page.locator(".edit-modal-overlay.is-open");

    // Find context select
    const contextSelect = modal.locator('.edit-field:has-text("Context") select');
    await expect(contextSelect).toBeVisible();

    // Select a different context
    await contextSelect.selectOption("Applied Context");
    await expect(contextSelect).toHaveValue("Applied Context");
  });
});
