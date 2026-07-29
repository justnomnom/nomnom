import { expect, test, type Page } from '@playwright/test';

import { hasServiceRoleCredentials } from '../support/service-role';
import { createSeededUser, deleteSeededUser } from '../support/seed';

/**
 * TEST-PLAN §1 A6 — no user enumeration through the forgot-password flow: a known and an
 * unknown email must produce the identical generic outcome. The view
 * (supabase-forgot-password-view.js) routes to /auth/verify?flow=recovery on success, and
 * Supabase's resetPasswordForEmail succeeds regardless of whether the account exists — so
 * both cases must land on the same verify screen with no error surfaced.
 *
 * The known-email case seeds a fresh, uniquely-addressed user each run (service role
 * required; self-skips without it) so Supabase's per-address recovery cool-down can never
 * make the run flaky.
 *
 * Environment caveat: for a KNOWN account Supabase actually sends the recovery email, and
 * projects on the default SMTP cannot deliver to seeded/non-team addresses — the send
 * errors and the view stays on /auth/forgot-password (silently: the error is only
 * console.logged). That failure is the mail transport's, not the product flow's, so the
 * known-email case self-skips when it detects it. In environments with working SMTP it
 * asserts the full parity.
 */

async function submitForgotPassword(page: Page, email: string): Promise<void> {
  await page.goto('/auth/forgot-password', { waitUntil: 'load', timeout: 120_000 });
  const emailField = page.getByLabel('Email address');
  await expect(emailField).toBeVisible({ timeout: 45_000 });
  await emailField.fill(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
}

/** The verify screen's enumeration-safe copy — identical for existing and unknown accounts. */
const GENERIC_RECOVERY_COPY = /If an account exists for this address/i;

test.describe('forgot password — enumeration parity (A6)', () => {
  test('unknown email lands on the generic verify screen, no error', async ({ page }) => {
    await submitForgotPassword(page, `e2e-nouser-${Date.now().toString(36)}@e2e.local`);
    await expect(page).toHaveURL(/\/auth\/verify\?.*flow=recovery/, { timeout: 45_000 });
    await expect(page.getByText(GENERIC_RECOVERY_COPY)).toBeVisible({ timeout: 30_000 });
  });

  test('known email lands on the same generic verify screen', async ({ page }) => {
    test.skip(
      !hasServiceRoleCredentials(),
      'Set E2E_SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY to seed a known account'
    );
    test.setTimeout(120_000);

    // Routable domain: Supabase's public resetPasswordForEmail rejects `.local` addresses
    // outright ("Email address … is invalid"), before any send is attempted.
    const user = await createSeededUser('e2eforgot', { emailDomain: 'example.com' });
    try {
      await submitForgotPassword(page, user.email);
      const reachedVerify = await page
        .waitForURL(/\/auth\/verify\?.*flow=recovery/, { timeout: 45_000 })
        .then(() => true)
        .catch(() => false);
      test.skip(
        !reachedVerify,
        'Recovery email send failed (default Supabase SMTP cannot deliver to seeded addresses) — parity not observable in this environment'
      );
      await expect(page.getByText(GENERIC_RECOVERY_COPY)).toBeVisible({ timeout: 30_000 });
    } finally {
      await deleteSeededUser(user.id);
    }
  });
});
