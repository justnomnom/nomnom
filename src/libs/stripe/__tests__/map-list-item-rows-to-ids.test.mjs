/**
 * Run: node --test src/libs/stripe/__tests__/map-list-item-rows-to-ids.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapListItemRowsToIds } from '../map-list-item-rows-to-ids.js';

test('null and undefined yield empty array', () => {
  assert.deepEqual(mapListItemRowsToIds(null), []);
  assert.deepEqual(mapListItemRowsToIds(undefined), []);
});

test('filters falsy ids', () => {
  assert.deepEqual(
    mapListItemRowsToIds([{ id: 'a' }, { id: '' }, {}, { id: 'b' }]),
    ['a', 'b']
  );
});
