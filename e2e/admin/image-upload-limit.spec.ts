import { test, expect } from "@playwright/test";

// 1x1 transparent PNG — small enough to safely round-trip as a fake upload.
const TINY_PNG = Buffer.from(
  "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D" +
    "49444154789C636060606000000005000156A11C440000000049454E44AE426082",
  "hex"
);

function fakeFile(name: string) {
  return { name, mimeType: "image/png", buffer: TINY_PNG };
}

test.describe("project image upload limit (1 main + 6 extra = 7 max)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator(".admin-list table")).toBeVisible();
  });

  test("only the first 7 images are uploaded when the user picks more, with a warning", async ({ page, request }) => {
    // Reset image-room project to its 5-image baseline so the test is idempotent
    // even when re-run against the same dev:e2e session.
    const PROJECT_ID = "e2e-project-image-room";
    const imagesRes = await request.get(`/api/admin/projects/${PROJECT_ID}`);
    expect(imagesRes.ok()).toBe(true);
    const projectData = (await imagesRes.json()) as { images?: Array<{ id: string; sort_order: number }> };
    const extras = (projectData.images ?? []).filter((img) => img.sort_order >= 5);
    for (const img of extras) {
      await request.delete(`/api/admin/projects/${PROJECT_ID}/images/${img.id}`);
    }

    await page.locator("tbody tr", { hasText: "Image Limit Room" }).dblclick();

    const modal = page.locator(".edit-modal-overlay.is-open");
    await expect(modal).toBeVisible();

    await expect(modal.locator(".edit-image-item")).toHaveCount(5);

    // Pick 6 files at once; only the first 2 should land.
    // Scope to the web-images section — the modal also has a print-image file input.
    const fileInput = modal.locator('.media-manager input[type="file"]');
    await fileInput.setInputFiles([
      fakeFile("a.png"),
      fakeFile("b.png"),
      fakeFile("c.png"),
      fakeFile("d.png"),
      fakeFile("e.png"),
      fakeFile("f.png"),
    ]);

    // Now at the 7-image cap.
    await expect(modal.locator(".edit-image-item")).toHaveCount(7);

    // Warning explains how many were dropped and why.
    const warning = modal.locator('[data-testid="image-limit-warning"]');
    await expect(warning).toBeVisible();
    await expect(warning).toContainText("Only 2 of the selected 6 images uploaded");
    await expect(warning).toContainText("at most 7 images");

    // Upload tile disappears once the cap is reached.
    await expect(modal.locator(".upload-tile")).toHaveCount(0);
  });

  test("upload tile stays hidden for legacy projects already over the cap", async ({ page }) => {
    // Image Limit Full project is seeded with 8 web images (legacy data > cap).
    await page.locator("tbody tr", { hasText: "Image Limit Full" }).dblclick();

    const modal = page.locator(".edit-modal-overlay.is-open");
    await expect(modal).toBeVisible();

    // All 8 legacy images remain visible — the cap doesn't retroactively prune.
    await expect(modal.locator(".edit-image-item")).toHaveCount(8);
    await expect(modal.locator(".upload-tile")).toHaveCount(0);
  });

  test("backend rejects uploads above the cap", async ({ page, request }) => {
    // Direct API call: the at-cap project should refuse another upload.
    const res = await request.post("/api/admin/projects/e2e-project-image-full/images/upload", {
      multipart: {
        file: { name: "extra.png", mimeType: "image/png", buffer: TINY_PNG },
      },
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toMatch(/Maximum of 7 images/);

    // Sanity: the modal still shows all 8 legacy images afterwards.
    await page.locator("tbody tr", { hasText: "Image Limit Full" }).dblclick();
    const modal = page.locator(".edit-modal-overlay.is-open");
    await expect(modal.locator(".edit-image-item")).toHaveCount(8);
  });
});
