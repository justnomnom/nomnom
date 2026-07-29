import { expect, test } from '@playwright/test';

import { expectAppShellMainVisible } from '../support/page-assertions';
import { hasServiceRoleCredentials } from '../support/service-role';
import { getAnyRestaurantId } from '../support/supabase-service';

/**
 * Public entity routes that need a real id from the database (service role) or a deterministic slug.
 */
test.describe('public restaurant share link', () => {
  test.beforeEach(({}, testInfo) => {
    if (!hasServiceRoleCredentials()) {
      testInfo.skip(true, 'Set E2E_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY for DB sample lookups');
    }
  });

  test('loads /restaurants/:id when a restaurant exists', async ({ page }) => {
    const id = await getAnyRestaurantId();
    test.skip(!id, 'No rows in public.restaurants — seed data or skip');

    await page.goto(`/restaurants/${id}`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`/restaurants/${id}`));
    await expectAppShellMainVisible(page, { timeout: 45_000 });
  });
});

test.describe('blog post detail (public)', () => {
  test('missing slug shows post not found empty state', async ({ page }) => {
    const slug = `e2e-missing-post-${Date.now()}`;
    await page.goto(`/post/${slug}`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`/post/${slug}`));
    await expectAppShellMainVisible(page, { timeout: 45_000 });
    await expect(page.getByText('Post Not Found')).toBeVisible({ timeout: 30_000 });
  });
});
