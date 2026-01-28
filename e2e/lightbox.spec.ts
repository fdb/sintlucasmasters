import { test, expect } from "@playwright/test";

test.describe("lightbox", () => {
  const projectUrl = "/2024-2025/students/alice-smith/";

  // Gallery images load from external Cloudflare URLs, which may render with
  // zero dimensions in test environments. Use force:true to click them.
  const clickGalleryImage = async (page: import("@playwright/test").Page) => {
    const img = page.locator(".detail-gallery img").first();
    await img.waitFor({ state: "attached" });
    await img.click({ force: true });
  };

  test("clicking gallery image opens lightbox", async ({ page }) => {
    await page.goto(projectUrl);
    await clickGalleryImage(page);
    await expect(page.locator(".lightbox")).toHaveClass(/is-open/);
  });

  test("lightbox shows full-size image", async ({ page }) => {
    await page.goto(projectUrl);
    await clickGalleryImage(page);
    const lightboxImg = page.locator(".lightbox-image");
    await expect(lightboxImg).toHaveAttribute("src", /slam\/testing\/e2e-test-image\/xl/);
  });

  test("close button closes lightbox", async ({ page }) => {
    await page.goto(projectUrl);
    await clickGalleryImage(page);
    await expect(page.locator(".lightbox")).toHaveClass(/is-open/);
    await page.locator(".lightbox-close").click();
    await expect(page.locator(".lightbox")).not.toHaveClass(/is-open/);
  });

  test("escape key closes lightbox", async ({ page }) => {
    await page.goto(projectUrl);
    await clickGalleryImage(page);
    await expect(page.locator(".lightbox")).toHaveClass(/is-open/);
    await page.keyboard.press("Escape");
    await expect(page.locator(".lightbox")).not.toHaveClass(/is-open/);
  });

  test("clicking backdrop closes lightbox", async ({ page }) => {
    await page.goto(projectUrl);
    await clickGalleryImage(page);
    await expect(page.locator(".lightbox")).toHaveClass(/is-open/);
    await page.locator(".lightbox").click({ position: { x: 5, y: 5 } });
    await expect(page.locator(".lightbox")).not.toHaveClass(/is-open/);
  });

  test("arrow keys navigate between images", async ({ page }) => {
    await page.goto(projectUrl);
    await clickGalleryImage(page);
    const lightboxImg = page.locator(".lightbox-image");
    await page.keyboard.press("ArrowRight");
    await expect(lightboxImg).toHaveAttribute("alt", "Detail shot");
    await page.keyboard.press("ArrowLeft");
    await expect(lightboxImg).toHaveAttribute("alt", "Main view");
  });

  test("nav buttons navigate between images", async ({ page }) => {
    await page.goto(projectUrl);
    await clickGalleryImage(page);
    const lightboxImg = page.locator(".lightbox-image");
    await page.locator(".lightbox-next").click();
    await expect(lightboxImg).toHaveAttribute("alt", "Detail shot");
    await page.locator(".lightbox-prev").click();
    await expect(lightboxImg).toHaveAttribute("alt", "Main view");
  });
});
