import { expect, test } from '@playwright/test';

import { expectAppShellMainVisible } from '../support/page-assertions';

test.describe('public marketing shell', () => {
  test('about page loads', async ({ page }) => {
    await page.goto('/about');
    await expect(page).toHaveURL(/\/about/);
    await expectAppShellMainVisible(page);
  });

  test('pricing page loads', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveURL(/\/pricing/);
    await expectAppShellMainVisible(page);
  });
});
