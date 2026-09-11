import { expect, test, type Page } from '@playwright/test';
import { type SupabaseClient } from '@supabase/supabase-js';

import { loadE2EEnv } from '../load-env';
import { expectSignedInDashboardShell } from '../support/page-assertions';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { getServiceRoleClient, getUserIdByEmail } from '../support/supabase-service';
import { createOwnedList, deleteList } from '../support/seed';
import {
  E2E_DASHBOARD_AUTH_SETUP_HINT,
  getE2ETestUserEmailForDb,
} from '../support/test-credentials';

/** Webpack first compile of a dashboard route shows the splash; wait it out. */
async function gotoSignedInDashboard(page: Page, path: string) {
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

  test('bell feed mute persists notification_mutes row', async ({ page }) => {
    test.setTimeout(240_000);
    loadE2EEnv();
    const userId = await getUserIdByEmail(await getE2ETestUserEmailForDb());
    if (!userId) throw new Error('no e2e user id');
    const admin = getServiceRoleClient();

    const stamp = Date.now();
    const listName = `Mute feed list ${stamp}`;
    const restaurantName = `E2E Mute Spot ${stamp}`;
    const listId = await createOwnedList(userId, { name: listName });

    const { data: notification, error: insertErr } = await admin
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'list_update',
        data: {
          list_id: listId,
          list_name: listName,
          restaurant_name: restaurantName,
          creator_name: 'E2E Creator',
          creator_username: 'e2e',
        },
      })
      .select('id')
      .single();
    if (insertErr || !notification?.id) {
      throw new Error(`seed notification failed: ${insertErr?.message ?? 'no id'}`);
    }

    try {
      await gotoSignedInDashboard(page, '/dashboard/discover');
      const bell = page.getByLabel('Open notifications');
      await expect(bell).toBeVisible({ timeout: 45_000 });
      await bell.click();
      await expect(page.getByText(restaurantName)).toBeVisible({ timeout: 45_000 });

      const menuBtn = page
        .getByText(restaurantName, { exact: true })
        .locator(
          'xpath=ancestor::*[contains(@class,"MuiTypography-root")]/../../following-sibling::div//button[@aria-label="Notification options"]'
        );
      await menuBtn.click({ force: true });
      await page.getByRole('menuitem', { name: 'Mute this list' }).click();

      await expect
        .poll(() => readListMuteRow(admin, userId, listId), {
          timeout: 30_000,
          message: 'notification_mutes row missing after mute',
        })
        .toBe(true);
    } finally {
      await admin
        .from('notification_mutes')
        .delete()
        .eq('user_id', userId)
        .eq('target_type', 'list')
        .eq('target_id', listId);
      await admin.from('notifications').delete().eq('id', notification.id);
      await deleteList(listId);
    }
  });
});

/** Whether the signed-in user has muted list updates for a list. */
async function readListMuteRow(
  admin: SupabaseClient,
  userId: string,
  listId: string
): Promise<boolean> {
  const { data } = await admin
    .from('notification_mutes')
    .select('target_id')
    .eq('user_id', userId)
    .eq('target_type', 'list')
    .eq('target_id', listId)
    .maybeSingle();
  return Boolean(data);
}
