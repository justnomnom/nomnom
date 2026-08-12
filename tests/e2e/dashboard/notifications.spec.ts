import { expect, test } from '@playwright/test';

import { expectSignedInDashboardShell } from '../support/page-assertions';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

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
    test.setTimeout(150_000);
    await page.goto('/dashboard/notifications', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await expect(page).toHaveURL(/\/dashboard\/notifications/);
    await expectSignedInDashboardShell(page, { timeout: 45_000 });
    await expect(page.getByText('Notifications').first()).toBeVisible({ timeout: 45_000 });
    // Either empty copy or mark-all / delete toolbar (when items exist).
    await expect(
      page
        .getByText('Calm for now. Check back later.')
        .or(page.getByLabel('Mark all as read'))
        .or(page.getByLabel('Delete all'))
    ).toBeVisible({ timeout: 45_000 });
  });

  test('settings notifications page renders preference toggles', async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto('/dashboard/settings/notifications', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await expect(page).toHaveURL(/\/dashboard\/settings\/notifications/);
    await expectSignedInDashboardShell(page, { timeout: 45_000 });
    await expect(page.getByText('List updates')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('Show in the app')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Send to my devices')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Email me a daily digest')).toBeVisible({ timeout: 15_000 });
  });

  test('GET /api/notifications returns feed shape for signed-in user', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/dashboard/notifications', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await expectSignedInDashboardShell(page, { timeout: 45_000 });

    const res = await page.request.get('/api/notifications');
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.notifications)).toBe(true);
    expect(typeof json.unreadCount).toBe('number');
    expect(typeof json.hasMore).toBe('boolean');
  });

  test('POST read/delete with missing target → 400', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/dashboard/notifications', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await expectSignedInDashboardShell(page, { timeout: 45_000 });

    const readRes = await page.request.post('/api/notifications/read', { data: {} });
    expect(readRes.status()).toBe(400);
    expect((await readRes.json()).error).toBe('missing_target');

    const deleteRes = await page.request.post('/api/notifications/delete', { data: { id: '' } });
    expect(deleteRes.status()).toBe(400);
    expect((await deleteRes.json()).error).toBe('missing_target');
  });

  test('POST mark-all-read succeeds', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/dashboard/notifications', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await expectSignedInDashboardShell(page, { timeout: 45_000 });

    const res = await page.request.post('/api/notifications/read', { data: { all: true } });
    expect(res.status()).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  test('bell control is reachable from dashboard shell', async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto('/dashboard/discover', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await expectSignedInDashboardShell(page, { timeout: 45_000 });
    const bell = page.getByLabel('Open notifications');
    await expect(bell).toBeVisible({ timeout: 45_000 });
    await bell.click();
    // Popover shows empty state or notification rows.
    await expect(
      page
        .getByText('Calm for now. Check back later.')
        .or(page.getByText('See all'))
        .or(page.getByText('All'))
    ).toBeVisible({ timeout: 15_000 });
  });
});
