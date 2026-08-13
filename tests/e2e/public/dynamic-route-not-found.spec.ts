import { expect, test } from '@playwright/test';

import { expectAppShellMainVisible } from '../support/page-assertions';

/**
 * Corner cases for every public dynamic ([param]) route: a clearly-bogus param must
 * degrade gracefully — never a 5xx, never a blank crash. Some routes hard-404, others
 * render a soft not-found/empty state at 200; both are acceptable. What we assert
 * everywhere: status < 500 and the app shell renders.
 */

const BOGUS = 'e2e-nonexistent-xyz-9999';
const NASTY = "%27%22%3E%3C--"; // ' " > < -- (URL-encoded), guards against injection-driven 500s

const ROUTES: Array<{ path: string; label: string }> = [
  { path: `/collections/${BOGUS}`, label: 'collections/[slug]' },
  { path: `/countries/${BOGUS}`, label: 'countries/[country]' },
  { path: `/countries/${BOGUS}/${BOGUS}`, label: 'countries/[country]/[city]' },
  { path: `/countries/${BOGUS}/collections`, label: 'countries/[country]/collections' },
  { path: `/countries/${BOGUS}/influencers`, label: 'countries/[country]/influencers' },
  { path: `/features/${BOGUS}`, label: 'features/[slug]' },
  { path: `/resources/${BOGUS}`, label: 'resources/[slug]' },
  { path: `/use-cases/${BOGUS}`, label: 'use-cases/[slug]' },
  { path: `/restaurants/${BOGUS}`, label: 'restaurants/[id] (non-uuid)' },
  { path: `/lists/${BOGUS}`, label: 'lists/[creatorHandle]' },
  { path: `/lists/${BOGUS}/${BOGUS}`, label: 'lists/[creatorHandle]/[listSlug]' },
  { path: `/u/${BOGUS}`, label: 'u/[username]' },
];

for (const { path, label } of ROUTES) {
  test(`bogus param on ${label} degrades gracefully`, async ({ page }) => {
    test.setTimeout(160_000);
    // 'domcontentloaded' (not 'load') so a slow sub-resource — Mapbox tile, analytics —
    // can't stall the check; some of these routes cold-compile for ~60s on first hit.
    const res = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    expect(res, `no response for ${path}`).not.toBeNull();
    expect(res!.status(), `${path} returned a server error`).toBeLessThan(500);
    await expectAppShellMainVisible(page, { timeout: 45_000 });
  });
}

test.describe('injection-shaped params do not 500', () => {
  for (const base of ['/restaurants', '/u', '/collections', '/countries']) {
    test(`${base}/<nasty> stays < 500`, async ({ page }) => {
      test.setTimeout(120_000);
      const res = await page.goto(`${base}/${NASTY}`, {
        waitUntil: 'domcontentloaded',
        timeout: 90_000,
      });
      expect(res!.status(), `${base}/${NASTY} returned a server error`).toBeLessThan(500);
      await expectAppShellMainVisible(page, { timeout: 30_000 });
    });
  }
});
