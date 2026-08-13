import { expect, test } from '@playwright/test';

import { expectAppShellMainVisible } from '../support/page-assertions';

test.describe('public marketing shell', () => {
  test('about page loads', async ({ page }) => {
    test.setTimeout(120_000);
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await page.goto('/about', { waitUntil: 'domcontentloaded', timeout: 60_000 });
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
      }
    }
    if (lastError) throw lastError;
    await expect(page).toHaveURL(/\/about/);
    await expectAppShellMainVisible(page, { timeout: 45_000 });
  });

  test('pricing page loads', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveURL(/\/pricing/);
    await expectAppShellMainVisible(page);
  });
});
