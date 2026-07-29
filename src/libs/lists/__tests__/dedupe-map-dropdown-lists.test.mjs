import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dedupeMapDropdownLists } from '../dedupe-map-dropdown-lists.js';

test('dedupeMapDropdownLists: empty / invalid', () => {
  assert.deepEqual(dedupeMapDropdownLists(null), []);
  assert.deepEqual(dedupeMapDropdownLists(undefined), []);
  assert.deepEqual(dedupeMapDropdownLists({}), []);
  assert.deepEqual(dedupeMapDropdownLists([{ id: null }, null]), []);
});

test('dedupeMapDropdownLists: keeps first, coerces id to string', () => {
  const out = dedupeMapDropdownLists([
    { id: 1, name: 'a' },
    { id: '1', name: 'b' },
    { id: 2, name: 'c' },
  ]);
  assert.deepEqual(
    out.map((l) => ({ id: l.id, name: l.name })),
    [
      { id: '1', name: 'a' },
      { id: '2', name: 'c' },
    ]
  );
});
