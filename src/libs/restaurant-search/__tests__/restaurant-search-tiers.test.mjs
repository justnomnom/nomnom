import { test } from 'node:test';
import assert from 'node:assert/strict';

import { runTieredTagSearch } from '../restaurant-search-tiers.js';

const rows = (n) => Array.from({ length: n }, (_, i) => ({ id: `r${i}` }));

test('a thin tag match never falls back to unfiltered results (the ramen bug)', async () => {
  // 2 ramen places in scope, 50 restaurants total. The old executor dropped the tag filter when
  // matches were < MIN_RESULTS and returned all 50 — under a "ramen" chip. It must not.
  const calls = [];
  const run = async (tags) => {
    calls.push(tags);
    return tags.includes('ramen') ? rows(2) : rows(50);
  };

  const out = await runTieredTagSearch({
    must: ['ramen'],
    should: [],
    minRating: null,
    matchAllMust: false,
    run,
  });

  assert.equal(out.length, 2, 'returns only the matching places, not the unfiltered 50');
  assert.ok(
    calls.every((tags) => tags.includes('ramen')),
    'never issues a query without the requested tag'
  );
});

test('an empty plan (no tags) still returns everything', async () => {
  // No filter to betray — tier 1 is already an unfiltered query, so a vague query returns all.
  const run = async (tags) => (tags.length ? rows(0) : rows(10));
  const out = await runTieredTagSearch({
    must: [],
    should: [],
    minRating: null,
    matchAllMust: false,
    run,
  });
  assert.equal(out.length, 10);
});

test('relaxing minRating keeps the tag constraint', async () => {
  const calls = [];
  const run = async (tags, _ma, mr) => {
    calls.push({ tags, mr });
    return mr != null && mr > 0 ? rows(1) : rows(3);
  };

  const out = await runTieredTagSearch({
    must: ['ramen'],
    should: [],
    minRating: 4.5,
    matchAllMust: false,
    run,
  });

  assert.equal(out.length, 3, 'drops the rating floor to widen, but keeps ramen');
  assert.ok(calls.every((c) => c.tags.includes('ramen')), 'tag survives every relaxation tier');
  assert.equal(calls.at(-1).mr, null, 'final tier dropped the minRating');
});

test('relaxing matchAll keeps both must tags', async () => {
  const calls = [];
  const run = async (tags, ma) => {
    calls.push({ tags, ma });
    return ma ? rows(1) : rows(5);
  };

  const out = await runTieredTagSearch({
    must: ['ramen', 'sushi'],
    should: [],
    minRating: null,
    matchAllMust: true,
    run,
  });

  assert.equal(out.length, 5);
  assert.ok(
    calls.every((c) => c.tags.includes('ramen') && c.tags.includes('sushi')),
    'both requested tags survive the matchAll relaxation'
  );
});
