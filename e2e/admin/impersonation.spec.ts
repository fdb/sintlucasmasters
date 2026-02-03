import { test, expect, type Page } from "@playwright/test";

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

  await expect(page.locator(".student-shell")).toBeVisible();
  await expect(page.locator(".student-split-view")).toBeVisible();
}

test.describe("admin impersonation", () => {
  test("closing impersonation returns to admin without edit modal", async ({ page }) => {
    await impersonateStudentFromProject(page, "Bob Jones");

    await expect(page.locator(".project-edit-form")).toBeVisible();

    const stopButton = page.locator(".impersonation-banner button");
    await stopButton.click();

    await expect(page.locator(".admin-header h1")).toHaveText("Admin");
    await expect(page.locator(".admin-list table")).toBeVisible();

    await expect(page.locator(".edit-modal-overlay.is-open")).toHaveCount(0);
  });
});
