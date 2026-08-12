import fs from 'fs';
import path from 'path';

import { expect, test } from '@playwright/test';

import { expectAppShellMainVisible } from '../support/page-assertions';

/**
 * TEST-PLAN §12 M1 — one representative REAL slug per MDX-backed editorial route
 * (features / resources / collections). Slugs are discovered from the `content/` tree at
 * runtime so the spec self-skips in environments without that content (this repo currently
 * ships only `content/use-cases`, which marketing-routes.spec.ts covers) and starts running
 * automatically the moment content lands. Bogus-slug behavior for these same routes is
 * covered by dynamic-route-not-found.spec.ts.
 */

const CONTENT_ROOT = path.resolve(__dirname, '..', '..', '..', 'content');

function firstSlugIn(dir: string): string | null {
  const abs = path.join(CONTENT_ROOT, dir);
  if (!fs.existsSync(abs)) return null;
  const mdx = fs
    .readdirSync(abs)
    .filter((f) => f.endsWith('.mdx'))
    .sort();
  return mdx.length ? mdx[0].replace(/\.mdx$/, '') : null;
}

for (const dir of ['features', 'resources', 'collections'] as const) {
  test.describe(`${dir}/[slug] — representative content renders`, () => {
    test(`first ${dir} slug renders its document, not the not-found shell`, async ({ page }) => {
      const slug = firstSlugIn(dir);
      test.skip(!slug, `No content/${dir}/*.mdx in this environment — add content to activate.`);

      await page.goto(`/${dir}/${slug}`, { waitUntil: 'load', timeout: 120_000 });
      await expect(page).toHaveURL(new RegExp(`/${dir}/${slug}$`));
      await expectAppShellMainVisible(page, { timeout: 45_000 });

      // A real document renders an h1 and never the global not-found heading.
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('heading', { name: /isn.t on the menu/i })).toHaveCount(0);
    });
  });
}
