import assert from 'node:assert/strict';
import { test } from 'node:test';

import { filterSlugs, ratingFromRow, scoreRow } from '../restaurant-search-scoring.js';
import { z } from 'zod';

/** Mirror of agent schema — keep in sync with restaurant-search-agent.js exports. */
const restaurantSearchPlanSchema = z.object({
  mustTagSlugs: z.array(z.string()),
  shouldTagSlugs: z.array(z.string()),
  matchAllMust: z.boolean(),
  freeTextSearch: z.string().nullable(),
  minRating: z.number().min(0).max(5).nullable(),
  vibeKey: z.enum(['date', 'friends', 'cheap', 'corporate']).nullable(),
  categoryKey: z.enum(['daily', 'coffee', 'hidden', 'datecat']).nullable(),
  reasoning: z.string().optional(),
});

test('ratingFromRow: prefers row.rating then metadata; else 0', () => {
  assert.equal(ratingFromRow({ rating: 4.5 }), 4.5);
  assert.equal(ratingFromRow({ metadata: { rating: 3 } }), 3);
  assert.equal(ratingFromRow({ rating: 'x', metadata: { rating: 2 } }), 2);
  assert.equal(ratingFromRow({ rating: NaN }), 0);
  assert.equal(ratingFromRow(null), 0);
  assert.equal(ratingFromRow({}), 0);
});

test('filterSlugs: only catalog-allowed; non-array → []', () => {
  const allowed = new Set(['ramen', 'sushi']);
  assert.deepEqual(filterSlugs([' ramen ', 'pizza', 'sushi'], allowed), ['ramen', 'sushi']);
  assert.deepEqual(filterSlugs(null, allowed), []);
  assert.deepEqual(filterSlugs(['ramen'], null), []);
});

test('scoreRow: must +100, should +30, rating×2', () => {
  const slugMap = new Map([['r1', ['ramen', 'cozy']]]);
  assert.equal(scoreRow({ id: 'r1', rating: 4 }, ['ramen'], ['cozy'], slugMap), 100 + 30 + 8);
  assert.equal(scoreRow({ id: 'missing' }, ['ramen'], [], slugMap), 0);
  assert.equal(scoreRow({ id: 'r1' }, null, null, null), 0);
});

test('restaurantSearchPlanSchema: accepts minimal valid plan', () => {
  const parsed = restaurantSearchPlanSchema.parse({
    mustTagSlugs: ['ramen'],
    shouldTagSlugs: [],
    matchAllMust: true,
    freeTextSearch: null,
    minRating: null,
    vibeKey: null,
    categoryKey: 'daily',
  });
  assert.equal(parsed.mustTagSlugs[0], 'ramen');
});

test('restaurantSearchPlanSchema: rejects bad vibe / rating', () => {
  assert.throws(() =>
    restaurantSearchPlanSchema.parse({
      mustTagSlugs: [],
      shouldTagSlugs: [],
      matchAllMust: false,
      freeTextSearch: null,
      minRating: 9,
      vibeKey: 'party',
      categoryKey: null,
    })
  );
});
