import { expect, test } from '@playwright/test';

import { APP_NOT_FOUND_HEADING, expectAppShellMainVisible } from '../support/page-assertions';

/**
 * Editorial and geo marketing routes backed by MDX or static shells in `src/routes/paths.js` (`paths.site`).
 * Unauthenticated; complements `smoke-public.spec.ts` and `smoke-public-extended.spec.ts`.
 */
test.describe.configure({ mode: 'serial' });

test.describe('features and resources hubs', () => {
  test('features index', async ({ page }) => {
    await page.goto('/features', { waitUntil: 'load', timeout: 120_000 });
    await expect(page).toHaveURL(/\/features$/);
    await expectAppShellMainVisible(page, { timeout: 45_000 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
  });

  test('resources index', async ({ page }) => {
    await page.goto('/resources', { waitUntil: 'load', timeout: 120_000 });
    await expect(page).toHaveURL(/\/resources$/);
    await expectAppShellMainVisible(page, { timeout: 45_000 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('use cases hub and MDX slugs', () => {
  test('use cases index', async ({ page }) => {
    await page.goto('/use-cases', { waitUntil: 'load', timeout: 120_000 });
    await expect(page).toHaveURL(/\/use-cases$/);
    await expectAppShellMainVisible(page, { timeout: 45_000 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
  });

  for (const slug of ['foodies', 'creators', 'restaurants', 'hosts'] as const) {
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

  test('hub drills into portugal then lisbon (M2)', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/countries', { waitUntil: 'load', timeout: 120_000 });
    await expectAppShellMainVisible(page, { timeout: 45_000 });
    await page.getByRole('link', { name: /^portugal$/i }).click();
    await expect(page).toHaveURL(/\/countries\/portugal$/);
    await expectAppShellMainVisible(page, { timeout: 45_000 });
    await page.getByRole('link', { name: /^lisbon$/i }).click();
    await expect(page).toHaveURL(/\/countries\/portugal\/lisbon$/);
    await expectAppShellMainVisible(page, { timeout: 45_000 });
  });

  test('Lisbon restaurant list paginates, filters by tag, and opens a detail slug', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await page.goto('/countries/portugal/lisbon/restaurants', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await expectAppShellMainVisible(page, { timeout: 45_000 });
    await expect(page.getByRole('heading', { name: /Restaurants in lisbon/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('link', { name: /Time Out Market/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Next page/i })).toBeVisible();

    await page.goto('/countries/portugal/lisbon/restaurants/page/2', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await expectAppShellMainVisible(page, { timeout: 45_000 });
    await expect(page.getByRole('link', { name: /Previous page/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Manteigaria/i })).toBeVisible();

    await page.goto('/countries/portugal/lisbon/restaurants/tag/tasca', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await expectAppShellMainVisible(page, { timeout: 45_000 });
    await expect(
      page.getByRole('heading', { name: /Restaurants in lisbon — tasca/i })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Zé da Mouraria/i })).toBeVisible();

    await page.goto('/countries/portugal/lisbon/restaurants/time-out-market', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await expectAppShellMainVisible(page, { timeout: 45_000 });
    await expect(page.getByRole('heading', { name: /Time Out Market/i })).toBeVisible();
  });

  test('invalid restaurant list parts 404 (page 1, unknown slug)', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/countries/portugal/lisbon/restaurants/page/1', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await expect(page.getByRole('heading', { name: APP_NOT_FOUND_HEADING })).toBeVisible({
      timeout: 30_000,
    });

    await page.goto('/countries/portugal/lisbon/restaurants/e2e-no-such-tasca', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await expect(page.getByRole('heading', { name: APP_NOT_FOUND_HEADING })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('collection and influencer MDX documents render (M1/M2)', async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto('/collections/lisbon-lunch-shortlist', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await expectAppShellMainVisible(page, { timeout: 45_000 });
    await expect(page.getByRole('heading', { name: /Lisbon lunch shortlist/i })).toBeVisible();

    await page.goto('/countries/portugal/collections/late-kitchen-lisbon', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await expectAppShellMainVisible(page, { timeout: 45_000 });
    await expect(page.getByRole('heading', { name: /Late kitchen in Lisbon/i })).toBeVisible();

    await page.goto('/countries/portugal/lisbon/collections/alfama-on-foot', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await expectAppShellMainVisible(page, { timeout: 45_000 });
    await expect(page.getByRole('heading', { name: /Alfama on foot/i })).toBeVisible();

    await page.goto('/countries/portugal/influencers', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await expectAppShellMainVisible(page, { timeout: 45_000 });
    await page.getByRole('link', { name: /Inês — Lisbon weekday lunches/i }).click();
    await expect(page).toHaveURL(/\/countries\/portugal\/influencers\/ines-lisboa$/);
    await expectAppShellMainVisible(page, { timeout: 45_000 });
    await expect(page.getByRole('heading', { name: /Inês — Lisbon weekday lunches/i })).toBeVisible();
  });
});

test.describe('auth — new password entry', () => {
  test('new password page loads (Supabase recovery entry)', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/auth/new-password', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await expect(page).toHaveURL(/\/auth\/new-password/);
    await expectAppShellMainVisible(page, { timeout: 45_000 });
  });
});
