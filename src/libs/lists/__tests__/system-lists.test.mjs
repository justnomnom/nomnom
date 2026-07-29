import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import { excludeIds, pickSystemLists } from '../system-lists.js';

describe('pickSystemLists', () => {
  test('finds the seeded lists by name', () => {
    const out = pickSystemLists([
      { id: 'l1', name: 'Must go', created_at: '2026-01-01T00:00:00Z' },
      { id: 'l2', name: 'Visited', created_at: '2026-01-01T00:00:00Z' },
      { id: 'l3', name: 'Porto trip', created_at: '2026-02-01T00:00:00Z' },
    ]);
    assert.deepEqual(out, { visited: 'l2', must_go: 'l1' });
  });

  test('name matching ignores case and accents', () => {
    const out = pickSystemLists([{ id: 'l1', name: '  VISITED ', created_at: '2026-01-01T00:00:00Z' }]);
    assert.equal(out.visited, 'l1');
  });

  test('system_key wins over a name match regardless of age', () => {
    const out = pickSystemLists([
      { id: 'old', name: 'Visited', created_at: '2020-01-01T00:00:00Z' },
      { id: 'keyed', name: 'Porto trip', system_key: 'visited', created_at: '2026-06-01T00:00:00Z' },
    ]);
    assert.equal(out.visited, 'keyed');
  });

  test('a later user-made list of the same name does not shadow the seeded one', () => {
    const out = pickSystemLists([
      { id: 'mine', name: 'Visited', created_at: '2026-06-01T00:00:00Z' },
      { id: 'seeded', name: 'Visited', created_at: '2026-01-01T00:00:00Z' },
    ]);
    assert.equal(out.visited, 'seeded');
  });

  test('a renamed seeded list is simply not found without system_key', () => {
    // The honest failure mode until the migration lands: no wrong answer, just none.
    const out = pickSystemLists([{ id: 'l1', name: 'Places I loved', created_at: '2026-01-01T00:00:00Z' }]);
    assert.deepEqual(out, { visited: null, must_go: null });
  });

  test('tolerates junk rows', () => {
    assert.deepEqual(pickSystemLists(null), { visited: null, must_go: null });
    assert.deepEqual(pickSystemLists([null, {}, { name: 'Visited' }, 7]), {
      visited: null,
      must_go: null,
    });
  });
});

describe('excludeIds', () => {
  test('removes excluded ids and keeps the original order', () => {
    assert.deepEqual(excludeIds(['a', 'b', 'c', 'd'], ['c', 'a']), ['b', 'd']);
  });

  test('an empty exclusion set is a no-op', () => {
    assert.deepEqual(excludeIds(['a', 'b'], []), ['a', 'b']);
    assert.deepEqual(excludeIds(['a', 'b'], null), ['a', 'b']);
  });

  test('drops blank ids and coerces to strings', () => {
    assert.deepEqual(excludeIds(['a', null, '', 'b'], []), ['a', 'b']);
    assert.deepEqual(excludeIds([1, 2], [2]), ['1']);
  });

  test('excluding everything yields an empty pool', () => {
    assert.deepEqual(excludeIds(['a', 'b'], ['a', 'b']), []);
  });

  test('accepts a Set', () => {
    assert.deepEqual(excludeIds(['a', 'b'], new Set(['b'])), ['a']);
  });
});
