import { test, expect, type Page } from "@playwright/test";

const MAX_WEB_IMAGES = 7;

async function openProjectModal(page: Page, projectName: string) {
  await page.goto("/admin");
  await expect(page.locator(".admin-list table")).toBeVisible();
  const targetRow = page.locator("tbody tr", { hasText: projectName });
  await targetRow.dblclick();
  const modal = page.locator(".edit-modal-overlay.is-open");
  await expect(modal).toBeVisible();
  return modal;
}

function fakeJpeg(i: number) {
  return {
    name: `test-${i}.jpg`,
    mimeType: "image/jpeg",
    buffer: Buffer.from(`fake-jpeg-payload-${i}`),
  };
}

test.describe("admin web image 7-cap", () => {
  test("upload button is hidden when project is at the 7-image limit", async ({ page }) => {
    const modal = await openProjectModal(page, "At Limit Student");

    const grid = modal.locator(".edit-images-grid");
    await expect(grid.locator(".edit-image-item")).toHaveCount(MAX_WEB_IMAGES);
    await expect(grid.locator(".upload-tile")).toHaveCount(0);
  });

  test("image counter shows current/max", async ({ page }) => {
    const modal = await openProjectModal(page, "At Limit Student");
    await expect(modal.locator(".image-count-info")).toHaveText(`${MAX_WEB_IMAGES} / ${MAX_WEB_IMAGES} images`);
  });

  test("backend rejects a direct upload POST when the project is at the limit", async ({ page }) => {
    // Admin app needs to be bootstrapped so cookies/session context are loaded.
    await page.goto("/admin");

    const result = await page.evaluate(async () => {
      const body = new FormData();
      body.append("file", new File([new Uint8Array([0xff, 0xd8, 0xff])], "test.jpg", { type: "image/jpeg" }));
      const res = await fetch("/api/admin/projects/e2e-project-at-limit/images/upload", {
        method: "POST",
        body,
      });
      return { status: res.status, body: (await res.json()) as { error?: string } };
    });

    expect(result.status).toBe(400);
    expect(result.body.error).toContain(`Maximum ${MAX_WEB_IMAGES}`);
  });

  test("selecting more files than remaining slots uploads what fits and shows a notice", async ({ page }) => {
    const modal = await openProjectModal(page, "Upload Room Student");

    const grid = modal.locator(".edit-images-grid");
    await expect(grid.locator(".edit-image-item")).toHaveCount(4);

    const totalSelected = 10;
    const expectedSkipped = totalSelected - (MAX_WEB_IMAGES - 4); // 10 - 3 = 7

    const fileInput = modal.locator('.media-manager input[type="file"]');
    await fileInput.setInputFiles(Array.from({ length: totalSelected }, (_, i) => fakeJpeg(i)));

    // Uploads are sequential; wait for grid to reach the cap.
    await expect(grid.locator(".edit-image-item")).toHaveCount(MAX_WEB_IMAGES, { timeout: 15000 });
    await expect(grid.locator(".upload-tile")).toHaveCount(0);

    const notice = modal
      .locator(".upload-blocked-message", {
        hasText: `Uploaded ${MAX_WEB_IMAGES - 4} of ${totalSelected}`,
      })
      .first();
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(`${expectedSkipped} skipped`);
    await expect(notice).toContainText(`max ${MAX_WEB_IMAGES}`);

    // Cleanup: delete the 3 freshly uploaded images so the project returns to 4.
    for (let i = 0; i < MAX_WEB_IMAGES - 4; i++) {
      const lastTile = grid.locator(".edit-image-item").last();
      await lastTile.hover();
      await lastTile.locator(".edit-image-action-delete").click();
      const confirm = page.locator(".confirm-dialog");
      await expect(confirm).toBeVisible();
      await confirm.locator(".btn-danger").click();
      await expect(confirm).toBeHidden();
    }
    await expect(grid.locator(".edit-image-item")).toHaveCount(4);
  });

  test("deleting an image at the limit restores the upload button and counter", async ({ page }) => {
    const modal = await openProjectModal(page, "Delete Restore Student");

    const grid = modal.locator(".edit-images-grid");
    await expect(grid.locator(".edit-image-item")).toHaveCount(MAX_WEB_IMAGES);
    await expect(grid.locator(".upload-tile")).toHaveCount(0);

    const lastTile = grid.locator(".edit-image-item").last();
    await lastTile.hover();
    await lastTile.locator(".edit-image-action-delete").click();

    const confirm = page.locator(".confirm-dialog");
    await expect(confirm).toBeVisible();
    await confirm.locator(".btn-danger").click();
    await expect(confirm).toBeHidden();

    await expect(grid.locator(".edit-image-item")).toHaveCount(MAX_WEB_IMAGES - 1);
    await expect(grid.locator(".upload-tile")).toHaveCount(1);
    await expect(modal.locator(".image-count-info")).toHaveText(`${MAX_WEB_IMAGES - 1} / ${MAX_WEB_IMAGES} images`);

    // Restore by uploading one replacement image so the project stays at the cap for parallel test isolation.
    const fileInput = modal.locator('.media-manager input[type="file"]');
    await fileInput.setInputFiles([fakeJpeg(999)]);
    await expect(grid.locator(".edit-image-item")).toHaveCount(MAX_WEB_IMAGES, { timeout: 10000 });
    await expect(grid.locator(".upload-tile")).toHaveCount(0);
  });
});
