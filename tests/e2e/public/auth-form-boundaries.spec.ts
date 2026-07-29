import { expect, test } from '@playwright/test';

import { expectAppShellMainVisible } from '../support/page-assertions';

/**
 * Input-boundary corner cases for the auth forms (Yup schema in supabase-register-view:
 * email format, password min 6). No accounts are created and no recovery emails are
 * sent — every case is a rejected/invalid submit.
 */

test.describe('register — field boundaries', () => {
  test('short password (< 6) shows a validation error and does not submit', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/auth/register', { waitUntil: 'load', timeout: 120_000 });

    await page.locator('input[name="email"]').fill('e2e-shortpw@example.com');
    await page.locator('input[name="password"]').fill('123');
    await page.locator('form button[type="submit"]').click();

    await expect(page.locator('.Mui-error').first()).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('invalid email format is blocked (no navigation away from register)', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/auth/register', { waitUntil: 'load', timeout: 120_000 });

    await page.locator('input[name="email"]').fill('not-an-email');
    await page.locator('input[name="password"]').fill('ValidPass123');
    await page.locator('form button[type="submit"]').click();

    // Native type=email validity may block submit, or Yup surfaces a Mui error — either way
    // we must stay on /register and never reach a signed-in/verify state.
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('empty email is rejected', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/auth/register', { waitUntil: 'load', timeout: 120_000 });

    await page.locator('input[name="password"]').fill('ValidPass123');
    await page.locator('form button[type="submit"]').click();

    await expect(page.locator('.Mui-error').first()).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/auth\/register/);
  });
});

test.describe('forgot-password — boundaries', () => {
  test('invalid email does not proceed', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/auth/forgot-password', { waitUntil: 'load', timeout: 120_000 });
    await page.locator('input[name="email"]').fill('not-an-email');
    await page.locator('form button[type="submit"]').click();
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/auth\/forgot-password/);
  });
});

test.describe('new-password — direct entry without a recovery token', () => {
  test('renders without crashing', async ({ page }) => {
    await page.goto('/auth/new-password', { waitUntil: 'load', timeout: 120_000 });
    await expect(page).toHaveURL(/\/auth\/new-password/);
    await expectAppShellMainVisible(page, { timeout: 45_000 });
  });
});
