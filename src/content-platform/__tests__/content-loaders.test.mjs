/**
 * Content-platform loaders that Node can execute without transpiling `.ts`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatSlugLabel, siblingHubHref } from '../content-breadcrumbs-links.js';
import { suggestByTags } from '../related-content.js';
import {
  getCitySlugsForCountry,
  getCountrySlugs,
  getRestaurantBySlug,
  getRestaurantsByCityFiltered,
} from '../restaurant-catalog.js';

test('suggestByTags ranks overlapping tags and skips the source slug', () => {
  const source = { slug: 'a', frontmatter: { tags: ['lisbon', 'lunch'] } };
  const pool = [
    { slug: 'a', frontmatter: { tags: ['lisbon', 'lunch'] } },
    { slug: 'b', frontmatter: { tags: ['lisbon'] } },
    { slug: 'c', frontmatter: { tags: ['lisbon', 'lunch', 'tasca'] } },
    { slug: 'd', frontmatter: { tags: ['porto'] } },
  ];
  assert.deepEqual(
    suggestByTags(source, pool).map((d) => d.slug),
    ['c', 'b']
  );
  assert.deepEqual(suggestByTags({ slug: 'a', frontmatter: {} }, pool), []);
});

test('siblingHubHref links a different sibling, not the current page', () => {
  assert.equal(formatSlugLabel('late-kitchen-lisbon'), 'late kitchen lisbon');
  assert.equal(siblingHubHref(['only'], 'only', (s) => `/${s}`), null);
  assert.equal(siblingHubHref(['alfama-on-foot', 'baixa-walk'], 'baixa-walk', (s) => `/${s}`), '/alfama-on-foot');
});

test('restaurant catalog: Lisbon slugs, tag filter, and country hub', () => {
  assert.ok(getCountrySlugs().includes('portugal'));
  assert.ok(getCitySlugsForCountry('portugal').includes('lisbon'));
  const ramiro = getRestaurantBySlug('cervejaria-ramiro');
  const timeout = getRestaurantBySlug('time-out-market');
  const known = ramiro ?? timeout;
  assert.ok(known, 'Lisbon catalog should include a known slug');
  const tasca = getRestaurantsByCityFiltered('portugal', 'lisbon', 'tasca');
  assert.ok(tasca.length > 0);
  assert.ok(tasca.every((r) => (r.categories ?? []).includes('tasca')));
  assert.equal(getRestaurantBySlug('not-a-real-place'), null);
});
