import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseThemeCookie, THEME_COOKIE_NAME, themeDatasetBootstrapScript } from '../theme-cookie.js';

test('parseThemeCookie("dark") returns "dark"', () => {
  assert.equal(parseThemeCookie('dark'), 'dark');
});
test('parseThemeCookie("light") returns "light"', () => {
  assert.equal(parseThemeCookie('light'), 'light');
});
test('parseThemeCookie(undefined) defaults to "light"', () => {
  assert.equal(parseThemeCookie(undefined), 'light');
});
test('parseThemeCookie(null) defaults to "light"', () => {
  assert.equal(parseThemeCookie(null), 'light');
});
test('parseThemeCookie("") defaults to "light"', () => {
  assert.equal(parseThemeCookie(''), 'light');
});
test('parseThemeCookie("system") defaults to "light"', () => {
  assert.equal(parseThemeCookie('system'), 'light');
});

test('THEME_COOKIE_NAME is a non-empty string', () => {
  assert.ok(typeof THEME_COOKIE_NAME === 'string' && THEME_COOKIE_NAME.length > 0);
});
test('themeDatasetBootstrapScript is a non-empty string', () => {
  assert.ok(typeof themeDatasetBootstrapScript === 'string' && themeDatasetBootstrapScript.length > 0);
});
test('bootstrap script references THEME_COOKIE_NAME', () => {
  assert.ok(
    themeDatasetBootstrapScript.includes(THEME_COOKIE_NAME),
    'script must contain the cookie name to match it'
  );
});
