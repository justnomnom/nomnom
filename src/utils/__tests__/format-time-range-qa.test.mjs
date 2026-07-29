/**
 * Frontend QA — format-time range helpers.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  calculateDuration,
  fDate,
  fDateTime,
  fTimestamp,
  isAfter,
  isBetween,
} from '../format-time.js';

test('fDate / fDateTime / fTimestamp: empty for falsy; non-empty for valid', () => {
  assert.equal(fDate(null), '');
  assert.equal(fDateTime(''), '');
  assert.equal(fTimestamp(undefined), '');
  assert.ok(fDate('2024-06-15').length > 0);
  assert.ok(fDateTime('2024-06-15T12:00:00').length > 0);
  assert.equal(typeof fTimestamp('2024-06-15T12:00:00'), 'number');
});

test('isBetween: inclusive window', () => {
  assert.equal(
    isBetween('2024-06-15', '2024-06-01', '2024-06-30'),
    true
  );
  assert.equal(
    isBetween('2024-05-01', '2024-06-01', '2024-06-30'),
    false
  );
});

test('isAfter: compares dates', () => {
  assert.equal(isAfter('2024-06-20', '2024-06-15'), true);
  assert.equal(isAfter('2024-06-10', '2024-06-15'), false);
});

test('calculateDuration: inclusive day count; invalid → 1', () => {
  assert.equal(calculateDuration('2024-01-01T00:00:00Z', '2024-01-02T03:04:05Z'), 2);
  assert.equal(calculateDuration(null, '2024-01-02'), 1);
  assert.equal(calculateDuration('2024-01-01', null), 1);
  assert.equal(calculateDuration('2024-01-05', '2024-01-01'), 1);
  assert.equal(calculateDuration('nope', '2024-01-01'), 1);
});

test('isBetween: invalid dates → false', () => {
  assert.equal(isBetween('bad', '2024-06-01', '2024-06-30'), false);
});

test('isAfter: missing dates → false', () => {
  assert.equal(isAfter(null, '2024-06-15'), false);
  assert.equal(isAfter('2024-06-20', null), false);
});
