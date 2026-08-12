import { test } from 'node:test';
import assert from 'node:assert/strict';

import { promoteExactQueryTags } from '../restaurant-search-promote-tags.js';

const CATALOG = [
  { slug: 'ramen', label: 'Ramen' },
  { slug: 'sushi', label: 'Sushi' },
  { slug: 'japanese', label: 'Japanese' },
  { slug: 'fine-dining', label: 'Fine dining' },
  { slug: 'bar', label: 'Bar' },
];

const basePlan = () => ({
  mustTagSlugs: [],
  shouldTagSlugs: [],
  matchAllMust: false,
  freeTextSearch: null,
  minRating: null,
  vibeKey: null,
  categoryKey: 'daily',
});

test('promotes a bare cuisine term the LLM left in freeTextSearch', () => {
  const plan = { ...basePlan(), freeTextSearch: 'ramen' };
  const out = promoteExactQueryTags('ramen', plan, CATALOG);
  assert.deepEqual(out.mustTagSlugs, ['ramen']);
  // free text is cleared so the search isn't double-constrained by tag AND name
  assert.equal(out.freeTextSearch, null);
});

test('matches the term inside a longer natural-language query', () => {
  const out = promoteExactQueryTags('cosy ramen for a rainy night', basePlan(), CATALOG);
  assert.deepEqual(out.mustTagSlugs, ['ramen']);
});

test('matches via the human label, case-insensitively', () => {
  const out = promoteExactQueryTags('somewhere for SUSHI tonight', basePlan(), CATALOG);
  assert.deepEqual(out.mustTagSlugs, ['sushi']);
});

test('matches a multi-word label / hyphenated slug', () => {
  const out = promoteExactQueryTags('a fine dining spot', basePlan(), CATALOG);
  assert.deepEqual(out.mustTagSlugs, ['fine-dining']);
});

test('keeps existing must tags and dedupes', () => {
  const plan = { ...basePlan(), mustTagSlugs: ['japanese'] };
  const out = promoteExactQueryTags('japanese ramen', plan, CATALOG);
  assert.deepEqual([...out.mustTagSlugs].sort(), ['japanese', 'ramen']);
});

test('does not match substrings (no false positive on "ramenya")', () => {
  const out = promoteExactQueryTags('ramenya house', basePlan(), CATALOG);
  assert.deepEqual(out.mustTagSlugs, []);
});

test('leaves an unrelated freeTextSearch untouched', () => {
  const plan = { ...basePlan(), freeTextSearch: 'tonkotsu' };
  const out = promoteExactQueryTags('ramen tonkotsu', plan, CATALOG);
  assert.deepEqual(out.mustTagSlugs, ['ramen']);
  assert.equal(out.freeTextSearch, 'tonkotsu');
});

test('no catalog match returns the plan unchanged', () => {
  const plan = { ...basePlan(), freeTextSearch: 'pierogi' };
  const out = promoteExactQueryTags('pierogi', plan, CATALOG);
  assert.deepEqual(out.mustTagSlugs, []);
  assert.equal(out.freeTextSearch, 'pierogi');
});

test('tolerates empty / malformed input without throwing', () => {
  assert.deepEqual(promoteExactQueryTags('', basePlan(), CATALOG).mustTagSlugs, []);
  assert.equal(promoteExactQueryTags('ramen', null, CATALOG), null);
  const plan = basePlan();
  assert.equal(promoteExactQueryTags('ramen', plan, null), plan);
});
