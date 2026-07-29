/**
 * Run: node --test src/libs/lists/__tests__/group-list-items-by-restaurant.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupListItemsByRestaurant } from '../group-list-items-by-restaurant.js';

test('null or empty input yields an empty map', () => {
  assert.deepEqual(groupListItemsByRestaurant(null), {});
  assert.deepEqual(groupListItemsByRestaurant(undefined), {});
  assert.deepEqual(groupListItemsByRestaurant([]), {});
});

test('groups list ids under each restaurant id', () => {
  const out = groupListItemsByRestaurant([
    { list_id: 'l1', restaurant_id: 'r1' },
    { list_id: 'l2', restaurant_id: 'r1' },
    { list_id: 'l1', restaurant_id: 'r2' },
  ]);
  assert.deepEqual(out, { r1: ['l1', 'l2'], r2: ['l1'] });
});

test('dedupes a restaurant appearing on the same list twice', () => {
  const out = groupListItemsByRestaurant([
    { list_id: 'l1', restaurant_id: 'r1' },
    { list_id: 'l1', restaurant_id: 'r1' },
  ]);
  assert.deepEqual(out, { r1: ['l1'] });
});

test('skips rows missing a restaurant_id or list_id', () => {
  const out = groupListItemsByRestaurant([
    { list_id: 'l1', restaurant_id: null },
    { list_id: null, restaurant_id: 'r1' },
    { restaurant_id: 'r2' },
    { list_id: 'l3', restaurant_id: 'r3' },
  ]);
  assert.deepEqual(out, { r3: ['l3'] });
});

test('coerces non-string ids to strings', () => {
  const out = groupListItemsByRestaurant([{ list_id: 10, restaurant_id: 20 }]);
  assert.deepEqual(out, { 20: ['10'] });
});

// Regression: the saved-state map must carry a restaurant whether or not it sits inside the map's
// bounded detail slice. Before the fix the complete viewer map was never built, so a saved spot
// beyond that slice resolved to [] (un-saved) on both the pin color and the detail card. The
// grouping that backs `fetchViewerSavedListMap` must surface every saved restaurant id.
test('surfaces every saved restaurant id (not just a bounded subset)', () => {
  const rows = Array.from({ length: 250 }, (_, i) => ({
    list_id: 'l1',
    restaurant_id: `r${i}`,
  }));
  const out = groupListItemsByRestaurant(rows);
  assert.equal(Object.keys(out).length, 250);
  assert.deepEqual(out.r249, ['l1']);
});
