import { expect, test } from '@playwright/test';

import { expectAppShellMainVisible } from '../support/page-assertions';

/**
 * Auth error paths and form validation (TEST-PLAN A3, A5, A6 render side).
 * Never creates accounts or sends recovery emails: only invalid submits and renders.
 */
test.describe('auth — login error path', () => {
  test('wrong credentials show an error and stay on /auth/login', async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto('/auth/login', { waitUntil: 'load', timeout: 120_000 });

    await page.locator('input[name="email"]').fill('e2e-nonexistent-user@example.com');
    await page.locator('input[name="password"]').fill('definitely-wrong-password-123');
    await page.locator('form button[type="submit"]').click();

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe('auth — register form', () => {
  test('renders all fields and blocks an empty submit with validation errors', async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto('/auth/register', { waitUntil: 'load', timeout: 120_000 });
    await expectAppShellMainVisible(page, { timeout: 45_000 });

    for (const field of ['email', 'password']) {
      await expect(page.locator(`input[name="${field}"]`)).toBeVisible({ timeout: 15_000 });
    }

    await page.locator('form button[type="submit"]').click();

    // React Hook Form + MUI render `.Mui-error` helper texts; no account is created.
    await expect(page.locator('.Mui-error').first()).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('password shorter than 6 characters is rejected client-side', async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto('/auth/register', { waitUntil: 'load', timeout: 120_000 });

    await page.locator('input[name="email"]').fill('e2e-shortpw@example.com');
    await page.locator('input[name="password"]').fill('12345');
    await page.locator('form button[type="submit"]').click();

    await expect(page.locator('.Mui-error').first()).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/auth\/register/);
  });
});

test.describe('auth — recovery pages render', () => {
  test('forgot-password renders the email form', async ({ page }) => {
    await page.goto('/auth/forgot-password', { waitUntil: 'load', timeout: 120_000 });
    await expectAppShellMainVisible(page, { timeout: 45_000 });
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('form button[type="submit"]')).toBeVisible();
  });

  test('verify page renders', async ({ page }) => {
    await page.goto('/auth/verify', { waitUntil: 'load', timeout: 120_000 });
    await expect(page).toHaveURL(/\/auth\/verify/);
    await expectAppShellMainVisible(page, { timeout: 45_000 });
  });
});
