import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isValidAuthReturnPath, sanitizeAuthReturnPath } from '../auth-return-path.js';

test('isValidAuthReturnPath: accepts app-relative paths', () => {
  assert.equal(isValidAuthReturnPath('/'), true);
  assert.equal(isValidAuthReturnPath('/discover?x=1'), true);
  assert.equal(isValidAuthReturnPath('/lists/u/slug#top'), true);
});

test('isValidAuthReturnPath: rejects open redirects and non-strings', () => {
  for (const bad of [null, undefined, '', 1, '//x', 'https://x', 'javascript:1', 'data:text/html']) {
    assert.equal(isValidAuthReturnPath(bad), false);
  }
});

test('sanitizeAuthReturnPath: keeps safe paths and falls back otherwise', () => {
  assert.equal(sanitizeAuthReturnPath('/onboarding', '/dashboard/discover'), '/onboarding');
  assert.equal(sanitizeAuthReturnPath('//evil', '/dashboard/discover'), '/dashboard/discover');
  assert.equal(sanitizeAuthReturnPath(null, '/dashboard/discover'), '/dashboard/discover');
});
