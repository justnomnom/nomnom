import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertPriceInBounds,
  computeListSnapshotAmountCents,
  getListSnapshotPriceRatio,
  getPlatformFeePercent,
  isWellFormedUuid,
  LIST_PRICE_MAX_CENTS,
  LIST_PRICE_MIN_CENTS,
  netCentsAfterPlatformFee,
} from '../list-stripe-constants.js';

test('isWellFormedUuid: accepts valid v4, rejects garbage', () => {
  assert.equal(isWellFormedUuid('550e8400-e29b-41d4-a716-446655440000'), true);
  assert.equal(isWellFormedUuid('550e8400-e29b-61d4-a716-446655440000'), false);
  assert.equal(isWellFormedUuid(''), false);
  assert.equal(isWellFormedUuid(null), false);
  assert.equal(isWellFormedUuid(123), false);
  assert.equal(isWellFormedUuid('not-uuid'), false);
});

test('assertPriceInBounds: ok within min/max', () => {
  const mid = Math.round((LIST_PRICE_MIN_CENTS + LIST_PRICE_MAX_CENTS) / 2);
  assert.deepEqual(assertPriceInBounds(mid), { ok: true, cents: mid });
  assert.deepEqual(assertPriceInBounds(String(LIST_PRICE_MIN_CENTS)), {
    ok: true,
    cents: LIST_PRICE_MIN_CENTS,
  });
});

test('assertPriceInBounds: rejects invalid and out of bounds', () => {
  assert.deepEqual(assertPriceInBounds('abc'), { ok: false, error: 'invalid_price' });
  assert.deepEqual(assertPriceInBounds(NaN), { ok: false, error: 'invalid_price' });
  assert.deepEqual(assertPriceInBounds(LIST_PRICE_MIN_CENTS - 1), {
    ok: false,
    error: 'price_out_of_bounds',
  });
  assert.deepEqual(assertPriceInBounds(LIST_PRICE_MAX_CENTS + 1), {
    ok: false,
    error: 'price_out_of_bounds',
  });
});

test('computeListSnapshotAmountCents: tiny monthly below min unit uses upper', () => {
  // monthly=2 → upper=1 < default min 50 → return upper
  assert.equal(computeListSnapshotAmountCents(2), 1);
  assert.equal(computeListSnapshotAmountCents(1), null); // upper < 1
});

test('getListSnapshotPriceRatio: default in (0,1)', () => {
  const r = getListSnapshotPriceRatio();
  assert.ok(r > 0 && r < 1);
});

test('getPlatformFeePercent: default clamped 0–100', () => {
  const fee = getPlatformFeePercent();
  assert.ok(fee >= 0 && fee <= 100);
});

test('netCentsAfterPlatformFee: applies the default 10% fee', () => {
  delete process.env.STRIPE_PLATFORM_FEE_PERCENT;
  assert.equal(netCentsAfterPlatformFee(1000), 900);
});

test('netCentsAfterPlatformFee: tracks the env var instead of a hardcoded fraction', () => {
  // The bug this replaced: getCreatorListStats kept `const PLATFORM_FEE = 0.1`, so changing
  // this env var moved what creators were charged but not what they were shown.
  process.env.STRIPE_PLATFORM_FEE_PERCENT = '25';
  assert.equal(netCentsAfterPlatformFee(1000), 750);
  delete process.env.STRIPE_PLATFORM_FEE_PERCENT;
});

test('netCentsAfterPlatformFee: percent, not fraction', () => {
  // getPlatformFeePercent() returns 10, not 0.1 — a naive swap would be 100x off.
  process.env.STRIPE_PLATFORM_FEE_PERCENT = '10';
  assert.notEqual(netCentsAfterPlatformFee(1000), 1000 * (1 - 10));
  assert.equal(netCentsAfterPlatformFee(1000), 900);
  delete process.env.STRIPE_PLATFORM_FEE_PERCENT;
});

test('netCentsAfterPlatformFee: rounds and tolerates junk', () => {
  process.env.STRIPE_PLATFORM_FEE_PERCENT = '10';
  assert.equal(netCentsAfterPlatformFee(999), 899); // 899.1 -> 899
  assert.equal(netCentsAfterPlatformFee(null), 0);
  assert.equal(netCentsAfterPlatformFee(undefined), 0);
  assert.equal(netCentsAfterPlatformFee(NaN), 0);
  delete process.env.STRIPE_PLATFORM_FEE_PERCENT;
});

test('netCentsAfterPlatformFee: a 0% fee leaves the amount whole', () => {
  process.env.STRIPE_PLATFORM_FEE_PERCENT = '0';
  assert.equal(netCentsAfterPlatformFee(1000), 1000);
  delete process.env.STRIPE_PLATFORM_FEE_PERCENT;
});
