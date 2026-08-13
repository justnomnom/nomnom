import { expect, test } from '@playwright/test';

import { expectAppShellMainVisible } from '../support/page-assertions';

/**
 * Pricing content assertions (TEST-PLAN P1) and error/404 shells (E1, M1 negative path).
 * `smoke-public.spec.ts` only checks that /pricing loads; this checks the content contract.
 */
test.describe('pricing page content', () => {
  test('renders free and paid sections with resolved translations', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/pricing', { waitUntil: 'load', timeout: 120_000 });
    await expectAppShellMainVisible(page, { timeout: 45_000 });

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
    // Free tier + paid lists explainer render as h2 sections.
    expect(await page.getByRole('heading', { level: 2 }).count()).toBeGreaterThanOrEqual(2);

    // Raw i18n keys leaking into the page means a missing translation.
    const body = await page.locator('main').innerText();
    expect(body).not.toContain('pages.pricing.');
  });
});

test.describe('error pages', () => {
  for (const code of ['403', '404', '500'] as const) {
    test(`/error/${code} renders its shell`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.goto(`/error/${code}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      await expect(page).toHaveURL(new RegExp(`/error/${code}`));
      await expectAppShellMainVisible(page, { timeout: 45_000 });
    });
  }

  test('unknown content slug renders not-found, not a crash', async ({ page }) => {
    await page.goto('/use-cases/definitely-not-a-real-slug-xyz', {
      waitUntil: 'load',
      timeout: 120_000,
    });
    // Dev streams a soft 404 (status 200) once the shell has flushed; prod static
    // rendering returns a real 404. Assert the branded not-found UI instead of the status.
    await expect(page.getByText(/Error 404/i).first()).toBeVisible({ timeout: 45_000 });
  });
});
