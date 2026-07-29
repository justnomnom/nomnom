/**
 * Frontend QA — tiered search: merge must+should, custom minResults, thin forever.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MIN_RESULTS, runTieredTagSearch } from '../restaurant-search-tiers.js';

const rows = (n) => Array.from({ length: n }, (_, i) => ({ id: `r${i}` }));

test('MIN_RESULTS default is 4', () => {
  assert.equal(MIN_RESULTS, 4);
});

test('merges must+should when primary alone is thin', async () => {
  const calls = [];
  const run = async (tags, ma) => {
    calls.push({ tags: [...tags].sort(), ma });
    // only merged set is fat enough
    if (tags.includes('ramen') && tags.includes('cozy')) return rows(5);
    return rows(1);
  };

  const out = await runTieredTagSearch({
    must: ['ramen'],
    should: ['cozy'],
    minRating: null,
    matchAllMust: false,
    run,
  });

  assert.equal(out.length, 5);
  assert.ok(
    calls.some((c) => c.tags.includes('cozy') && c.tags.includes('ramen')),
    'eventually merges should tags'
  );
});

test('custom minResults can short-circuit early', async () => {
  let calls = 0;
  const run = async () => {
    calls += 1;
    return rows(2);
  };
  const out = await runTieredTagSearch({
    must: ['ramen'],
    should: [],
    minRating: 4,
    matchAllMust: false,
    run,
    minResults: 2,
  });
  assert.equal(out.length, 2);
  assert.equal(calls, 1, 'enough results on first tier — no relaxation');
});

test('still thin after all tiers returns last tag-constrained result', async () => {
  const run = async (tags) => (tags.includes('ghost') ? rows(1) : rows(99));
  const out = await runTieredTagSearch({
    must: ['ghost'],
    should: ['also'],
    minRating: 5,
    matchAllMust: true,
    run,
  });
  assert.equal(out.length, 1);
});
