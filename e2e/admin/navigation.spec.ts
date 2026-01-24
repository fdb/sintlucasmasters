import { test, expect } from "@playwright/test";
import { E2E_ADMIN } from "./fixtures";

test.describe("admin navigation", () => {
  test("loads admin panel", async ({ page }) => {
    await page.goto("/admin");
    // Admin header should be visible
    await expect(page.locator(".admin-header h1")).toHaveText("Admin");
    await expect(page.locator(".admin-header p")).toContainText("Sint Lucas Masters");
  });

  test("shows user avatar with email initial", async ({ page }) => {
    await page.goto("/admin");
    // User avatar button should show first letter of email
    const avatar = page.locator(".user-avatar");
    await expect(avatar).toBeVisible();
    await expect(avatar).toHaveText(E2E_ADMIN.email.charAt(0).toUpperCase());
  });

  test("can switch between tabs", async ({ page }) => {
    await page.goto("/admin");

    // Should start on projects tab (first tab)
    const projectsTab = page.locator(".admin-tab", { hasText: "Projects" });
    await expect(projectsTab).toHaveClass(/active/);

    // Click on users tab
    await page.locator(".admin-tab", { hasText: "Users" }).click();
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.locator(".admin-list-header h2")).toHaveText("Users");

    // Click back to projects
    await page.locator(".admin-tab", { hasText: "Projects" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator(".admin-list-header h2")).toHaveText("Projects");
  });

  test("dark mode toggle works", async ({ page }) => {
    await page.goto("/admin");

    // Get initial theme (might be null or "light")
    const initialTheme = await page.locator("html").getAttribute("data-theme");

    // Click theme toggle
    await page.locator(".theme-toggle").click();

    // Theme should change to dark
    const newTheme = await page.locator("html").getAttribute("data-theme");
    expect(newTheme).toBe("dark");

    // Toggle back
    await page.locator(".theme-toggle").click();
    const finalTheme = await page.locator("html").getAttribute("data-theme");
    expect(finalTheme).toBe("light");
  });

  test("user dropdown shows email and logout", async ({ page }) => {
    await page.goto("/admin");

    // Click user avatar to open dropdown
    await page.locator(".user-avatar").click();

    // Dropdown should be visible
    const dropdown = page.locator(".user-dropdown");
    await expect(dropdown).toBeVisible();
    await expect(dropdown.locator(".user-dropdown-email")).toHaveText(E2E_ADMIN.email);
    await expect(dropdown.locator("button")).toContainText("Logout");
  });
});
