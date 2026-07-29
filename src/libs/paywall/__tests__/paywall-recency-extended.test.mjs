import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getPaywallRelativeDate, PAYWALL_RECENCY_DAYS } from '../paywall-recency.js';

test('PAYWALL_RECENCY_DAYS is 90', () => {
  assert.equal(PAYWALL_RECENCY_DAYS, 90);
});

test('getPaywallRelativeDate: null for falsy / stale dates', () => {
  const fmt = () => 'x';
  assert.equal(getPaywallRelativeDate(null, fmt), null);
  assert.equal(getPaywallRelativeDate('', fmt), null);
  const old = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(getPaywallRelativeDate(old, fmt), null);
});

test('getPaywallRelativeDate: formats recent dates via callback', () => {
  const recent = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(
    getPaywallRelativeDate(recent, (iso) => `rel:${iso}`),
    `rel:${recent}`
  );
});

test('getPaywallRelativeDate: boundary just under 90 days', () => {
  const almost = new Date(Date.now() - 89 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(getPaywallRelativeDate(almost, () => 'ok'), 'ok');
});

test('getPaywallRelativeDate: invalid ISO → null (NaN age)', () => {
  assert.equal(getPaywallRelativeDate('not-a-date', () => 'x'), null);
});
