import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDishLabelKey, dishTagSlugFromCanonical } from '../dish-tag-slug.js';

// normalizeDishLabelKey
test('trims whitespace', () => {
  assert.equal(normalizeDishLabelKey('  pasta  '), 'pasta');
});
test('lowercases', () => {
  assert.equal(normalizeDishLabelKey('PASTA BOLOGNESE'), 'pasta bolognese');
});
test('collapses internal spaces', () => {
  assert.equal(normalizeDishLabelKey('pasta   bolognese'), 'pasta bolognese');
});
test('handles empty string', () => {
  assert.equal(normalizeDishLabelKey(''), '');
});
test('handles null', () => {
  assert.equal(normalizeDishLabelKey(null), '');
});
test('handles undefined', () => {
  assert.equal(normalizeDishLabelKey(undefined), '');
});

// dishTagSlugFromCanonical
const FAKE_UUID = '550e8400-e29b-41d4-a716-446655440000';

test('returns string starting with "dish-"', () => {
  const slug = dishTagSlugFromCanonical(FAKE_UUID, 'Grilled Salmon');
  assert.ok(slug.startsWith('dish-'), `got: "${slug}"`);
});
test('slug is deterministic for same inputs', () => {
  const a = dishTagSlugFromCanonical(FAKE_UUID, 'Pasta Carbonara');
  const b = dishTagSlugFromCanonical(FAKE_UUID, 'Pasta Carbonara');
  assert.equal(a, b);
});
test('different labels produce different slugs', () => {
  const a = dishTagSlugFromCanonical(FAKE_UUID, 'Pizza');
  const b = dishTagSlugFromCanonical(FAKE_UUID, 'Pasta');
  assert.notEqual(a, b);
});
test('different restaurant ids produce different slugs', () => {
  const uuid2 = '660e8400-e29b-41d4-a716-446655440000';
  const a = dishTagSlugFromCanonical(FAKE_UUID, 'Pizza');
  const b = dishTagSlugFromCanonical(uuid2, 'Pizza');
  assert.notEqual(a, b);
});
test('slug max 220 chars', () => {
  const longLabel = 'a'.repeat(300);
  const slug = dishTagSlugFromCanonical(FAKE_UUID, longLabel);
  assert.ok(slug.length <= 220, `slug length ${slug.length} exceeds 220`);
});
test('empty label uses "x" placeholder', () => {
  const slug = dishTagSlugFromCanonical(FAKE_UUID, '');
  assert.ok(slug.includes('-x-'), `expected "-x-" placeholder in "${slug}"`);
});
test('special chars in label get slugified', () => {
  const slug = dishTagSlugFromCanonical(FAKE_UUID, 'Crème brûlée');
  assert.match(slug, /^dish-[a-f0-9]+-/);
});
