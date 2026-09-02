import { expect, test } from '@playwright/test';

/**
 * Coverage for public pages that had no spec (TEST-PLAN §9 RO2, §12 M4 + legal):
 * /privacy, /terms, the logged-out /roleta/lisboa tool page, and the generated
 * sitemap/robots endpoints. Unauthenticated (public project).
 *
 * The legal/roulette pages render outside the shared app shell (no `#main-content` /
 * `main` landmark), so these tests assert their concrete content, not the chrome.
 * Tests are independent — no serial mode, so one failure can't mask the rest.
 */

test.describe('legal pages', () => {
  test('privacy policy renders', async ({ page }) => {
    await page.goto('/privacy', { waitUntil: 'load', timeout: 120_000 });
    await expect(page.getByRole('heading', { name: 'Privacy policy' })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByText(/Last updated:/i)).toBeVisible();
  });

  test('terms of service renders', async ({ page }) => {
    await page.goto('/terms', { waitUntil: 'load', timeout: 120_000 });
    await expect(page.getByRole('heading', { name: 'Terms of service' })).toBeVisible({
      timeout: 45_000,
    });
  });
});

test.describe('public roulette — /roleta/lisboa (RO2)', () => {
  test('renders logged out with a spin control and a sign-up CTA carrying returnTo', async ({
    page,
  }) => {
    await page.goto('/roleta/lisboa', { waitUntil: 'load', timeout: 120_000 });

    await expect(page.getByText('NomNom Roulette in Lisbon').first()).toBeVisible({
      timeout: 30_000,
    });
    // The spin CTA is disabled only while the restaurant pool loads.
    await expect(page.getByRole('button', { name: /Spin NomNom Roulette/i })).toBeVisible({
      timeout: 30_000,
    });

    // Signup CTA deep-links back to the roulette after registering
    // (public-roulette-view.js builds /auth/register?returnTo=/roleta/lisboa). Match the
    // exact returnTo — the page header carries its own generic /auth/register button.
    const signupLink = page.locator('a[href*="returnTo=%2Froleta%2Flisboa"]').first();
    await expect(signupLink).toBeVisible({ timeout: 15_000 });
    await expect(signupLink).toHaveAttribute('href', /\/auth\/register/);
  });
});

test.describe('SEO endpoints (M4)', () => {
  test('sitemap.xml returns a populated urlset', async ({ request }) => {
    // First generation queries Supabase for content entries — allow a cold start.
    const res = await request.get('/sitemap.xml', { timeout: 120_000 });
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('<urlset');
    expect(body).toContain('<loc>');
  });

  test('robots.txt returns rules', async ({ request }) => {
    const res = await request.get('/robots.txt', { timeout: 60_000 });
    expect(res.status()).toBe(200);
    expect(await res.text()).toMatch(/User-Agent:/i);
  });
});
