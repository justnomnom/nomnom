import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import { partitionListsForAccountDeletion } from '../account-deletion-lists.js';

describe('partitionListsForAccountDeletion', () => {
  test('lists nobody paid for are deletable', () => {
    const out = partitionListsForAccountDeletion(['a', 'b', 'c'], []);
    assert.deepEqual(out.deletable, ['a', 'b', 'c']);
    assert.deepEqual(out.retained, []);
  });

  test('a list anyone paid for is retained, not deleted', () => {
    // The money FKs are ON DELETE RESTRICT and a Snapshot buyer paid for that content —
    // attempting the delete would fail, and succeeding would be worse.
    const out = partitionListsForAccountDeletion(['a', 'b'], ['b']);
    assert.deepEqual(out.deletable, ['a']);
    assert.deepEqual(out.retained, ['b']);
  });

  test('every list paid for means nothing is deleted', () => {
    const out = partitionListsForAccountDeletion(['a', 'b'], ['a', 'b']);
    assert.deepEqual(out.deletable, []);
    assert.deepEqual(out.retained, ['a', 'b']);
  });

  test('dedupes owned ids so a list is never deleted twice', () => {
    const out = partitionListsForAccountDeletion(['a', 'a', 'b'], []);
    assert.deepEqual(out.deletable, ['a', 'b']);
  });

  test('drops blank ids', () => {
    const out = partitionListsForAccountDeletion(['a', null, '', undefined, 'b'], []);
    assert.deepEqual(out.deletable, ['a', 'b']);
  });

  test('coerces ids so a numeric id still matches a paid entry', () => {
    const out = partitionListsForAccountDeletion([1, 2], [2]);
    assert.deepEqual(out.deletable, ['1']);
    assert.deepEqual(out.retained, ['2']);
  });

  test('accepts a Set of paid ids', () => {
    const out = partitionListsForAccountDeletion(['a', 'b'], new Set(['a']));
    assert.deepEqual(out.retained, ['a']);
  });

  test('a user with no lists partitions to nothing', () => {
    assert.deepEqual(partitionListsForAccountDeletion([], []), {
      deletable: [],
      retained: [],
      systemLists: [],
    });
    assert.deepEqual(partitionListsForAccountDeletion(null, null), {
      deletable: [],
      retained: [],
      systemLists: [],
    });
  });

  test('seeded system lists are left to the cascade, not deleted explicitly', () => {
    // lists_system_key_guard refuses to delete these while the owner row still exists, which
    // is exactly when this runs. Asking anyway logged `system list must_go cannot be deleted`
    // on every account deletion; the error was swallowed and the CASCADE from `users` removed
    // the rows regardless, so the outcome was correct purely by accident.
    const out = partitionListsForAccountDeletion(['plain', 'mustgo', 'visited'], [], [
      'mustgo',
      'visited',
    ]);
    assert.deepEqual(out.deletable, ['plain']);
    assert.deepEqual(out.systemLists, ['mustgo', 'visited']);
    assert.deepEqual(out.retained, []);
  });

  test('omitting systemListIds keeps the old two-way split', () => {
    const out = partitionListsForAccountDeletion(['a', 'b'], ['b']);
    assert.deepEqual(out.deletable, ['a']);
    assert.deepEqual(out.retained, ['b']);
    assert.deepEqual(out.systemLists, []);
  });

  test('paid wins over system so the money path is never touched', () => {
    // A system list cannot currently be monetised, so these never overlap — but if that ever
    // changed, RESTRICT-protected content must win over "leave it to the cascade".
    const out = partitionListsForAccountDeletion(['x'], ['x'], ['x']);
    assert.deepEqual(out.retained, ['x']);
    assert.deepEqual(out.systemLists, []);
    assert.deepEqual(out.deletable, []);
  });

  test('accepts a Set of system ids and coerces numeric ids', () => {
    const out = partitionListsForAccountDeletion([1, 2, 3], [], new Set(['2']));
    assert.deepEqual(out.deletable, ['1', '3']);
    assert.deepEqual(out.systemLists, ['2']);
  });
});
