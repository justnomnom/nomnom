import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseThemeCookie, THEME_COOKIE_NAME } from '../theme-cookie.js';

test('THEME_COOKIE_NAME is jn_theme', () => {
  assert.equal(THEME_COOKIE_NAME, 'jn_theme');
});

test('parseThemeCookie: only dark is dark; everything else light', () => {
  assert.equal(parseThemeCookie('dark'), 'dark');
  assert.equal(parseThemeCookie('light'), 'light');
  assert.equal(parseThemeCookie('DARK'), 'light');
  assert.equal(parseThemeCookie(''), 'light');
  assert.equal(parseThemeCookie(null), 'light');
  assert.equal(parseThemeCookie(undefined), 'light');
  assert.equal(parseThemeCookie('system'), 'light');
});
