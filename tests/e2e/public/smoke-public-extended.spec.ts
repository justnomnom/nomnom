import { expect, test } from '@playwright/test';

import { expectAppShellMainVisible } from '../support/page-assertions';

/**
 * Unauthenticated routes: marketing shell, auth entry points, and global error pages.
 * Runs without Supabase E2E auth (public project).
 */
test.describe.configure({ mode: 'serial' });

test.describe('public home and marketing', () => {
  test('home page loads', async ({ page }) => {
    // `/` can briefly render a blank shell on the first webpack compile in dev; one reload usually stabilizes.
    test.setTimeout(120_000);
    await page.goto('/', { waitUntil: 'load', timeout: 120_000 });
    await expect(page).toHaveURL(/\/$/);
    try {
      await expectAppShellMainVisible(page, { timeout: 45_000 });
    } catch {
      await page.reload({ waitUntil: 'load', timeout: 120_000 });
      await expectAppShellMainVisible(page, { timeout: 45_000 });
    }
  });

  test('contact page loads', async ({ page }) => {
    await page.goto('/contact-us');
    await expect(page).toHaveURL(/\/contact-us/);
    await expectAppShellMainVisible(page);
  });

  test('FAQs page loads', async ({ page }) => {
    await page.goto('/faqs');
    await expect(page).toHaveURL(/\/faqs/);
    await expectAppShellMainVisible(page);
  });

  test('countries hub loads', async ({ page }) => {
    await page.goto('/countries');
    await expect(page).toHaveURL(/\/countries/);
    await expectAppShellMainVisible(page);
  });

  test('onboarding redirects to login when signed out', async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'load', timeout: 120_000 });
    try {
      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 20_000 });
    } catch {
      await page.reload({ waitUntil: 'load', timeout: 120_000 });
      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 20_000 });
    }
    await expectAppShellMainVisible(page);
  });

  test('maintenance page loads', async ({ page }) => {
    await page.goto('/maintenance');
    await expect(page).toHaveURL(/\/maintenance/);
    await expectAppShellMainVisible(page);
  });

  test('coming soon page loads', async ({ page }) => {
    await page.goto('/coming-soon');
    await expect(page).toHaveURL(/\/coming-soon/);
    await expectAppShellMainVisible(page);
  });
});

test.describe('public auth entry points (no submission)', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page).toHaveURL(/\/auth\/login/);
    await expectAppShellMainVisible(page);
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page).toHaveURL(/\/auth\/register/);
    await expectAppShellMainVisible(page);
  });

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await expect(page).toHaveURL(/\/auth\/forgot-password/);
    await expectAppShellMainVisible(page);
  });

  test('verify email page loads', async ({ page }) => {
    await page.goto('/auth/verify');
    await expect(page).toHaveURL(/\/auth\/verify/);
    await expectAppShellMainVisible(page);
  });
});

test.describe('public error pages', () => {
  test('404 page renders', async ({ page }) => {
    await page.goto('/error/404');
    await expect(page).toHaveURL(/\/error\/404/);
    await expectAppShellMainVisible(page);
  });

  test('403 page renders', async ({ page }) => {
    await page.goto('/error/403', { waitUntil: 'load', timeout: 120_000 });
    await expect(page).toHaveURL(/\/error\/403/);
    try {
      await expectAppShellMainVisible(page, { timeout: 45_000 });
    } catch {
      await page.reload({ waitUntil: 'load', timeout: 120_000 });
      await expectAppShellMainVisible(page, { timeout: 45_000 });
    }
  });

  test('500 page renders', async ({ page }) => {
    await page.goto('/error/500', { waitUntil: 'load', timeout: 120_000 });
    await expect(page).toHaveURL(/\/error\/500/);
    try {
      await expectAppShellMainVisible(page, { timeout: 45_000 });
    } catch {
      await page.reload({ waitUntil: 'load', timeout: 120_000 });
      await expectAppShellMainVisible(page, { timeout: 45_000 });
    }
  });
});
