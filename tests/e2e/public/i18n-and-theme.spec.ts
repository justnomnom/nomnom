import { expect, test } from '@playwright/test';

import { expectAppShellMainVisible } from '../support/page-assertions';

/**
 * i18n key-leak guard and dark-theme corner case across public pages.
 * A raw `pages.*` / `common.*` token in the rendered text means a missing translation.
 * Theme is the `jn_theme` cookie → `html[data-theme]` (see src/libs/theme-cookie.js).
 */

const PAGES = ['/', '/pricing', '/about', '/faqs', '/contact-us', '/use-cases'];

test.describe('no untranslated i18n keys leak into public pages', () => {
  for (const path of PAGES) {
    test(`no raw keys on ${path}`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.goto(path, { waitUntil: 'load', timeout: 90_000 });
      await expectAppShellMainVisible(page, { timeout: 45_000 });
      const text = await page.locator('#main-content').or(page.getByRole('main')).first().innerText();
      // Dotted i18n keys we use as namespaces — none should reach the DOM as literal text.
      expect(text, `raw i18n key leaked on ${path}`).not.toMatch(/\b(pages|common|components)\.[a-z0-9_]+\.[a-z0-9_.]+/);
    });
  }
});

/**
 * Theme is server-rendered from the `jn_theme` cookie (parseThemeCookie → <html data-theme>).
 * We assert the SSR contract on the response HTML rather than the hydrated DOM: for an
 * anonymous visitor the client settings-provider re-derives theme from localStorage (default
 * light), so the cookie's effect is only guaranteed at first paint / SSR. The user-facing
 * dark-mode toggle lives in authed Settings → Appearance.
 */
test.describe('jn_theme cookie drives SSR data-theme', () => {
  for (const path of ['/pricing', '/']) {
    test(`${path} SSR renders data-theme="dark" with the cookie`, async ({ request }) => {
      test.setTimeout(120_000);
      const res = await request.get(path, { headers: { cookie: 'jn_theme=dark' } });
      expect(res.status()).toBe(200);
      const html = await res.text();
      const tag = html.match(/<html[^>]*>/i)?.[0] ?? '';
      expect(tag, `no <html> tag in ${path}`).toBeTruthy();
      expect(tag).toContain('data-theme="dark"');
    });

    test(`${path} SSR defaults to data-theme="light" without the cookie`, async ({ request }) => {
      test.setTimeout(120_000);
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      const tag = (await res.text()).match(/<html[^>]*>/i)?.[0] ?? '';
      expect(tag).toContain('data-theme="light"');
    });
  }
});
