import fs from 'fs';
import path from 'path';

import { expect, test } from '@playwright/test';

import { APP_NOT_FOUND_HEADING, expectAppShellMainVisible } from '../support/page-assertions';

/**
 * Every real MDX slug under content/{features,resources,use-cases,collections}
 * must render its document, not the global not-found shell.
 * Bogus-slug behavior is covered by dynamic-route-not-found.spec.ts.
 */

const CONTENT_ROOT = path.resolve(__dirname, '..', '..', '..', 'content');

function slugsIn(dir: string): string[] {
  const abs = path.join(CONTENT_ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith('.mdx'))
    .sort()
    .map((f) => f.replace(/\.mdx$/, ''));
}

for (const dir of ['features', 'resources', 'use-cases', 'collections'] as const) {
  const slugs = slugsIn(dir);
  if (slugs.length === 0) continue;

  test.describe(`${dir}/[slug] — every content document renders`, () => {
    test(`content/${dir} has at least one MDX slug`, () => {
      expect(slugs.length, `expected content/${dir}/*.mdx`).toBeGreaterThan(0);
    });

    for (const slug of slugs) {
      test(`/${dir}/${slug} renders its document, not the not-found shell`, async ({ page }) => {
        await page.goto(`/${dir}/${slug}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
        await expect(page).toHaveURL(new RegExp(`/${dir}/${slug}$`));
        await expectAppShellMainVisible(page, { timeout: 45_000 });
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });
        await expect(page.getByRole('heading', { name: APP_NOT_FOUND_HEADING })).toHaveCount(0);
      });
    }
  });
}
