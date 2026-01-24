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
    const tabs = page.locator(".admin-tabs button");
    await expect(tabs.first()).toHaveClass(/active/);

    // Click on users tab
    await tabs.filter({ hasText: "users" }).click();
    await expect(tabs.filter({ hasText: "users" })).toHaveClass(/active/);
    await expect(page.locator(".admin-list h2")).toHaveText("users");

    // Click back to projects
    await tabs.filter({ hasText: "projects" }).click();
    await expect(tabs.filter({ hasText: "projects" })).toHaveClass(/active/);
    await expect(page.locator(".admin-list h2")).toHaveText("projects");
  });

  test("dark mode toggle works", async ({ page }) => {
    await page.goto("/admin");

    // Get initial theme
    const initialTheme = await page.locator("html").getAttribute("data-theme");

    // Click theme toggle
    await page.locator(".theme-toggle").click();

    // Theme should change
    const newTheme = await page.locator("html").getAttribute("data-theme");
    expect(newTheme).not.toBe(initialTheme);

    // Toggle back
    await page.locator(".theme-toggle").click();
    const finalTheme = await page.locator("html").getAttribute("data-theme");
    expect(finalTheme).toBe(initialTheme);
  });

  test("user dropdown shows email and logout", async ({ page }) => {
    await page.goto("/admin");

    // Click user avatar to open dropdown
    await page.locator(".user-avatar").click();

    // Dropdown should be visible
    const dropdown = page.locator(".user-dropdown");
    await expect(dropdown).toBeVisible();
    await expect(dropdown.locator(".user-dropdown-email")).toHaveText(E2E_ADMIN.email);
    await expect(dropdown.locator("button")).toContainText("Log out");
  });
});
