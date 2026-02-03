import { test, expect, type Page } from "@playwright/test";

// Helper to ensure project is in draft state before test
async function ensureProjectIsDraft(page: Page) {
  // Wait for the preview panel to fully load
  await expect(page.locator(".student-preview-panel")).toBeVisible();

  // Give the UI time to load the status from the server
  await page.waitForTimeout(500);

  // Check if we're already in submitted state
  const submittedBanner = page.locator(".detail-submitted-banner");
  const submitSection = page.locator(".detail-submit-section");

  // Wait for either the submit section or submitted banner to appear
  await Promise.race([
    submitSection.waitFor({ state: "visible", timeout: 5000 }).catch(() => {}),
    submittedBanner.waitFor({ state: "visible", timeout: 5000 }).catch(() => {}),
  ]);

  const isSubmitted = await submittedBanner.isVisible().catch(() => false);

  if (isSubmitted) {
    // Click Return to Draft to revert
    const returnButton = page.locator(".detail-submitted-banner button", { hasText: "Return to Draft" });
    await returnButton.click();

    // Confirm in dialog
    const dialog = page.locator(".confirm-overlay");
    await expect(dialog).toBeVisible();
    await dialog.locator(".btn-primary", { hasText: "Return to Draft" }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Wait for submit section to appear
    await expect(page.locator(".detail-submit-section")).toBeVisible({ timeout: 10000 });
  }
}

async function impersonateStudentFromProject(page: Page, studentName: string) {
  await page.goto("/admin");
  await expect(page.locator(".admin-list table")).toBeVisible();

  const projectsTab = page.locator(".admin-tabs button", { hasText: "projects" });
  if (await projectsTab.isVisible()) {
    await projectsTab.click();
  }

  const targetRow = page.locator("tbody tr", { hasText: studentName });
  await expect(targetRow).toBeVisible();
  await targetRow.click();

  const detailHeader = page.locator(".detail-header-row h3", { hasText: studentName });
  await expect(detailHeader).toBeVisible();

  const viewAsButton = page.locator(".detail-action-btn", { hasText: "View as" });
  await expect(viewAsButton).toBeVisible();
  await viewAsButton.click();

  // Wait for student page to load
  await expect(page.locator(".student-shell")).toBeVisible();

  // Wait for projects to load
  await expect(page.locator(".student-split-view")).toBeVisible();
}

// Helper to navigate to student view as Submit Student
async function navigateToSubmitStudent(page: Page) {
  await impersonateStudentFromProject(page, "Submit Student");
}

// Use serial to avoid parallel tests interfering with shared DB state
test.describe.serial("project submission", () => {
  test("shows submit checklist with all items valid for complete project", async ({ page }) => {
    await navigateToSubmitStudent(page);
    await ensureProjectIsDraft(page);

    // The submittable project should have all checklist items valid
    const checklist = page.locator(".submit-checklist");
    await expect(checklist).toBeVisible();

    // All checklist items should be valid (have green checkmarks)
    const validItems = checklist.locator(".checklist-item.valid");
    await expect(validItems).toHaveCount(6); // project title, bio, description, print image, print caption, main image
  });

  test("submit button is enabled when all fields are complete", async ({ page }) => {
    await navigateToSubmitStudent(page);
    await ensureProjectIsDraft(page);

    const submitButton = page.locator(".submit-project-btn");
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test("adding a social link input persists through autosave", async ({ page }) => {
    await navigateToSubmitStudent(page);
    await ensureProjectIsDraft(page);

    const linksList = page.locator(".edit-links-list");
    const addLinkButton = linksList.locator("button", { hasText: "Add link" });
    await expect(addLinkButton).toBeVisible();

    const linkInputs = linksList.locator("input.edit-input");
    const initialCount = await linkInputs.count();

    const savePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "PUT" && response.url().includes("/api/admin/projects/") && response.ok(),
      { timeout: 10000 }
    );

    await addLinkButton.click();
    await expect(linkInputs).toHaveCount(initialCount + 1);

    await savePromise;
    await page.waitForTimeout(2000);
    await expect(linkInputs).toHaveCount(initialCount + 1);
  });

  test("clicking submit opens confirmation dialog", async ({ page }) => {
    await navigateToSubmitStudent(page);
    await ensureProjectIsDraft(page);

    const submitButton = page.locator(".submit-project-btn");
    await submitButton.click();

    // Confirmation dialog should appear
    const dialog = page.locator(".confirm-overlay");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".confirm-dialog h3")).toHaveText("Submit project?");

    // Cancel to leave project in draft state
    await dialog.locator(".btn-secondary").click();
  });

  test("can cancel submission", async ({ page }) => {
    await navigateToSubmitStudent(page);
    await ensureProjectIsDraft(page);

    const submitButton = page.locator(".submit-project-btn");
    await submitButton.click();

    // Cancel the dialog
    const dialog = page.locator(".confirm-overlay");
    await expect(dialog).toBeVisible();
    await dialog.locator(".btn-secondary").click();

    // Dialog should close
    await expect(dialog).not.toBeVisible();

    // Submit section should still be visible
    await expect(page.locator(".detail-submit-section")).toBeVisible();
  });

  test("project edit form shows correct status after submit", async ({ page }) => {
    await navigateToSubmitStudent(page);
    await ensureProjectIsDraft(page);

    // Before submit - find status badge in form (student mode uses status-badge, not edit-status-option)
    const statusBadge = page.locator(".status-badge");

    // Check initial status is draft
    await expect(statusBadge).toContainText("draft");

    // Submit the project
    await page.locator(".submit-project-btn").click();
    const dialog = page.locator(".confirm-overlay");
    await expect(dialog).toBeVisible();
    await dialog.locator(".btn-primary", { hasText: "Submit" }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // After submit - status should now be "submitted"
    await expect(statusBadge).toContainText("submitted");
  });

  test("submitting project updates UI to show submitted status", async ({ page }) => {
    await navigateToSubmitStudent(page);
    await ensureProjectIsDraft(page);

    // Click submit button
    const submitButton = page.locator(".submit-project-btn");
    await submitButton.click();

    // Confirm in dialog
    const dialog = page.locator(".confirm-overlay");
    await expect(dialog).toBeVisible();
    await dialog.locator(".btn-primary", { hasText: "Submit" }).click();

    // Wait for submission to complete - dialog closes
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Wait for the submitted banner to appear (this indicates the UI has fully updated)
    const submittedBanner = page.locator(".detail-submitted-banner");
    await expect(submittedBanner).toBeVisible({ timeout: 10000 });
    await expect(submittedBanner).toContainText("awaiting review");

    // Submit section should be hidden (only check after banner is visible)
    await expect(page.locator(".detail-submit-section")).not.toBeVisible();
  });

  test("submitted project shows 'Return to Draft' button", async ({ page }) => {
    await navigateToSubmitStudent(page);

    // Wait for the preview panel to fully load
    await expect(page.locator(".student-preview-panel")).toBeVisible();

    // Give the UI time to load the status from the server
    await page.waitForTimeout(500);

    // Check if project is already submitted
    const submittedBanner = page.locator(".detail-submitted-banner");
    const submitButton = page.locator(".submit-project-btn");

    // Wait for either the submit button or submitted banner to appear
    await Promise.race([
      submitButton.waitFor({ state: "visible", timeout: 5000 }).catch(() => {}),
      submittedBanner.waitFor({ state: "visible", timeout: 5000 }).catch(() => {}),
    ]);

    const isSubmitted = await submittedBanner.isVisible().catch(() => false);

    if (!isSubmitted) {
      // Submit the project first
      await submitButton.click();
      const dialog = page.locator(".confirm-overlay");
      await expect(dialog).toBeVisible();
      await dialog.locator(".btn-primary", { hasText: "Submit" }).click();
      await expect(dialog).not.toBeVisible({ timeout: 10000 });
      await expect(submittedBanner).toBeVisible({ timeout: 10000 });
    }

    // Return to Draft button should be visible
    const returnButton = page.locator(".detail-submitted-banner button", { hasText: "Return to Draft" });
    await expect(returnButton).toBeVisible();
  });

  test("clicking 'Return to Draft' reverts project status", async ({ page }) => {
    await navigateToSubmitStudent(page);

    // Wait for the preview panel to fully load
    await expect(page.locator(".student-preview-panel")).toBeVisible();

    // Give the UI time to load the status from the server
    await page.waitForTimeout(500);

    // Check if project is already submitted
    const submittedBanner = page.locator(".detail-submitted-banner");
    const submitButton = page.locator(".submit-project-btn");

    // Wait for either the submit button or submitted banner to appear
    await Promise.race([
      submitButton.waitFor({ state: "visible", timeout: 5000 }).catch(() => {}),
      submittedBanner.waitFor({ state: "visible", timeout: 5000 }).catch(() => {}),
    ]);

    const isSubmitted = await submittedBanner.isVisible().catch(() => false);

    if (!isSubmitted) {
      // Submit the project first
      await submitButton.click();
      const dialog = page.locator(".confirm-overlay");
      await expect(dialog).toBeVisible();
      await dialog.locator(".btn-primary", { hasText: "Submit" }).click();
      await expect(dialog).not.toBeVisible({ timeout: 10000 });
      await expect(submittedBanner).toBeVisible({ timeout: 10000 });
    }

    // Click Return to Draft
    const returnButton = page.locator(".detail-submitted-banner button", { hasText: "Return to Draft" });
    await returnButton.click();

    // Confirmation dialog should appear
    const dialog = page.locator(".confirm-overlay");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".confirm-dialog h3")).toHaveText("Return to draft?");

    // Confirm
    await dialog.locator(".btn-primary", { hasText: "Return to Draft" }).click();

    // Wait for save to complete
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Submitted banner should be hidden
    await expect(page.locator(".detail-submitted-banner")).not.toBeVisible();

    // Submit section should be visible again
    await expect(page.locator(".detail-submit-section")).toBeVisible();
  });
});

test.describe("project submission validation", () => {
  test.beforeEach(async ({ page }) => {
    // Impersonate "Existing Student" who has Bob Jones project (which is a draft but incomplete)
    await impersonateStudentFromProject(page, "Bob Jones");
  });

  test("submit button is disabled when project is missing print image", async ({ page }) => {
    // Bob Jones project doesn't have a print image
    const checklist = page.locator(".submit-checklist");
    await expect(checklist).toBeVisible();

    // Print image should be invalid
    const printImageItem = checklist.locator(".checklist-item", { hasText: "Print Image" }).first();
    await expect(printImageItem).toHaveClass(/invalid/);

    // Submit button should be disabled
    const submitButton = page.locator(".submit-project-btn");
    await expect(submitButton).toBeDisabled();
  });

  test("shows hint message when submit is disabled", async ({ page }) => {
    const hint = page.locator(".submit-hint");
    await expect(hint).toBeVisible();
    await expect(hint).toContainText("Complete all checklist items");
  });
});
