/**
 * Frontend QA — promoteExactQueryTags (filter chip rescue).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { promoteExactQueryTags } from '../restaurant-search-promote-tags.js';

const catalog = [
  { slug: 'ramen', label: 'Ramen' },
  { slug: 'fine-dining', label: 'Fine dining' },
  { slug: 'ab', label: 'Ab' }, // too short — ignored
];

test('promoteExactQueryTags: no-op for bad inputs', () => {
  assert.equal(promoteExactQueryTags('ramen', null, catalog), null);
  assert.deepEqual(promoteExactQueryTags('', { mustTagSlugs: [] }, catalog), {
    mustTagSlugs: [],
  });
  assert.deepEqual(promoteExactQueryTags('ramen', { mustTagSlugs: [] }, null), {
    mustTagSlugs: [],
  });
});

test('promoteExactQueryTags: whole-word slug/label → mustTagSlugs', () => {
  const plan = promoteExactQueryTags('cosy ramen tonight', { mustTagSlugs: [], freeTextSearch: 'ramen' }, catalog);
  assert.ok(plan.mustTagSlugs.includes('ramen'));
  assert.equal(plan.freeTextSearch, null, 'identical free text cleared');
});

test('promoteExactQueryTags: does not match partial words (ramenya)', () => {
  const plan = promoteExactQueryTags('ramenya spot', { mustTagSlugs: [] }, catalog);
  assert.deepEqual(plan.mustTagSlugs, []);
});

test('promoteExactQueryTags: phrase fine dining via spaced slug', () => {
  const plan = promoteExactQueryTags('best fine dining', { mustTagSlugs: ['vibe'] }, catalog);
  assert.ok(plan.mustTagSlugs.includes('fine-dining'));
  assert.ok(plan.mustTagSlugs.includes('vibe'));
});

test('promoteExactQueryTags: short labels under 3 chars ignored', () => {
  const plan = promoteExactQueryTags('ab place', { mustTagSlugs: [] }, catalog);
  assert.deepEqual(plan.mustTagSlugs, []);
});
