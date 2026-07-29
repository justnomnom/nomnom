import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mapListItemRowsToIds } from '../map-list-item-rows-to-ids.js';

test('mapListItemRowsToIds: maps ids and drops falsy', () => {
  assert.deepEqual(
    mapListItemRowsToIds([{ id: 'a' }, { id: '' }, { id: null }, {}, { id: 'b' }]),
    ['a', 'b']
  );
});

test('mapListItemRowsToIds: null/undefined → []', () => {
  assert.deepEqual(mapListItemRowsToIds(null), []);
  assert.deepEqual(mapListItemRowsToIds(undefined), []);
  assert.deepEqual(mapListItemRowsToIds([]), []);
});
