import { test, expect } from "@playwright/test";

test.describe("video embeds", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the video student's project page
    await page.goto("/2024-2025/students/video-student/");
  });

  test("YouTube iframe is rendered with correct src", async ({ page }) => {
    const youtubeIframe = page.locator('.video-embed[data-provider="youtube"] iframe');
    await expect(youtubeIframe).toBeVisible();
    await expect(youtubeIframe).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  test("Vimeo iframe is rendered with correct src", async ({ page }) => {
    const vimeoIframe = page.locator('.video-embed[data-provider="vimeo"] iframe');
    await expect(vimeoIframe).toBeVisible();
    await expect(vimeoIframe).toHaveAttribute("src", "https://player.vimeo.com/video/123456789");
  });

  test("video container has 16:9 aspect ratio styling", async ({ page }) => {
    const videoEmbed = page.locator(".video-embed").first();
    await expect(videoEmbed).toBeVisible();
    // Check that aspect-ratio CSS property is set
    const aspectRatio = await videoEmbed.evaluate((el) => {
      return window.getComputedStyle(el).aspectRatio;
    });
    expect(aspectRatio).toBe("16 / 9");
  });

  test("surrounding text is preserved", async ({ page }) => {
    const description = page.locator(".rich-description");
    await expect(description).toBeVisible();
    // Check that the text before and after videos is rendered
    await expect(description).toContainText("This project explores video documentation.");
    await expect(description).toContainText("Watch the YouTube video:");
    await expect(description).toContainText("And here is a Vimeo video:");
    await expect(description).toContainText("Thank you for watching!");
  });

  test("videos do not autoplay", async ({ page }) => {
    // Check that no autoplay attribute is present
    const iframes = page.locator(".video-embed iframe");
    const count = await iframes.count();
    expect(count).toBe(2);

    for (let i = 0; i < count; i++) {
      const iframe = iframes.nth(i);
      const src = await iframe.getAttribute("src");
      // Verify no autoplay=1 in the URL
      expect(src).not.toContain("autoplay=1");
    }
  });

  test("multiple video embeds are rendered", async ({ page }) => {
    const videoEmbeds = page.locator(".video-embed");
    await expect(videoEmbeds).toHaveCount(2);
  });
});

test.describe("projects without videos", () => {
  test("render normally without video embeds", async ({ page }) => {
    // Navigate to Alice's project which has no videos
    await page.goto("/2024-2025/students/alice-smith/");

    // Should have description content
    await expect(page.locator(".detail")).toBeVisible();

    // Should not have any video embeds
    const videoEmbeds = page.locator(".video-embed");
    await expect(videoEmbeds).toHaveCount(0);

    // Description text should be present (either as .description or .rich-description)
    const descriptionText = await page.locator(".detail").textContent();
    expect(descriptionText).toContain("A project exploring the intersection of dreams and digital art.");
  });
});
