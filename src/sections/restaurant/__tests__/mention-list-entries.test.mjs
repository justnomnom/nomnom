import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import {
  earliestSavedAt,
  listEmbedFromItemRow,
  listNameFromItemRow,
  listEntryForMentionRow,
  mergeReferencedListsById,
} from '../mention-list-entries.js';

describe('listEmbedFromItemRow', () => {
  test('accepts the object and single-element-array shapes PostgREST returns', () => {
    assert.deepEqual(listEmbedFromItemRow({ lists: { id: 'l1' } }), { id: 'l1' });
    assert.deepEqual(listEmbedFromItemRow({ lists: [{ id: 'l1' }] }), { id: 'l1' });
  });

  test('absent or empty embeds are null', () => {
    assert.equal(listEmbedFromItemRow({ lists: [] }), null);
    assert.equal(listEmbedFromItemRow({}), null);
    assert.equal(listEmbedFromItemRow(null), null);
  });
});

describe('listNameFromItemRow', () => {
  test('trims the name', () => {
    assert.equal(listNameFromItemRow({ lists: { name: '  Tascas  ' } }), 'Tascas');
  });

  test('blank and missing names are empty strings', () => {
    assert.equal(listNameFromItemRow({ lists: { name: '   ' } }), '');
    assert.equal(listNameFromItemRow({ lists: {} }), '');
    assert.equal(listNameFromItemRow(null), '');
  });
});

describe('earliestSavedAt', () => {
  test('picks the earlier timestamp', () => {
    assert.equal(earliestSavedAt('2026-05-01T00:00:00Z', '2026-01-01T00:00:00Z'), '2026-01-01T00:00:00Z');
  });

  test('ignores nulls on either side', () => {
    assert.equal(earliestSavedAt(null, '2026-01-01T00:00:00Z'), '2026-01-01T00:00:00Z');
    assert.equal(earliestSavedAt('2026-01-01T00:00:00Z', undefined), '2026-01-01T00:00:00Z');
    assert.equal(earliestSavedAt(null, null), null);
  });

  test('ignores non-strings', () => {
    assert.equal(earliestSavedAt(12345, '2026-01-01T00:00:00Z'), '2026-01-01T00:00:00Z');
  });
});

describe('listEntryForMentionRow', () => {
  test('builds an entry carrying the save date', () => {
    const entry = listEntryForMentionRow(
      { lists: { id: 'l1', name: 'Tascas' }, created_at: '2026-05-12T10:00:00Z' },
      undefined
    );
    assert.deepEqual(entry, { id: 'l1', name: 'Tascas', savedAt: '2026-05-12T10:00:00Z' });
  });

  test('keeps the earliest save date when the same list is seen twice', () => {
    // The interesting fact is when it first went on the list, not the latest touch.
    const first = listEntryForMentionRow(
      { lists: { id: 'l1', name: 'Tascas' }, created_at: '2026-01-01T00:00:00Z' },
      undefined
    );
    const second = listEntryForMentionRow(
      { lists: { id: 'l1', name: 'Tascas' }, created_at: '2026-06-01T00:00:00Z' },
      first
    );
    assert.equal(second.savedAt, '2026-01-01T00:00:00Z');
  });

  test('falls back to list_id when the embed is missing', () => {
    const entry = listEntryForMentionRow({ list_id: 'l9', created_at: '2026-05-12T10:00:00Z' }, undefined);
    assert.equal(entry.id, 'l9');
    assert.equal(entry.name, null);
  });

  test('a row identifying no list at all yields nothing', () => {
    assert.equal(listEntryForMentionRow({ created_at: '2026-05-12T10:00:00Z' }, undefined), null);
    assert.equal(listEntryForMentionRow(null, undefined), null);
  });

  test('a missing created_at leaves savedAt null rather than guessing', () => {
    const entry = listEntryForMentionRow({ lists: { id: 'l1', name: 'Tascas' } }, undefined);
    assert.equal(entry.savedAt, null);
  });

  test('a later row supplies the date when the earlier one had none', () => {
    const first = listEntryForMentionRow({ lists: { id: 'l1', name: 'Tascas' } }, undefined);
    const second = listEntryForMentionRow(
      { lists: { id: 'l1', name: 'Tascas' }, created_at: '2026-06-01T00:00:00Z' },
      first
    );
    assert.equal(second.savedAt, '2026-06-01T00:00:00Z');
  });
});

describe('mergeReferencedListsById', () => {
  test('dedupes by id and keeps the save date', () => {
    const out = mergeReferencedListsById(
      [{ id: 'l1', name: 'Tascas', savedAt: '2026-01-01T00:00:00Z' }],
      [{ id: 'l1', name: 'Tascas', savedAt: '2026-06-01T00:00:00Z' }]
    );
    assert.equal(out.length, 1);
    assert.equal(out[0].savedAt, '2026-01-01T00:00:00Z');
  });

  test('either side may be the one that knows the save date', () => {
    const fromExtra = mergeReferencedListsById(
      [{ id: 'l1', name: 'Tascas', savedAt: null }],
      [{ id: 'l1', name: 'Tascas', savedAt: '2026-06-01T00:00:00Z' }]
    );
    assert.equal(fromExtra[0].savedAt, '2026-06-01T00:00:00Z');
  });

  test('fills a missing name from the other side', () => {
    const out = mergeReferencedListsById([{ id: 'l1', name: null }], [{ id: 'l1', name: 'Tascas' }]);
    assert.equal(out[0].name, 'Tascas');
  });

  test('named lists sort before unnamed, then alphabetically', () => {
    const out = mergeReferencedListsById(
      [
        { id: 'l3', name: null },
        { id: 'l2', name: 'Zé' },
        { id: 'l1', name: 'Alfama' },
      ],
      []
    );
    assert.deepEqual(
      out.map((L) => L.id),
      ['l1', 'l2', 'l3']
    );
  });

  test('drops entries without an id and tolerates junk', () => {
    assert.deepEqual(mergeReferencedListsById([{ name: 'no id' }, null], null), []);
    assert.deepEqual(mergeReferencedListsById(null, undefined), []);
  });
});
