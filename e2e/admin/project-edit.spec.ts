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

  test("project title prefills opposite language while typing and allows divergence", async ({ page }) => {
    const targetRow = page.locator("tbody tr", { hasText: "Editable Student" });
    await targetRow.dblclick();

    const modal = page.locator(".edit-modal-overlay.is-open");
    await expect(modal).toBeVisible();

    const enTab = modal.getByRole("tab", { name: "EN" });
    const nlTab = modal.getByRole("tab", { name: "NL" });
    const titleInput = modal.locator('.edit-field:has-text("Project Title") input');

    await enTab.click();
    await titleInput.clear();

    const nlTitle = `NL Prefill ${Date.now()}`;
    await nlTab.click();
    await titleInput.clear();
    await titleInput.type(nlTitle);

    await enTab.click();
    await expect(titleInput).toHaveValue(nlTitle);

    // Once both languages are manually edited, syncing should stop to allow custom translations.
    const enCustomTitle = `EN Custom ${Date.now()}`;
    await titleInput.clear();
    await titleInput.type(enCustomTitle);
    await nlTab.click();
    await expect(titleInput).toHaveValue(nlTitle);

    // Re-open the modal to reset field touch state and verify EN -> NL mirroring.
    await modal.locator(".edit-modal-footer .btn-secondary").click();
    await expect(page.locator(".edit-modal-overlay").first()).not.toHaveClass(/is-open/);
    await targetRow.dblclick();

    const reopenedModal = page.locator(".edit-modal-overlay.is-open");
    await expect(reopenedModal).toBeVisible();
    const enTabReopened = reopenedModal.getByRole("tab", { name: "EN" });
    const nlTabReopened = reopenedModal.getByRole("tab", { name: "NL" });
    const reopenedTitleInput = reopenedModal.locator('.edit-field:has-text("Project Title") input');

    await nlTabReopened.click();
    await reopenedTitleInput.clear();

    const enTitle = `EN Prefill ${Date.now()}`;
    await enTabReopened.click();
    await reopenedTitleInput.clear();
    await reopenedTitleInput.type(enTitle);

    await nlTabReopened.click();
    await expect(reopenedTitleInput).toHaveValue(enTitle);
  });

  test("location prefills opposite language while typing and allows divergence", async ({ page }) => {
    const targetRow = page.locator("tbody tr", { hasText: "Editable Student" });
    await targetRow.dblclick();

    const modal = page.locator(".edit-modal-overlay.is-open");
    await expect(modal).toBeVisible();

    const enTab = modal.getByRole("tab", { name: "EN" });
    const nlTab = modal.getByRole("tab", { name: "NL" });
    const locationInput = modal.locator('.edit-field:has-text("Location") input');

    await enTab.click();
    await locationInput.clear();

    const nlLocation = `NL Loc ${Date.now()}`;
    await nlTab.click();
    await locationInput.clear();
    await locationInput.type(nlLocation);

    await enTab.click();
    await expect(locationInput).toHaveValue(nlLocation);

    // Once both languages are manually edited, syncing should stop to allow custom translations.
    const enCustomLocation = `EN Loc ${Date.now()}`;
    await locationInput.clear();
    await locationInput.type(enCustomLocation);
    await nlTab.click();
    await expect(locationInput).toHaveValue(nlLocation);

    // Re-open the modal to reset field touch state and verify EN -> NL mirroring.
    await modal.locator(".edit-modal-footer .btn-secondary").click();
    await expect(page.locator(".edit-modal-overlay").first()).not.toHaveClass(/is-open/);
    await targetRow.dblclick();

    const reopenedModal = page.locator(".edit-modal-overlay.is-open");
    await expect(reopenedModal).toBeVisible();
    const enTabReopened = reopenedModal.getByRole("tab", { name: "EN" });
    const nlTabReopened = reopenedModal.getByRole("tab", { name: "NL" });
    const reopenedLocationInput = reopenedModal.locator('.edit-field:has-text("Location") input');

    await nlTabReopened.click();
    await reopenedLocationInput.clear();

    const enLocation = `EN Loc ${Date.now()}`;
    await enTabReopened.click();
    await reopenedLocationInput.clear();
    await reopenedLocationInput.type(enLocation);

    await nlTabReopened.click();
    await expect(reopenedLocationInput).toHaveValue(enLocation);
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

    // Select a different context (canonical context key)
    await contextSelect.selectOption("applied");
    await expect(contextSelect).toHaveValue("applied");
  });

  test("editing student name updates table after save", async ({ page }) => {
    // Use "Editable Student" project - a dedicated project for this test
    // with a valid program value (required for save) and not used by other tests
    const originalName = "Editable Student";
    const targetRow = page.locator("tbody tr", { hasText: originalName });

    // Double-click to open edit modal
    await targetRow.dblclick();

    const modal = page.locator(".edit-modal-overlay.is-open");
    await expect(modal).toBeVisible();

    // Find student name input and change it
    const studentNameInput = modal.locator('.edit-field:has-text("Student Name") input');
    await studentNameInput.clear();
    const newName = `Test Edit ${Date.now()}`;
    await studentNameInput.fill(newName);

    // Click Save Changes button
    await modal.locator('button:has-text("Save Changes")').click();

    // Wait for "Saved successfully" indicator to appear
    await expect(modal.locator(".save-indicator.saved")).toBeVisible({ timeout: 10000 });

    // Wait for modal to close (save shows "Saved successfully" then closes after 800ms)
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Verify the table now shows the updated name
    await expect(page.locator("tbody tr", { hasText: newName })).toBeVisible({ timeout: 5000 });

    // Restore original name to avoid test pollution
    await page.locator("tbody tr", { hasText: newName }).dblclick();
    const restoreModal = page.locator(".edit-modal-overlay.is-open");
    await expect(restoreModal).toBeVisible();
    const restoreInput = restoreModal.locator('.edit-field:has-text("Student Name") input');
    await restoreInput.clear();
    await restoreInput.fill(originalName);
    await restoreModal.locator('button:has-text("Save Changes")').click();
    await expect(restoreModal.locator(".save-indicator.saved")).toBeVisible({ timeout: 10000 });
    await expect(restoreModal).not.toBeVisible({ timeout: 5000 });
  });
});
