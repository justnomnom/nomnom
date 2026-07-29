/**
 * Frontend QA — UGC translation content hash (stable cache key).
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import { ugcContentHash } from '../ugc-content-hash.js';

test('matches SHA-256 of text + U+001F + locale', () => {
  const expected = createHash('sha256').update(`hello\u001fen`, 'utf8').digest('hex');
  assert.equal(ugcContentHash('hello', 'en'), expected);
});

test('locale changes hash', () => {
  assert.notEqual(ugcContentHash('hello', 'en'), ugcContentHash('hello', 'pt'));
});

test('text changes hash', () => {
  assert.notEqual(ugcContentHash('hello', 'en'), ugcContentHash('Hello', 'en'));
});

test('empty inputs still produce 64-char hex', () => {
  const h = ugcContentHash('', '');
  assert.equal(h.length, 64);
  assert.match(h, /^[a-f0-9]+$/);
});

test('unit separator prevents ambiguous concat collisions', () => {
  // Without separator, 'ab'+'c' and 'a'+'bc' could collide; with U+001F they differ.
  assert.notEqual(ugcContentHash('ab', 'c'), ugcContentHash('a', 'bc'));
});
