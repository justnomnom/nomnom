import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAppLocale } from '../locale-utils.js';

test('null returns en', () => {
  assert.equal(normalizeAppLocale(null), 'en');
});
test('undefined returns en', () => {
  assert.equal(normalizeAppLocale(undefined), 'en');
});
test('empty string returns en', () => {
  assert.equal(normalizeAppLocale(''), 'en');
});
test('"en" returns en', () => {
  assert.equal(normalizeAppLocale('en'), 'en');
});
test('"en-US" returns en', () => {
  assert.equal(normalizeAppLocale('en-US'), 'en');
});
test('"pt" returns pt', () => {
  assert.equal(normalizeAppLocale('pt'), 'pt');
});
test('"pt-PT" returns pt', () => {
  assert.equal(normalizeAppLocale('pt-PT'), 'pt');
});
test('"pt-BR" returns pt', () => {
  assert.equal(normalizeAppLocale('pt-BR'), 'pt');
});
test('"PT" (uppercase) returns pt', () => {
  assert.equal(normalizeAppLocale('PT'), 'pt');
});
test('"fr" returns en (not a supported locale)', () => {
  assert.equal(normalizeAppLocale('fr'), 'en');
});
test('whitespace around valid locale handled', () => {
  assert.equal(normalizeAppLocale('  pt  '), 'pt');
});
