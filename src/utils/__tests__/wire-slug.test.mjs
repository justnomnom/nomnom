import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wireSlugFromText } from '../wire-slug.js';

test('simple word lowercased', () => {
  assert.equal(wireSlugFromText('Lisbon'), 'lisbon');
});
test('spaces become hyphens', () => {
  assert.equal(wireSlugFromText('New York City'), 'new-york-city');
});
test('multiple non-alphanumeric chars collapse to one hyphen', () => {
  assert.equal(wireSlugFromText('foo  bar'), 'foo-bar');
});
test('leading and trailing hyphens stripped', () => {
  assert.equal(wireSlugFromText('---foo---'), 'foo');
});
test('accented chars replaced with hyphens then deduped', () => {
  // 'ã' is non-alphanumeric → replaces with '-', so 'São Paulo' → 'S-o-Paulo' → lowercase
  assert.equal(wireSlugFromText('São Paulo'), 's-o-paulo');
});
test('null input returns empty string', () => {
  assert.equal(wireSlugFromText(null), '');
});
test('undefined input returns empty string', () => {
  assert.equal(wireSlugFromText(undefined), '');
});
test('empty string returns empty string', () => {
  assert.equal(wireSlugFromText(''), '');
});
test('already slug-like input unchanged', () => {
  assert.equal(wireSlugFromText('porto'), 'porto');
});
test('numeric input coerced to string', () => {
  assert.equal(wireSlugFromText(42), '42');
});
