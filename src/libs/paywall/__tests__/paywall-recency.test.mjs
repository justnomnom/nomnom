/**
 * Unit tests for getPaywallRelativeDate.
 *
 * Run: node --test src/libs/paywall/__tests__/paywall-recency.test.mjs
 *
 * Why this exists: the paywall value prop shows "Updated X days ago" to give
 * potential subscribers evidence the list is live. The 90-day recency gate
 * prevents stale lists from falsely claiming recent activity. These tests
 * document and enforce that boundary.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPaywallRelativeDate, PAYWALL_RECENCY_DAYS } from '../paywall-recency.js';

// Stub formatter — returns a predictable string so tests don't depend on
// the real formatRelativeDate output format.
const fmt = (iso) => `RELATIVE(${iso})`;

const daysAgoIso = (days) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

// ---------------------------------------------------------------------------
// Null / missing input
// ---------------------------------------------------------------------------

test('returns null for null input', () => {
  assert.equal(getPaywallRelativeDate(null, fmt), null);
});

test('returns null for undefined input', () => {
  assert.equal(getPaywallRelativeDate(undefined, fmt), null);
});

test('returns null for empty string', () => {
  assert.equal(getPaywallRelativeDate('', fmt), null);
});

// ---------------------------------------------------------------------------
// Within the 90-day window → should return formatted date
// ---------------------------------------------------------------------------

test('returns formatted date for today (0 days ago)', () => {
  const iso = daysAgoIso(0);
  const result = getPaywallRelativeDate(iso, fmt);
  assert.equal(result, `RELATIVE(${iso})`);
});

test('returns formatted date for 1 day ago', () => {
  const iso = daysAgoIso(1);
  assert.ok(getPaywallRelativeDate(iso, fmt) !== null);
});

test(`returns formatted date for ${PAYWALL_RECENCY_DAYS - 1} days ago (boundary -1)`, () => {
  const iso = daysAgoIso(PAYWALL_RECENCY_DAYS - 1);
  assert.ok(getPaywallRelativeDate(iso, fmt) !== null);
});

// ---------------------------------------------------------------------------
// Outside the 90-day window → should return null
// ---------------------------------------------------------------------------

test(`returns null for exactly ${PAYWALL_RECENCY_DAYS} days ago (exact boundary)`, () => {
  // The gate is strict: < PAYWALL_RECENCY_MS, so exactly 90 days is excluded.
  const iso = daysAgoIso(PAYWALL_RECENCY_DAYS);
  assert.equal(getPaywallRelativeDate(iso, fmt), null);
});

test(`returns null for exactly ${PAYWALL_RECENCY_DAYS + 1} days ago (boundary +1)`, () => {
  const iso = daysAgoIso(PAYWALL_RECENCY_DAYS + 1);
  assert.equal(getPaywallRelativeDate(iso, fmt), null);
});

test('returns null for 180 days ago', () => {
  assert.equal(getPaywallRelativeDate(daysAgoIso(180), fmt), null);
});

test('returns null for 1 year ago', () => {
  assert.equal(getPaywallRelativeDate(daysAgoIso(365), fmt), null);
});

// ---------------------------------------------------------------------------
// PAYWALL_RECENCY_DAYS constant is exported and equals 90
// ---------------------------------------------------------------------------

test('PAYWALL_RECENCY_DAYS constant is 90', () => {
  assert.equal(PAYWALL_RECENCY_DAYS, 90);
});
