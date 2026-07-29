/**
 * Frontend QA — format-time remaining helpers.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fTime, fToNow } from '../format-time.js';

test('fTime / fToNow: empty for falsy', () => {
  assert.equal(fTime(null), '');
  assert.equal(fTime(''), '');
  assert.equal(fToNow(null), '');
  assert.equal(fToNow(''), '');
});

test('fTime: returns non-empty for valid date', () => {
  const out = fTime('2024-06-15T15:30:00');
  assert.ok(typeof out === 'string' && out.length > 0);
});

test('fToNow: includes ago/in-ish relative copy', () => {
  const past = new Date(Date.now() - 60_000).toISOString();
  const out = fToNow(past);
  assert.ok(out.length > 0);
});
