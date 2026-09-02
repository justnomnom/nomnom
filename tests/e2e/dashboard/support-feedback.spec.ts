import { expect, test, type Page } from '@playwright/test';

import { getDefaultTranslation as tr } from '../../../src/locales/default-translations';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

/**
 * Support form + Feedback page (S6, docs/TEST-PLAN.md §10).
 *
 * The support form (`/dashboard/settings/support`) posts through the `sendContactInquiryEmail`
 * Server Action, which rate-limits per IP (5/hour) before attempting delivery. The form UI
 * collapses every failure — rate limit, unconfigured Resend, delivery error — to one friendly
 * translated alert (`role="alert"`), and shows a `role="status"` alert on success. The limiter's
 * counting logic is unit-tested (src/libs/email/__tests__/rate-limit-memory.test.mjs); these
 * specs assert the UI wiring and the friendly-error surface.
 *
 * The Feedback page (`/dashboard/feedback`) is a Sleekplan embed + help links (no native form),
 * so it's covered by rendering + the link-through to the support form.
 */

const SUBMIT = tr('pages.contact_us.form.submit');
const SUCCESS = tr('pages.contact_us.form.success');
const ERROR = tr('pages.contact_us.form.error');
const TOPIC_SUPPORT = tr('pages.contact_us.form.topics.support');

async function fillSupportForm(page: Page, over: Partial<Record<string, string>> = {}) {
  const stamp = Date.now();
  await page.getByRole('button', { name: over.topic ?? TOPIC_SUPPORT }).click();
  await page.getByLabel(tr('pages.contact_us.form.email')).fill(over.email ?? `e2e+${stamp}@e2e.local`);
  await page.getByLabel(tr('pages.contact_us.form.name')).fill(over.name ?? 'E2E Tester');
  await page
    .getByLabel(tr('pages.contact_us.form.message'))
    .fill(over.message ?? `E2E message ${stamp}`);
}

test.describe('dashboard settings — support form & feedback', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
  });

  test('support form renders, accepts input, and surfaces a friendly result (happy path)', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto('/dashboard/settings/support', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });

    const submit = page.getByRole('button', { name: SUBMIT });
    await expect(submit).toBeVisible({ timeout: 45_000 });

    await fillSupportForm(page);
    await submit.click();

    // The submission resolves to a friendly notification — success where email is configured,
    // otherwise the friendly error — never a crash or hang. Either proves the field → action →
    // notification wiring end to end.
    const success = page.getByRole('status').filter({ hasText: SUCCESS });
    const failure = page.getByRole('alert').filter({ hasText: ERROR });
    await expect(success.or(failure)).toBeVisible({ timeout: 30_000 });

    // When delivery actually succeeds, the form resets its fields.
    if (await success.isVisible()) {
      await expect(page.getByLabel(tr('pages.contact_us.form.email'))).toHaveValue('');
      await expect(page.getByLabel(tr('pages.contact_us.form.message'))).toHaveValue('');
    }
  });

  test('repeated submits surface the friendly rate-limit error', async ({ page }) => {
    test.setTimeout(150_000);
    await page.goto('/dashboard/settings/support', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });

    const submit = page.getByRole('button', { name: SUBMIT });
    await expect(submit).toBeVisible({ timeout: 45_000 });

    // 5/hour budget: after ~6 attempts the limiter rejects and the friendly error alert shows.
    // (Re-fill each time: on a real success the form clears required fields.)
    const failure = page.getByRole('alert').filter({ hasText: ERROR });
    for (let i = 0; i < 7; i += 1) {
      await fillSupportForm(page);
      await submit.click();
      // Wait for the action to settle (button leaves its loading/disabled state).
      await expect(submit).toBeEnabled({ timeout: 30_000 });
      if (await failure.isVisible()) break;
    }

    await expect(failure).toBeVisible({ timeout: 30_000 });
  });

  test('feedback page renders and links through to the support form', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/dashboard/feedback', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });

    // Drill-shell h1 is "Feedback"; the embed section is a separate "Feedback & requests" h2.
    await expect(
      page.getByRole('heading', { level: 1, name: tr('pages.dashboard.feedback.title'), exact: true })
    ).toBeVisible({ timeout: 45_000 });

    const supportLink = page.locator('a[href$="/settings/support"]').first();
    await expect(supportLink).toBeVisible();
    const href = await supportLink.getAttribute('href');
    // Warm the destination: App Router click after a cold compile can sit on a blank
    // document until webpack finishes the support route.
    if (href) await page.request.get(href);

    await supportLink.click();
    await expect(page).toHaveURL(/\/dashboard\/settings\/support/, { timeout: 90_000 });
    await expect(page.getByRole('heading', { name: /contact us/i }).first()).toBeVisible({
      timeout: 90_000,
    });
    await expect(page.getByRole('button', { name: SUBMIT })).toBeVisible({ timeout: 90_000 });
  });
});
