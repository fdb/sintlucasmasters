import { test, expect, type Page } from "@playwright/test";

// Helper: navigate admin to the Review Student project and set status to "reviewed"
// CI runners are slow; the admin list and detail panel render async, so these
// navigation gates need a generous timeout to avoid flaky 5s default timeouts.
const NAV_TIMEOUT = 15000;

async function setProjectToReviewed(page: Page) {
  await page.goto("/admin");
  await expect(page.locator(".admin-list table")).toBeVisible({ timeout: NAV_TIMEOUT });

  const projectsTab = page.locator(".admin-tabs button", { hasText: "projects" });
  if (await projectsTab.isVisible()) {
    await projectsTab.click();
  }

  // Double-click to open edit modal
  const targetRow = page.locator("tbody tr", { hasText: "Review Student" });
  await expect(targetRow).toBeVisible({ timeout: NAV_TIMEOUT });
  await targetRow.dblclick();

  // Wait for edit modal
  const editModal = page.locator(".edit-modal-overlay.is-open");
  await expect(editModal).toBeVisible({ timeout: NAV_TIMEOUT });

  // Click "reviewed" status button
  const reviewedButton = editModal.locator(".edit-status-option", { hasText: "reviewed" });
  await expect(reviewedButton).toBeVisible();
  await reviewedButton.click();

  // Save
  await editModal.locator('button:has-text("Save Changes")').click();
  await expect(editModal.locator(".save-indicator.saved")).toBeVisible({ timeout: 10000 });
  await expect(editModal).not.toBeVisible({ timeout: 5000 });
}

// Helper: impersonate Review Student
async function impersonateReviewStudent(page: Page) {
  await page.goto("/admin");
  await expect(page.locator(".admin-list table")).toBeVisible({ timeout: NAV_TIMEOUT });

  const projectsTab = page.locator(".admin-tabs button", { hasText: "projects" });
  if (await projectsTab.isVisible()) {
    await projectsTab.click();
  }

  const targetRow = page.locator("tbody tr", { hasText: "Review Student" });
  await expect(targetRow).toBeVisible({ timeout: NAV_TIMEOUT });
  await targetRow.click();

  const detailHeader = page.locator(".detail-header-row h3", { hasText: "Review Student" });
  await expect(detailHeader).toBeVisible({ timeout: NAV_TIMEOUT });

  const viewAsButton = page.locator(".detail-action-btn", { hasText: "View as" });
  await expect(viewAsButton).toBeVisible({ timeout: NAV_TIMEOUT });
  await viewAsButton.click();

  await expect(page.locator(".student-shell")).toBeVisible({ timeout: NAV_TIMEOUT });
  await expect(page.locator(".student-split-view")).toBeVisible({ timeout: NAV_TIMEOUT });
}

// Use serial to avoid parallel tests interfering with shared DB state
test.describe.serial("project review workflow", () => {
  test("admin can set project to reviewed status", async ({ page }) => {
    await setProjectToReviewed(page);

    // Verify status in the table row
    const targetRow = page.locator("tbody tr", { hasText: "Review Student" });
    await expect(targetRow).toBeVisible();

    // Re-open to verify status persisted
    await targetRow.dblclick();
    const editModal = page.locator(".edit-modal-overlay.is-open");
    await expect(editModal).toBeVisible();

    const activeStatus = editModal.locator(".edit-status-option.active");
    await expect(activeStatus).toHaveText("reviewed");
  });

  test("student sees reviewed banner with approve button", async ({ page }) => {
    await impersonateReviewStudent(page);

    await expect(page.locator(".student-preview-panel")).toBeVisible();
    await page.waitForTimeout(500);

    const reviewedBanner = page.locator(".detail-reviewed-banner");
    await expect(reviewedBanner).toBeVisible();
    await expect(reviewedBanner).toContainText("reviewed by an editor");

    const approveButton = reviewedBanner.locator("button", { hasText: "Approve for Print" });
    await expect(approveButton).toBeVisible();
    await expect(approveButton).toBeEnabled();
  });

  test("student can edit text fields while in reviewed status", async ({ page }) => {
    await impersonateReviewStudent(page);

    await expect(page.locator(".student-preview-panel")).toBeVisible();
    await page.waitForTimeout(500);

    // Verify the form is editable (not locked)
    const bioField = page.locator("textarea").first();
    await expect(bioField).toBeVisible();
    await expect(bioField).toBeEnabled();

    // Type in the field and verify autosave
    const savePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PUT" && response.url().includes("/api/admin/projects/") && response.ok(),
      { timeout: 10000 }
    );

    await bioField.fill("Updated bio during review");
    await savePromise;
  });

  test("clicking approve opens confirmation dialog", async ({ page }) => {
    await impersonateReviewStudent(page);

    await expect(page.locator(".student-preview-panel")).toBeVisible();
    await page.waitForTimeout(500);

    const approveButton = page.locator(".detail-reviewed-banner button", { hasText: "Approve for Print" });
    await approveButton.click();

    const dialog = page.locator(".confirm-overlay");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".confirm-dialog h3")).toHaveText("Approve for print?");

    // Cancel
    await dialog.locator(".btn-secondary").click();
    await expect(dialog).not.toBeVisible();
  });

  test("approving transitions to ready_for_print and locks project", async ({ page }) => {
    await impersonateReviewStudent(page);

    await expect(page.locator(".student-preview-panel")).toBeVisible();
    await page.waitForTimeout(500);

    const approveButton = page.locator(".detail-reviewed-banner button", { hasText: "Approve for Print" });
    await approveButton.click();

    const dialog = page.locator(".confirm-overlay");
    await expect(dialog).toBeVisible();
    await dialog.locator(".btn-primary", { hasText: "Approve for Print" }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Reviewed banner should disappear
    await expect(page.locator(".detail-reviewed-banner")).not.toBeVisible();

    // Locked banner should appear
    const lockedBanner = page.locator(".detail-locked-banner");
    await expect(lockedBanner).toBeVisible({ timeout: 10000 });
    await expect(lockedBanner).toContainText("locked for printing");

    // Status badge should show ready_for_print
    const statusBadge = page.locator(".status-badge");
    await expect(statusBadge).toContainText("ready for print");
  });
});
