import { test, expect } from "@playwright/test";

test.describe("admin translate button", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator(".admin-list table")).toBeVisible();
  });

  test("translate button visible on empty EN field when NL has content", async ({ page }) => {
    const targetRow = page.locator("tbody tr", { hasText: "Translate Student" });
    await targetRow.dblclick();

    const modal = page.locator(".edit-modal-overlay.is-open");
    await expect(modal).toBeVisible();

    // Switch to EN tab
    const enTab = modal.getByRole("tab", { name: "EN" });
    await enTab.click();

    // Translate buttons should be visible on both bio and description
    const bioBtn = modal.locator('.edit-field:has-text("Bio") .translate-btn');
    await expect(bioBtn).toBeVisible();
    await expect(bioBtn).toContainText("Translate from NL");

    const descBtn = modal.locator('.edit-field:has-text("Project Description") .translate-btn');
    await expect(descBtn).toBeVisible();
    await expect(descBtn).toContainText("Translate from NL");
  });

  test("translate button not visible when both languages have content", async ({ page }) => {
    // Alice Smith has both EN and NL populated with the same text
    const targetRow = page.locator("tbody tr", { hasText: "Alice Smith" });
    await targetRow.dblclick();

    const modal = page.locator(".edit-modal-overlay.is-open");
    await expect(modal).toBeVisible();

    const enTab = modal.getByRole("tab", { name: "EN" });
    await enTab.click();

    // No translate buttons should be visible
    await expect(modal.locator(".translate-btn")).toHaveCount(0);
  });

  test("clicking translate populates the field", async ({ page }) => {
    await page.route("**/api/admin/projects/*/translate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          translation: "Translated bio text for testing",
          status: "ok",
        }),
      });
    });

    const targetRow = page.locator("tbody tr", { hasText: "Translate Student" });
    await targetRow.dblclick();

    const modal = page.locator(".edit-modal-overlay.is-open");
    await expect(modal).toBeVisible();

    const enTab = modal.getByRole("tab", { name: "EN" });
    await enTab.click();

    const bioField = modal.locator('.edit-field:has-text("Bio")');
    const translateBtn = bioField.locator(".translate-btn");
    await expect(translateBtn).toBeVisible();
    await translateBtn.click();

    // Verify bio textarea has the translated text
    const bioTextarea = bioField.locator("textarea");
    await expect(bioTextarea).toHaveValue("Translated bio text for testing");

    // Translate button should disappear since field is now populated
    await expect(translateBtn).not.toBeVisible();
  });

  test("translate button reappears after clearing field", async ({ page }) => {
    await page.route("**/api/admin/projects/*/translate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          translation: "Translated bio text",
          status: "ok",
        }),
      });
    });

    const targetRow = page.locator("tbody tr", { hasText: "Translate Student" });
    await targetRow.dblclick();

    const modal = page.locator(".edit-modal-overlay.is-open");
    await expect(modal).toBeVisible();

    const enTab = modal.getByRole("tab", { name: "EN" });
    await enTab.click();

    const bioField = modal.locator('.edit-field:has-text("Bio")');
    await bioField.locator(".translate-btn").click();

    // Wait for translation to populate
    const bioTextarea = bioField.locator("textarea");
    await expect(bioTextarea).toHaveValue("Translated bio text");

    // Button should be gone
    await expect(bioField.locator(".translate-btn")).not.toBeVisible();

    // Clear the field
    await bioTextarea.clear();

    // Button should reappear
    await expect(bioField.locator(".translate-btn")).toBeVisible();
  });

  test("error state shows and auto-clears", async ({ page }) => {
    await page.route("**/api/admin/projects/*/translate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          translation: "",
          status: "failed",
          reason: "Service error",
        }),
      });
    });

    const targetRow = page.locator("tbody tr", { hasText: "Translate Student" });
    await targetRow.dblclick();

    const modal = page.locator(".edit-modal-overlay.is-open");
    await expect(modal).toBeVisible();

    const enTab = modal.getByRole("tab", { name: "EN" });
    await enTab.click();

    const bioField = modal.locator('.edit-field:has-text("Bio")');
    const translateBtn = bioField.locator(".translate-btn");
    await expect(translateBtn).toBeVisible();
    await translateBtn.click();

    // Error message should appear
    await expect(translateBtn).toContainText("Service error");
    await expect(translateBtn).toHaveClass(/translate-btn-error/);

    // Wait for auto-clear (3 seconds)
    await expect(translateBtn).toContainText("Translate from NL", { timeout: 5000 });
    await expect(translateBtn).not.toHaveClass(/translate-btn-error/);
  });
});
