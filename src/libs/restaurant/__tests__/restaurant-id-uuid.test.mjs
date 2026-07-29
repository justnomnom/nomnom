import assert from 'node:assert/strict';
import { test } from 'node:test';

import { RESTAURANT_ID_UUID_RE } from '../restaurant-id-uuid.js';

test('RESTAURANT_ID_UUID_RE: accepts RFC4122 v1–v5 UUIDs', () => {
  assert.ok(RESTAURANT_ID_UUID_RE.test('550e8400-e29b-41d4-a716-446655440000')); // v4
  assert.ok(RESTAURANT_ID_UUID_RE.test('6ba7b810-9dad-11d1-80b4-00c04fd430c8')); // v1
  assert.ok(RESTAURANT_ID_UUID_RE.test('00000000-0000-2000-8000-000000000000')); // v2-ish
  assert.ok(RESTAURANT_ID_UUID_RE.test('01234567-89ab-3cde-8f01-23456789abcd')); // v3
  assert.ok(RESTAURANT_ID_UUID_RE.test('01234567-89ab-5cde-af01-23456789abcd')); // v5
});

test('RESTAURANT_ID_UUID_RE: case insensitive', () => {
  assert.ok(RESTAURANT_ID_UUID_RE.test('550E8400-E29B-41D4-A716-446655440000'));
});

test('RESTAURANT_ID_UUID_RE: rejects invalid inputs', () => {
  assert.equal(RESTAURANT_ID_UUID_RE.test(''), false);
  assert.equal(RESTAURANT_ID_UUID_RE.test('not-a-uuid'), false);
  assert.equal(RESTAURANT_ID_UUID_RE.test('550e8400e29b41d4a716446655440000'), false); // no hyphens
  assert.equal(RESTAURANT_ID_UUID_RE.test('550e8400-e29b-61d4-a716-446655440000'), false); // v6
  assert.equal(RESTAURANT_ID_UUID_RE.test('550e8400-e29b-41d4-c716-446655440000'), false); // bad variant
  assert.equal(RESTAURANT_ID_UUID_RE.test('550e8400-e29b-41d4-a716-44665544000'), false); // short
  assert.equal(RESTAURANT_ID_UUID_RE.test(' 550e8400-e29b-41d4-a716-446655440000 '), false);
});
