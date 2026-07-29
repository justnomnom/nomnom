import { expect, test } from '@playwright/test';

import { expectAppShellMainVisible } from '../support/page-assertions';

/**
 * Editorial and geo marketing routes backed by MDX or static shells in `src/routes/paths.js` (`paths.site`).
 * Unauthenticated; complements `smoke-public.spec.ts` and `smoke-public-extended.spec.ts`.
 */
test.describe.configure({ mode: 'serial' });

test.describe('use cases hub and MDX slugs', () => {
  test('use cases index', async ({ page }) => {
    await page.goto('/use-cases', { waitUntil: 'load', timeout: 120_000 });
    await expect(page).toHaveURL(/\/use-cases$/);
    await expectAppShellMainVisible(page, { timeout: 45_000 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
  });

  for (const slug of ['foodies', 'creators', 'restaurants'] as const) {
    test(`use case /use-cases/${slug}`, async ({ page }) => {
      await page.goto(`/use-cases/${slug}`, { waitUntil: 'load', timeout: 120_000 });
      await expect(page).toHaveURL(new RegExp(`/use-cases/${slug}$`));
      await expectAppShellMainVisible(page, { timeout: 45_000 });
      await expect(page.getByRole('main')).toBeVisible();
    });
  }
});

test.describe('Portugal geo shell (sitemap-backed)', () => {
  const paths = [
    '/countries/portugal',
    '/countries/portugal/lisbon',
    '/countries/portugal/lisbon/restaurants',
    '/countries/portugal/influencers',
  ];

  for (const path of paths) {
    test(`loads ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'load', timeout: 120_000 });
      await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
      await expectAppShellMainVisible(page, { timeout: 45_000 });
    });
  }
});

test.describe('auth — new password entry', () => {
  test('new password page loads (Supabase recovery entry)', async ({ page }) => {
    await page.goto('/auth/new-password');
    await expect(page).toHaveURL(/\/auth\/new-password/);
    await expectAppShellMainVisible(page);
  });
});
