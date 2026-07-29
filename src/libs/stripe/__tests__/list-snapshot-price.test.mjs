/**
 * Snapshot vs monthly list pricing.
 *
 * Run: node --test src/libs/stripe/__tests__/list-snapshot-price.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeListSnapshotAmountCents } from '../list-stripe-constants.js';

test('default ratio yields snapshot strictly below monthly for typical price', () => {
  assert.equal(computeListSnapshotAmountCents(399), 180);
  assert.ok(computeListSnapshotAmountCents(399) < 399);
});

test('high monthly still differs from snapshot', () => {
  const monthly = 10_000;
  const snap = computeListSnapshotAmountCents(monthly);
  assert.ok(snap < monthly);
  assert.ok(snap > 0);
});

test('returns null for invalid monthly', () => {
  assert.equal(computeListSnapshotAmountCents(null), null);
  assert.equal(computeListSnapshotAmountCents(undefined), null);
  assert.equal(computeListSnapshotAmountCents(NaN), null);
  assert.equal(computeListSnapshotAmountCents(0), null);
});
