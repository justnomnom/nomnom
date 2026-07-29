/**
 * Run: node --test src/libs/lists/__tests__/build-list-item-rows.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildListItemRows } from '../build-list-item-rows.js';

test('dedupes repeated restaurant ids so the ON CONFLICT batch is safe', () => {
  // Regression: two Google Maps places resolving to the same restaurant used to
  // produce a duplicate (list_id, restaurant_id) pair, which Postgres rejects
  // ("ON CONFLICT DO UPDATE command cannot affect row a second time").
  const rows = buildListItemRows({
    listId: 'L',
    restaurantIds: ['a', 'b', 'a', 'c', 'b'],
    addedBy: 'u',
  });
  assert.deepEqual(
    rows.map((r) => r.restaurant_id),
    ['a', 'b', 'c']
  );
  const keys = new Set(rows.map((r) => `${r.list_id}:${r.restaurant_id}`));
  assert.equal(keys.size, rows.length, 'every (list_id, restaurant_id) pair must be unique');
});

test('sort_order is contiguous over the deduped rows', () => {
  const rows = buildListItemRows({ listId: 'L', restaurantIds: ['a', 'a', 'b'], addedBy: 'u' });
  assert.deepEqual(
    rows.map((r) => r.sort_order),
    [0, 1]
  );
});

test('drops falsy ids and handles nullish input', () => {
  assert.deepEqual(buildListItemRows({ listId: 'L', restaurantIds: null, addedBy: 'u' }), []);
  assert.deepEqual(buildListItemRows({ listId: 'L', restaurantIds: undefined, addedBy: 'u' }), []);
  const rows = buildListItemRows({ listId: 'L', restaurantIds: ['a', '', null, 'a'], addedBy: 'u' });
  assert.deepEqual(
    rows.map((r) => r.restaurant_id),
    ['a']
  );
});

test('sets list_id and added_by on each row', () => {
  const rows = buildListItemRows({ listId: 'L', restaurantIds: ['a'], addedBy: 'u' });
  assert.deepEqual(rows, [{ list_id: 'L', restaurant_id: 'a', sort_order: 0, added_by: 'u' }]);
});
