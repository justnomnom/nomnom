/**
 * Frontend QA — about-tags slug helpers (vocabulary mapping).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isValidTagSlug,
  resolveTagIds,
  buildSlugToIdMap,
} from '../about-tags-ai.js';

test('isValidTagSlug: accepts lowercase snake', () => {
  assert.equal(isValidTagSlug('ramen'), true);
  assert.equal(isValidTagSlug('fine_dining'), true);
  assert.equal(isValidTagSlug('price_2'), true);
});

test('isValidTagSlug: rejects empty / non-string / bad chars / too long', () => {
  assert.equal(isValidTagSlug(''), false);
  assert.equal(isValidTagSlug(null), false);
  assert.equal(isValidTagSlug(undefined), false);
  assert.equal(isValidTagSlug(12), false);
  assert.equal(isValidTagSlug('Ramen'), false);
  assert.equal(isValidTagSlug('fine-dining'), false);
  assert.equal(isValidTagSlug('has space'), false);
  assert.equal(isValidTagSlug('a'.repeat(81)), false);
});

test('isValidTagSlug: boundary length 80 ok', () => {
  assert.equal(isValidTagSlug('a'.repeat(80)), true);
});

test('buildSlugToIdMap: skips incomplete rows', () => {
  const map = buildSlugToIdMap([
    { id: '1', slug: 'a' },
    { id: '', slug: 'b' },
    { id: '3', slug: '' },
    null,
    { id: '4', slug: 'c' },
  ]);
  assert.equal(map.get('a'), '1');
  assert.equal(map.get('c'), '4');
  assert.equal(map.has('b'), false);
  assert.equal(map.size, 2);
});

test('resolveTagIds: maps known slugs, skips unknown, dedupes by id', () => {
  const map = new Map([
    ['ramen', 'id-1'],
    ['sushi', 'id-2'],
    ['alias', 'id-1'],
  ]);
  assert.deepEqual(resolveTagIds(map, ['ramen', 'missing', 'sushi', 'ramen', 'alias']), [
    'id-1',
    'id-2',
  ]);
});

test('resolveTagIds: empty inputs', () => {
  assert.deepEqual(resolveTagIds(new Map(), []), []);
  assert.deepEqual(resolveTagIds(new Map([['a', '1']]), []), []);
});
