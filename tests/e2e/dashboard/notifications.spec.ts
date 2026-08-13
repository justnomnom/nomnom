import { expect, test } from '@playwright/test';

import { expectSignedInDashboardShell } from '../support/page-assertions';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

/**
 * Webpack first compile of a dashboard route shows the splash; wait it out.
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 */
async function gotoSignedInDashboard(page, path) {
  await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const splash = page.getByText('Pulling up the menu...');
  if (await splash.isVisible().catch(() => false)) {
    await splash.waitFor({ state: 'hidden', timeout: 90_000 }).catch(() => {});
  }
  await expectSignedInDashboardShell(page, { timeout: 90_000 });
}

/**
 * Notifications surfaces + API smoke for authenticated users.
 * Does not require seeded notification rows — empty feed is a valid state.
 */
test.describe('dashboard notifications', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('history page renders shell + empty or list UI', async ({ page }) => {
    test.setTimeout(180_000);
    await gotoSignedInDashboard(page, '/dashboard/notifications');
    await expect(page).toHaveURL(/\/dashboard\/notifications/);
    await expect(page.getByText('Notifications').first()).toBeVisible({ timeout: 45_000 });
    // Empty copy, or the history toolbar when items exist (Tooltip clones aria-label onto a span).
    await expect(
      page
        .getByText('Calm for now. Check back later.')
        .or(page.getByRole('button', { name: 'Mark all as read' }))
        .or(page.getByRole('button', { name: 'Delete all' }))
        .first()
    ).toBeVisible({ timeout: 45_000 });
  });

  test('settings notifications page renders preference toggles', async ({ page }) => {
    test.setTimeout(180_000);
    await gotoSignedInDashboard(page, '/dashboard/settings/notifications');
    await expect(page).toHaveURL(/\/dashboard\/settings\/notifications/);
    await expect(page.getByText('List updates')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('Show in the app')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Send to my devices')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Email me a daily digest')).toBeVisible({ timeout: 15_000 });
  });

  test('email digest toggle persists after reload', async ({ page }) => {
    test.setTimeout(180_000);
    await gotoSignedInDashboard(page, '/dashboard/settings/notifications');
    const emailLabel = page.getByText('Email me a daily digest', { exact: true });
    await expect(emailLabel).toBeVisible({ timeout: 15_000 });
    const emailSwitch = emailLabel.locator('xpath=following::input[@type="checkbox"][1]');
    const wasChecked = await emailSwitch.isChecked();
    const saved = page.waitForResponse(
      (res) =>
        res.request().method() === 'POST' &&
        res.url().includes('/dashboard/settings/notifications'),
      { timeout: 20_000 }
    );
    await emailSwitch.click();
    await saved;
    await expect(emailSwitch).toHaveJSProperty('checked', !wasChecked);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
    const splash = page.getByText('Pulling up the menu...');
    if (await splash.isVisible().catch(() => false)) {
      await splash.waitFor({ state: 'hidden', timeout: 90_000 }).catch(() => {});
    }
    await expectSignedInDashboardShell(page, { timeout: 60_000 });
    await expect(page.getByText('List updates')).toBeVisible({ timeout: 45_000 });
    await expect(emailLabel).toBeVisible({ timeout: 15_000 });
    await expect(emailSwitch).toHaveJSProperty('checked', !wasChecked);
    const restored = page.waitForResponse(
      (res) =>
        res.request().method() === 'POST' &&
        res.url().includes('/dashboard/settings/notifications'),
      { timeout: 20_000 }
    );
    await emailSwitch.click();
    await restored;
    await expect(emailSwitch).toHaveJSProperty('checked', wasChecked);
  });

  test('GET /api/notifications returns feed shape for signed-in user', async ({ request }) => {
    const res = await request.get('/api/notifications');
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.notifications)).toBe(true);
    expect(typeof json.unreadCount).toBe('number');
    expect(typeof json.hasMore).toBe('boolean');
  });

  test('POST read/delete with missing target → 400', async ({ request }) => {
    const readRes = await request.post('/api/notifications/read', { data: {} });
    expect(readRes.status()).toBe(400);
    expect((await readRes.json()).error).toBe('missing_target');

    const deleteRes = await request.post('/api/notifications/delete', { data: { id: '' } });
    expect(deleteRes.status()).toBe(400);
    expect((await deleteRes.json()).error).toBe('missing_target');
  });

  test('POST mark-all-read succeeds', async ({ request }) => {
    const res = await request.post('/api/notifications/read', { data: { all: true } });
    expect(res.status()).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  test('bell control is reachable from dashboard shell', async ({ page }) => {
    test.setTimeout(180_000);
    await gotoSignedInDashboard(page, '/dashboard/discover');
    const bell = page.getByLabel('Open notifications');
    await expect(bell).toBeVisible({ timeout: 45_000 });
    await bell.click();
    await expect(
      page
        .getByText('Calm for now. Check back later.')
        .or(page.getByText('See all'))
        .or(page.getByText('All'))
    ).toBeVisible({ timeout: 15_000 });
  });
});
