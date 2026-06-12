import { test, expect } from "@playwright/test";

test.describe("admin batch status update", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator(".admin-list table")).toBeVisible({ timeout: 15000 });
    // Isolate the dedicated batch fixtures (their own academic year).
    await page.locator(".filter-select").first().selectOption("2019-2020");
    await expect(page.locator("tbody tr", { hasText: "Batch One" })).toBeVisible();
  });

  test("selecting rows shows the batch panel with a count", async ({ page }) => {
    const batchOneRow = page.locator("tbody tr", { hasText: "Batch One" });
    await batchOneRow.locator(".select-col input[type=checkbox]").click();

    const panel = page.locator(".admin-detail-panel");
    await expect(panel.locator("h3")).toHaveText("1 selected");

    // Select all via the header checkbox
    await page.locator("thead .select-col input[type=checkbox]").click();
    await expect(panel.locator("h3")).toHaveText("2 selected");

    // Clearing dismisses the batch panel
    await panel.getByRole("button", { name: "Clear" }).click();
    await expect(panel.locator("h3", { hasText: /selected/ })).toHaveCount(0);
  });

  test("applies a new status to selected projects", async ({ page }) => {
    // Select all visible rows
    await page.locator("thead .select-col input[type=checkbox]").click();

    const panel = page.locator(".admin-detail-panel");
    await expect(panel.locator("h3")).toHaveText("2 selected");

    // Choose a target status and apply
    await panel.locator(".batch-status-select").selectOption("reviewed");
    await panel.getByRole("button", { name: "Apply" }).click();

    const confirm = page.locator(".confirm-overlay");
    await expect(confirm.locator("h3")).toHaveText("Change status?");
    await confirm.locator(".btn-primary").click();

    // Selection clears and the rows reflect the new status
    await expect(confirm).not.toBeVisible();
    await expect(panel.locator("h3", { hasText: /selected/ })).toHaveCount(0);

    await expect(page.locator("tbody tr", { hasText: "Batch One" })).toHaveClass(/status-reviewed/);
    await expect(page.locator("tbody tr", { hasText: "Batch Two" })).toHaveClass(/status-reviewed/);
  });
});
