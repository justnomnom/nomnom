import { type Page, expect } from '@playwright/test';

type VisibleOptions = { timeout?: number };

/** SentryErrorBoundary fallback — CompactLayout header has no mobile nav trigger. */
export const MARKETING_HOME_ERROR_EYEBROW = /kitchen mishap/i;

/** NavMobile IconButton aria-label (en: "Open main menu"). */
export const MOBILE_NAV_TRIGGER_NAME = /Open main menu/i;

const MARKETING_HOME_GOTO = { waitUntil: 'domcontentloaded' as const, timeout: 180_000 };

/**
 * Marketing `/` can briefly show SplashScreen or SentryErrorBoundary during webpack dev compiles.
 * Retry navigation when the kitchen-mishap fallback or mobile nav trigger is missing.
 */
export async function gotoMarketingHomeStable(page: Page): Promise<void> {
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt === 0) {
      await page.goto('/', MARKETING_HOME_GOTO);
    } else {
      await page.reload(MARKETING_HOME_GOTO);
    }
    await expect(page).toHaveURL(/\/$/);

    const onErrorFallback = await page
      .getByText(MARKETING_HOME_ERROR_EYEBROW)
      .isVisible()
      .catch(() => false);

    if (onErrorFallback) {
      continue;
    }

    try {
      await expectMarketingHomeShell(page, { timeout: 60_000 });
      return;
    } catch {
      // SplashScreen or hydration race — retry with a fresh navigation.
    }
  }

  await expectMarketingHomeShell(page, { timeout: 60_000 });
}

/** Marketing home with MainLayout header — not the CompactLayout error fallback. */
export async function expectMarketingHomeShell(
  page: Page,
  options?: VisibleOptions
): Promise<void> {
  await expect(page.getByText(MARKETING_HOME_ERROR_EYEBROW)).toHaveCount(0, options);
  await expect(page.getByRole('button', { name: MOBILE_NAV_TRIGGER_NAME })).toBeVisible(options);
  await expect(page.locator('#main-content')).toBeVisible(options);
}

/**
 * Shared app chrome uses `#main-content` (MainLayout, CompactLayout, dashboard).
 * Auth layouts use `<main>` without that id. Waits through first-paint / hydration races.
 */
export async function expectAppShellMainVisible(
  page: Page,
  options?: VisibleOptions
): Promise<void> {
  const mainRegion = page.locator('#main-content').or(page.getByRole('main'));
  await expect(mainRegion.first()).toBeVisible(options);
}

/**
 * `/dashboard/**` routes without a session render the auth gate (“Continue with Google”).
 * `expectAppShellMainVisible` alone can pass on that screen because it still exposes `<main>`.
 */
export async function expectSignedInDashboardShell(
  page: Page,
  options?: VisibleOptions
): Promise<void> {
  await expectAppShellMainVisible(page, options);
  await expect(page.getByRole('button', { name: /Continue with Google/i })).toHaveCount(0, options);
}
