import { test, expect } from "@playwright/test";
import { E2E_ADMIN, E2E_STUDENT } from "./fixtures";

test.describe("admin users table", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/users");
    // Wait for users table to load
    await expect(page.locator(".admin-list table")).toBeVisible();
  });

  test("shows users in table", async ({ page }) => {
    // Should show our seeded users
    await expect(page.locator("tbody")).toContainText(E2E_ADMIN.email);
    await expect(page.locator("tbody")).toContainText(E2E_STUDENT.email);
  });

  test("has expected columns", async ({ page }) => {
    // Should have 5 columns (Email, Name, Role, Created, Last Login)
    const headers = page.locator("thead th");
    await expect(headers).toHaveCount(5);

    // Verify expected column headers
    await expect(headers.nth(0)).toHaveText("Email");
    await expect(headers.nth(1)).toHaveText("Name");
    await expect(headers.nth(2)).toHaveText("Role");
    await expect(headers.nth(3)).toHaveText("Created");
    await expect(headers.nth(4)).toHaveText("Last Login");
  });

  test("shows role pills", async ({ page }) => {
    // Should have role pills
    await expect(page.locator(".role-pill.role-admin")).toBeVisible();
    await expect(page.locator(".role-pill.role-student")).toBeVisible();
  });

  test("new user button navigates to create page", async ({ page }) => {
    // Click new user button
    await page.locator("a", { hasText: "+ New User" }).click();

    // Should navigate to new user page
    await expect(page).toHaveURL(/\/admin\/users\/new/);
    await expect(page.locator("h2")).toContainText("Create New User");
  });

  test("create user form has required fields", async ({ page }) => {
    // Navigate to create page
    await page.goto("/admin/users/new");

    // Should have email, name, and role fields
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#name")).toBeVisible();
    await expect(page.locator("#role")).toBeVisible();
  });

  test("role dropdown has all options", async ({ page }) => {
    // Navigate to create page
    await page.goto("/admin/users/new");

    // Check role options exist
    const roleSelect = page.locator("#role");
    await expect(roleSelect.locator("option")).toHaveCount(3);

    // Verify options can be selected
    await roleSelect.selectOption("editor");
    await expect(roleSelect).toHaveValue("editor");
    await roleSelect.selectOption("admin");
    await expect(roleSelect).toHaveValue("admin");
    await roleSelect.selectOption("student");
    await expect(roleSelect).toHaveValue("student");
  });

  test("cancel button goes back to users list", async ({ page }) => {
    // Navigate to create page
    await page.goto("/admin/users/new");

    // Click cancel
    await page.locator(".btn-secondary", { hasText: "Cancel" }).click();

    // Should be back on users list
    await expect(page).toHaveURL(/\/admin\/users$/);
  });

  test("clicking row navigates to user detail", async ({ page }) => {
    // Click on first row
    const firstRow = page.locator("tbody tr").first();
    await firstRow.click();

    // Should navigate to user detail page
    await expect(page).toHaveURL(/\/admin\/users\/[^/]+$/);

    // Should show user details
    await expect(page.locator(".admin-detail-panel")).toBeVisible();
  });

  test("role filter works", async ({ page }) => {
    // Select admin role filter
    const roleSelect = page.locator('select[name="role"]');
    await roleSelect.selectOption("admin");

    // Wait for page to reload with filter
    await page.waitForURL(/role=admin/);

    // Should show admin user
    await expect(page.locator("tbody")).toContainText(E2E_ADMIN.email);
  });

  test("search filter works", async ({ page }) => {
    // Type in search input
    const searchInput = page.locator('.search-input[name="q"]');
    await searchInput.fill(E2E_ADMIN.email.split("@")[0]);
    await searchInput.press("Enter");

    // Wait for page to reload with search
    await page.waitForURL(/q=/);

    // Should show admin user
    await expect(page.locator("tbody")).toContainText(E2E_ADMIN.email);
  });
});
