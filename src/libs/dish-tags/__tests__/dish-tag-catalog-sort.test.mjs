import assert from 'node:assert/strict';
import { test } from 'node:test';

import { sortDishCatalogRows } from '../dish-tag-catalog-sort.js';

test('sortDishCatalogRows: empty / invalid', () => {
  assert.deepEqual(sortDishCatalogRows(null), []);
  assert.deepEqual(sortDishCatalogRows([]), []);
});

test('sortDishCatalogRows: sort_order then slug', () => {
  assert.deepEqual(
    sortDishCatalogRows([
      { slug: 'b', sort_order: 1 },
      { slug: 'a', sort_order: 1 },
    ]).map((r) => r.slug),
    ['a', 'b']
  );
});
