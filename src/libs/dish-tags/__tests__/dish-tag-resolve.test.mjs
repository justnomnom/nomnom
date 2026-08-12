import assert from 'node:assert/strict';
import { test } from 'node:test';

import { sortDishCatalogRows } from '../dish-tag-catalog-sort.js';
import { fetchDishTagsForRestaurant, matchRestaurantDishTag } from '../dish-tag-resolve.js';

test('sortDishCatalogRows: non-array → []', () => {
  assert.deepEqual(sortDishCatalogRows(null), []);
  assert.deepEqual(sortDishCatalogRows(undefined), []);
});

test('sortDishCatalogRows: sort_order then slug', () => {
  const out = sortDishCatalogRows([
    { slug: 'b', sort_order: 2 },
    { slug: 'a', sort_order: 1 },
    { slug: 'c', sort_order: 1 },
    { slug: 'z' },
  ]);
  assert.deepEqual(
    out.map((r) => r.slug),
    ['z', 'a', 'c', 'b']
  );
});

function mockRestaurantTags(rows, error = null) {
  return {
    from(table) {
      assert.equal(table, 'restaurant_tags');
      return {
        select() {
          return this;
        },
        eq() {
          return Promise.resolve({ data: rows, error });
        },
      };
    },
  };
}

test('fetchDishTagsForRestaurant: filters dish category and sorts', async () => {
  const supabase = mockRestaurantTags([
    { tags: { id: '2', slug: 'b', label: 'B', sort_order: 2, category: 'dish' } },
    { tags: { id: '1', slug: 'a', label: 'A', sort_order: 1, category: 'dish' } },
    { tags: { id: '3', slug: 'c', label: 'C', sort_order: 0, category: 'cuisine' } },
    { tags: null },
  ]);
  const out = await fetchDishTagsForRestaurant(supabase, 'r1');
  assert.deepEqual(
    out.map((t) => t.slug),
    ['a', 'b']
  );
});

test('fetchDishTagsForRestaurant: throws on error', async () => {
  const supabase = mockRestaurantTags(null, { message: 'boom' });
  await assert.rejects(() => fetchDishTagsForRestaurant(supabase, 'r1'), /boom/);
});

test('matchRestaurantDishTag: direct label match without LLM', async () => {
  const supabase = mockRestaurantTags([
    { tags: { id: 't1', slug: 'pasta', label: 'Pasta', sort_order: 0, category: 'dish' } },
  ]);
  const hit = await matchRestaurantDishTag(supabase, 'r1', '  pasta  ', 'en');
  assert.deepEqual(hit, { tagId: 't1', label: 'Pasta', label_locale: 'en' });
});

test('matchRestaurantDishTag: no match → null (canon path uses empty dish list short-circuit)', async () => {
  const supabase = mockRestaurantTags([]);
  const miss = await matchRestaurantDishTag(supabase, 'r1', 'unknown dish', 'en');
  assert.equal(miss, null);
});
