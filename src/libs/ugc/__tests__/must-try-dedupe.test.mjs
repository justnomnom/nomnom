import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mustTryDisplayDedupeKey, dedupeMustTryDishesByDisplayLabel } from '../must-try-dedupe.js';

// mustTryDisplayDedupeKey
test('trims, lowercases, collapses spaces', () => {
  assert.equal(mustTryDisplayDedupeKey('  Pasta   Bolognese  '), 'pasta bolognese');
});
test('empty string returns empty string', () => {
  assert.equal(mustTryDisplayDedupeKey(''), '');
});
test('non-string returns empty string', () => {
  assert.equal(mustTryDisplayDedupeKey(null), '');
  assert.equal(mustTryDisplayDedupeKey(undefined), '');
  assert.equal(mustTryDisplayDedupeKey(42), '');
});

// dedupeMustTryDishesByDisplayLabel
test('no duplicates: all rows kept', () => {
  const rows = [
    { display_label: 'Pizza', id: 1 },
    { display_label: 'Pasta', id: 2 },
  ];
  const result = dedupeMustTryDishesByDisplayLabel(rows);
  assert.equal(result.length, 2);
});
test('exact duplicate label: second row dropped', () => {
  const rows = [
    { display_label: 'Pizza', id: 1 },
    { display_label: 'Pizza', id: 2 },
  ];
  const result = dedupeMustTryDishesByDisplayLabel(rows);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 1);
});
test('case-insensitive dedup: "PIZZA" matches "Pizza"', () => {
  const rows = [
    { display_label: 'Pizza', id: 1 },
    { display_label: 'PIZZA', id: 2 },
  ];
  const result = dedupeMustTryDishesByDisplayLabel(rows);
  assert.equal(result.length, 1);
});
test('whitespace-insensitive dedup', () => {
  const rows = [
    { display_label: 'pasta  bolognese', id: 1 },
    { display_label: 'pasta bolognese', id: 2 },
  ];
  const result = dedupeMustTryDishesByDisplayLabel(rows);
  assert.equal(result.length, 1);
});
test('preserves order of first occurrence', () => {
  const rows = [
    { display_label: 'Burger', id: 1 },
    { display_label: 'Pizza', id: 2 },
    { display_label: 'burger', id: 3 },
  ];
  const result = dedupeMustTryDishesByDisplayLabel(rows);
  assert.equal(result.length, 2);
  assert.equal(result[0].id, 1);
  assert.equal(result[1].id, 2);
});
test('empty array returns empty array', () => {
  assert.deepEqual(dedupeMustTryDishesByDisplayLabel([]), []);
});
test('null input returns empty array', () => {
  assert.deepEqual(dedupeMustTryDishesByDisplayLabel(null), []);
});
test('row with empty display_label dropped (empty key treated as falsy)', () => {
  const rows = [
    { display_label: '', id: 1 },
    { display_label: 'Pizza', id: 2 },
  ];
  const result = dedupeMustTryDishesByDisplayLabel(rows);
  // empty key is falsy so row 1 is skipped
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 2);
});
