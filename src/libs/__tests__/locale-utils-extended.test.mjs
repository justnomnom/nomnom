import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeAppLocale } from '../locale-utils.js';

test('normalizeAppLocale: pt variants', () => {
  assert.equal(normalizeAppLocale('pt'), 'pt');
  assert.equal(normalizeAppLocale('PT'), 'pt');
  assert.equal(normalizeAppLocale('pt-PT'), 'pt');
  assert.equal(normalizeAppLocale('pt-BR'), 'pt');
  assert.equal(normalizeAppLocale('  pt-pt  '), 'pt');
});

test('normalizeAppLocale: everything else → en', () => {
  assert.equal(normalizeAppLocale('en'), 'en');
  assert.equal(normalizeAppLocale('en-US'), 'en');
  assert.equal(normalizeAppLocale('fr'), 'en');
  assert.equal(normalizeAppLocale(''), 'en');
  assert.equal(normalizeAppLocale(null), 'en');
  assert.equal(normalizeAppLocale(undefined), 'en');
  assert.equal(normalizeAppLocale(12), 'en');
});
