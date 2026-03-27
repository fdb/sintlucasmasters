import { test, expect } from "@playwright/test";
import { E2E_ADMIN, E2E_STUDENT, E2E_MULTI_STUDENT } from "./fixtures";

test.describe("admin users table", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin");
    // Switch to users tab
    await page.locator(".admin-tabs button", { hasText: "users" }).click();
    // Wait for users table to load
    await expect(page.locator(".admin-list table")).toBeVisible();
  });

  test("shows users in table", async ({ page }) => {
    // Should show our seeded users
    await expect(page.locator("tbody")).toContainText(E2E_ADMIN.email);
    await expect(page.locator("tbody")).toContainText(E2E_STUDENT.email);
  });

  test("has expected columns and no id column", async ({ page }) => {
    // Should have exactly 3 columns (email, name, role)
    const headers = page.locator("thead th");
    await expect(headers).toHaveCount(3);

    // Verify each expected column header
    await expect(headers.nth(0)).toHaveText("Email");
    await expect(headers.nth(1)).toHaveText("Name");
    await expect(headers.nth(2)).toHaveText("Role");
  });

  test("shows role pills", async ({ page }) => {
    // Should have role pills (use .first() to handle multiple students)
    await expect(page.locator(".role-pill.role-admin")).toBeVisible();
    await expect(page.locator(".role-pill.role-student").first()).toBeVisible();
  });

  test("add button opens create user modal", async ({ page }) => {
    // Click add button
    await page.locator(".detail-action-btn", { hasText: "Add" }).click();

    // Modal should open (use is-open overlay to find active modal)
    const modal = page.locator(".edit-modal-overlay.is-open");
    await expect(modal).toBeVisible();
    await expect(modal.locator("h2")).toHaveText("Create User");
  });

  test("create user modal has single and bulk tabs", async ({ page }) => {
    // Open modal
    await page.locator(".detail-action-btn", { hasText: "Add" }).click();

    const modal = page.locator(".edit-modal-overlay.is-open");

    // Should have two tabs
    const tabs = modal.locator(".modal-tabs .modal-tab");
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(0)).toHaveText("Create User");
    await expect(tabs.nth(1)).toHaveText("Bulk Create");
  });

  test("single user form has required fields", async ({ page }) => {
    // Open modal
    await page.locator(".detail-action-btn", { hasText: "Add" }).click();

    const modal = page.locator(".edit-modal-overlay.is-open");

    // Should be on single user tab by default
    await expect(modal.locator(".modal-tab", { hasText: "Create User" })).toHaveClass(/active/);

    // Should have email, name, and role fields
    await expect(modal.locator('.edit-field:has-text("Email") input')).toBeVisible();
    await expect(modal.locator('.edit-field:has-text("Name") input')).toBeVisible();
    await expect(modal.locator('.edit-field:has-text("Role") select')).toBeVisible();
  });

  test("bulk create tab has csv textarea and project settings", async ({ page }) => {
    // Open modal
    await page.locator(".detail-action-btn", { hasText: "Add" }).click();

    const modal = page.locator(".edit-modal-overlay.is-open");

    // Switch to bulk tab
    await modal.locator(".modal-tab", { hasText: "Bulk Create" }).click();

    // Should have project settings box
    await expect(modal.locator(".bulk-settings-box")).toBeVisible();
    await expect(modal.locator('.edit-field:has-text("Program") select')).toBeVisible();
    await expect(modal.locator('.edit-field:has-text("Academic Year") select')).toBeVisible();

    // Should have CSV textarea
    await expect(modal.locator('.edit-field:has-text("Student List") textarea')).toBeVisible();
  });

  test("role dropdown has all options", async ({ page }) => {
    // Open modal
    await page.locator(".detail-action-btn", { hasText: "Add" }).click();

    const modal = page.locator(".edit-modal-overlay.is-open");

    // Check role options exist (options inside select are hidden until dropdown opens)
    const roleSelect = modal.locator('.edit-field:has-text("Role") select');
    await expect(roleSelect.locator("option")).toHaveCount(3);
    // Verify options can be selected
    await roleSelect.selectOption("editor");
    await expect(roleSelect).toHaveValue("editor");
    await roleSelect.selectOption("admin");
    await expect(roleSelect).toHaveValue("admin");
    await roleSelect.selectOption("student");
    await expect(roleSelect).toHaveValue("student");
  });

  test("create button is disabled without email", async ({ page }) => {
    // Open modal
    await page.locator(".detail-action-btn", { hasText: "Add" }).click();

    const modal = page.locator(".edit-modal-overlay.is-open");

    // Create button should be disabled
    const createBtn = modal.locator(".edit-modal-footer .btn-primary");
    await expect(createBtn).toBeDisabled();

    // Enter email
    await modal.locator('.edit-field:has-text("Email") input').fill("test@example.com");

    // Create button should be enabled
    await expect(createBtn).toBeEnabled();
  });

  test("user detail shows projects for multi-project student", async ({ page }) => {
    // Click on the multi-project student row
    await page.locator("tbody tr", { hasText: E2E_MULTI_STUDENT.email }).click();

    // Wait for detail panel to show the user's name
    const detail = page.locator(".admin-detail-panel");
    await expect(detail.locator("h3")).toHaveText(E2E_MULTI_STUDENT.name);

    // Should show a Projects section with all 3 projects (newest first)
    const projectItems = detail.locator(".detail-project-item");
    await expect(projectItems).toHaveCount(3);

    // Newest first: MA 24-25, PreMA 23-24, BA 22-23
    await expect(projectItems.nth(0)).toContainText("MA Fine Arts");
    await expect(projectItems.nth(0)).toContainText("Digital");
    await expect(projectItems.nth(0)).toContainText("24-25");

    await expect(projectItems.nth(1)).toContainText("PreMA Fine Arts");
    await expect(projectItems.nth(1)).toContainText("Applied");
    await expect(projectItems.nth(1)).toContainText("23-24");

    await expect(projectItems.nth(2)).toContainText("BA Photography");
    await expect(projectItems.nth(2)).toContainText("Autonomous");
    await expect(projectItems.nth(2)).toContainText("22-23");
  });

  test("escape key closes user modal", async ({ page }) => {
    // Open modal
    await page.locator(".detail-action-btn", { hasText: "Add" }).click();

    const modalOverlay = page.locator(".edit-modal-overlay.is-open");
    await expect(modalOverlay).toBeVisible();

    // Press escape
    await page.keyboard.press("Escape");

    // Modal should be closed (second overlay, as first is edit project modal)
    await expect(page.locator(".edit-modal-overlay").nth(1)).not.toHaveClass(/is-open/);
  });
});
