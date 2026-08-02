/**
 * Covers the pure half of `og-text.js`. `ogText` / `ogPlural` themselves reach
 * `default-translations`, which imports JSON without an import attribute — fine under
 * webpack, unloadable under Node's ESM loader. That the real keys exist in both locales is
 * covered by `og-locale-parity.test.mjs`, which reads the files from disk instead.
 */

import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import { pluralKey, fillPlaceholders } from '../og-text-format.js';

describe('fillPlaceholders', () => {
  test('substitutes a named placeholder', () => {
    assert.equal(fillPlaceholders('Picks from {{name}}', { name: 'Ana' }), 'Picks from Ana');
  });

  test('substitutes every occurrence', () => {
    assert.equal(fillPlaceholders('{{a}}-{{a}}', { a: 'x' }), 'x-x');
  });

  test('coerces numbers, so counts render', () => {
    assert.equal(fillPlaceholders('{{count}} spots', { count: 214 }), '214 spots');
    assert.equal(fillPlaceholders('{{count}} spots', { count: 0 }), '0 spots');
  });

  test('leaves an unsupplied placeholder intact rather than blanking it', () => {
    assert.equal(fillPlaceholders('by {{owner}}', {}), 'by {{owner}}');
    assert.equal(fillPlaceholders('by {{owner}}', { other: 'x' }), 'by {{owner}}');
  });

  test('returns the text unchanged when no values are given', () => {
    assert.equal(fillPlaceholders('Restaurant picks'), 'Restaurant picks');
    assert.equal(fillPlaceholders('by {{owner}}'), 'by {{owner}}');
  });

  test('leaves Portuguese copy and its diacritics untouched', () => {
    assert.equal(
      fillPlaceholders('Listas de {{name}} no NomNom.', { name: 'João' }),
      'Listas de João no NomNom.'
    );
  });

  test('coerces a non-string to empty rather than throwing', () => {
    assert.equal(fillPlaceholders(undefined, { a: 1 }), '');
    assert.equal(fillPlaceholders(null), '');
  });
});

describe('pluralKey', () => {
  test('picks the singular only at exactly one', () => {
    assert.equal(pluralKey('pages.lists.spot_count', 1), 'pages.lists.spot_count_one');
    assert.equal(pluralKey('pages.lists.spot_count', 2), 'pages.lists.spot_count_other');
  });

  test('uses the plural form at zero, matching i18next', () => {
    assert.equal(pluralKey('pages.lists.spot_count', 0), 'pages.lists.spot_count_other');
  });
});
