import { test, expect } from '@playwright/test';

test('homepage loads and shows header', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Sint Lucas Masters/);
  await expect(page.locator('header h1')).toHaveText('Sint Lucas Masters');
});

test('archive page loads', async ({ page }) => {
  await page.goto('/archive');
  await expect(page).toHaveTitle(/Archive.*Sint Lucas Masters/);
  await expect(page.getByRole('heading', { name: 'Archive', level: 2 })).toBeVisible();
});
