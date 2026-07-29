import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isRefreshTokenError } from '../auth-utils.js';

test('isRefreshTokenError: detects known codes and messages', () => {
  assert.equal(isRefreshTokenError({ code: 'refresh_token_not_found' }), true);
  assert.equal(isRefreshTokenError({ message: 'Refresh Token Not Found' }), true);
  assert.equal(isRefreshTokenError({ message: 'Invalid Refresh Token' }), true);
  assert.equal(isRefreshTokenError({ message: 'Auth session missing' }), true);
});

test('isRefreshTokenError: rejects unrelated / missing errors', () => {
  assert.equal(isRefreshTokenError(null), false);
  assert.equal(isRefreshTokenError(undefined), false);
  assert.equal(isRefreshTokenError({}), false);
  assert.equal(isRefreshTokenError({ code: 'other', message: 'Nope' }), false);
  assert.equal(isRefreshTokenError({ message: 'Network error' }), false);
});