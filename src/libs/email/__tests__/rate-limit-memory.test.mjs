import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rateLimitTake } from '../rate-limit-memory.js';

// Use unique keys per test to avoid cross-test state pollution (module-level Map).
let counter = 0;
const key = (label) => `test-${label}-${++counter}`;

test('first request within limit returns true', () => {
  assert.equal(rateLimitTake(key('first'), 3, 10_000), true);
});

test('requests up to max all return true', () => {
  const k = key('up-to-max');
  assert.equal(rateLimitTake(k, 3, 10_000), true);
  assert.equal(rateLimitTake(k, 3, 10_000), true);
  assert.equal(rateLimitTake(k, 3, 10_000), true);
});

test('request exceeding max returns false', () => {
  const k = key('over-max');
  rateLimitTake(k, 2, 10_000);
  rateLimitTake(k, 2, 10_000);
  assert.equal(rateLimitTake(k, 2, 10_000), false);
});

test('max=1: second request blocked', () => {
  const k = key('max1');
  assert.equal(rateLimitTake(k, 1, 10_000), true);
  assert.equal(rateLimitTake(k, 1, 10_000), false);
});

test('window reset: new window allows again', async () => {
  const k = key('window-reset');
  rateLimitTake(k, 1, 50); // 50ms window
  assert.equal(rateLimitTake(k, 1, 50), false); // blocked in current window
  await new Promise((r) => setTimeout(r, 60)); // wait for window to expire
  assert.equal(rateLimitTake(k, 1, 50), true); // new window: allowed again
});

test('different keys are independent', () => {
  const k1 = key('ind-a');
  const k2 = key('ind-b');
  rateLimitTake(k1, 1, 10_000);
  assert.equal(rateLimitTake(k1, 1, 10_000), false);
  assert.equal(rateLimitTake(k2, 1, 10_000), true); // k2 still has budget
});
