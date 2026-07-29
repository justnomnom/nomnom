/**
 * Frontend QA — Stripe fee/ratio env clamps + snapshot amount edges.
 */
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import {
  computeListSnapshotAmountCents,
  getListSnapshotPriceRatio,
  getPlatformFeePercent,
} from '../list-stripe-constants.js';

let saved;
beforeEach(() => {
  saved = {
    fee: process.env.STRIPE_PLATFORM_FEE_PERCENT,
    ratioPub: process.env.NEXT_PUBLIC_LIST_SNAPSHOT_PRICE_RATIO,
    ratio: process.env.LIST_SNAPSHOT_PRICE_RATIO,
  };
  delete process.env.STRIPE_PLATFORM_FEE_PERCENT;
  delete process.env.NEXT_PUBLIC_LIST_SNAPSHOT_PRICE_RATIO;
  delete process.env.LIST_SNAPSHOT_PRICE_RATIO;
});
afterEach(() => {
  for (const [k, v] of Object.entries({
    STRIPE_PLATFORM_FEE_PERCENT: saved.fee,
    NEXT_PUBLIC_LIST_SNAPSHOT_PRICE_RATIO: saved.ratioPub,
    LIST_SNAPSHOT_PRICE_RATIO: saved.ratio,
  })) {
    if (v !== undefined) process.env[k] = v;
    else delete process.env[k];
  }
});

test('getPlatformFeePercent: clamps NaN / negative / >100', () => {
  process.env.STRIPE_PLATFORM_FEE_PERCENT = 'nope';
  assert.equal(getPlatformFeePercent(), 10);
  process.env.STRIPE_PLATFORM_FEE_PERCENT = '-5';
  assert.equal(getPlatformFeePercent(), 0);
  process.env.STRIPE_PLATFORM_FEE_PERCENT = '150';
  assert.equal(getPlatformFeePercent(), 100);
  process.env.STRIPE_PLATFORM_FEE_PERCENT = '12.5';
  assert.equal(getPlatformFeePercent(), 12.5);
});

test('getListSnapshotPriceRatio: invalid / out of (0,1) → 0.45', () => {
  assert.equal(getListSnapshotPriceRatio(), 0.45);
  process.env.LIST_SNAPSHOT_PRICE_RATIO = '0';
  assert.equal(getListSnapshotPriceRatio(), 0.45);
  process.env.LIST_SNAPSHOT_PRICE_RATIO = '1';
  assert.equal(getListSnapshotPriceRatio(), 0.45);
  process.env.LIST_SNAPSHOT_PRICE_RATIO = '-0.1';
  assert.equal(getListSnapshotPriceRatio(), 0.45);
  process.env.LIST_SNAPSHOT_PRICE_RATIO = 'abc';
  assert.equal(getListSnapshotPriceRatio(), 0.45);
  process.env.NEXT_PUBLIC_LIST_SNAPSHOT_PRICE_RATIO = '0.3';
  assert.equal(getListSnapshotPriceRatio(), 0.3);
});

test('computeListSnapshotAmountCents: rejects non-positive / non-finite', () => {
  assert.equal(computeListSnapshotAmountCents(null), null);
  assert.equal(computeListSnapshotAmountCents(0), null);
  assert.equal(computeListSnapshotAmountCents(-10), null);
  assert.equal(computeListSnapshotAmountCents('nope'), null);
});

test('computeListSnapshotAmountCents: string monthly coerces; always < monthly', () => {
  const snap = computeListSnapshotAmountCents('999');
  assert.ok(typeof snap === 'number' && snap > 0);
  assert.ok(snap < 999);
});
