import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isValidSecret } from '../timing-safe-secret.js';

test('isValidSecret: matching strings return true', () => {
  assert.equal(isValidSecret('super-secret', 'super-secret'), true);
});

test('isValidSecret: mismatched strings return false', () => {
  assert.equal(isValidSecret('super-secret', 'other-secret'), false);
});

test('isValidSecret: different lengths return false (no throw)', () => {
  assert.equal(isValidSecret('short', 'much-longer-secret'), false);
  assert.equal(isValidSecret('much-longer-secret', 'short'), false);
});

test('isValidSecret: empty expected is always false', () => {
  assert.equal(isValidSecret('', ''), false);
  assert.equal(isValidSecret('anything', ''), false);
  assert.equal(isValidSecret('anything', null), false);
  assert.equal(isValidSecret('anything', undefined), false);
});

test('isValidSecret: non-string provided is false', () => {
  assert.equal(isValidSecret(null, 'secret'), false);
  assert.equal(isValidSecret(undefined, 'secret'), false);
  assert.equal(isValidSecret(123, '123'), false);
  assert.equal(isValidSecret({}, 'secret'), false);
});

test('isValidSecret: unicode secrets compare correctly', () => {
  assert.equal(isValidSecret('café🔐', 'café🔐'), true);
  assert.equal(isValidSecret('café🔐', 'cafe🔐'), false);
});
