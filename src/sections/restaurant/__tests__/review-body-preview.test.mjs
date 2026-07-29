/**
 * Frontend QA — review body "Show more" truncation.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { previewTruncatedBody } from '../review-body-preview.js';

test('previewTruncatedBody: short string unchanged', () => {
  assert.deepEqual(previewTruncatedBody('hello', 200), { text: 'hello', truncated: false });
});

test('previewTruncatedBody: truncates at word boundary when possible', () => {
  const long = `${'word '.repeat(50)}end`;
  const { text, truncated } = previewTruncatedBody(long, 40);
  assert.equal(truncated, true);
  assert.ok(text.endsWith('…'));
  assert.ok(!text.includes('end'));
});

test('previewTruncatedBody: prefers newline break when later in slice', () => {
  const str = `${'a'.repeat(30)}\n${'b'.repeat(30)}`;
  const { text, truncated } = previewTruncatedBody(str, 40);
  assert.equal(truncated, true);
  assert.ok(text.endsWith('…'));
});

test('previewTruncatedBody: no spaces → hard cut', () => {
  const str = 'a'.repeat(50);
  const { text, truncated } = previewTruncatedBody(str, 20);
  assert.equal(truncated, true);
  assert.equal(text, `${'a'.repeat(20)}…`);
});

test('previewTruncatedBody: invalid inputs', () => {
  assert.deepEqual(previewTruncatedBody(null, 10), { text: '', truncated: false });
  assert.deepEqual(previewTruncatedBody('hello', 0), { text: 'hello', truncated: false });
  assert.deepEqual(previewTruncatedBody('hello', NaN), { text: 'hello', truncated: false });
});
