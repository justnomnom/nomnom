/**
 * Run: node --test src/libs/lists/__tests__/merge-snapshot-purchase-captured-item-ids.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeSnapshotPurchaseCapturedItemIds } from '../merge-snapshot-purchase-captured-item-ids.js';

test('null or empty rows yields null', () => {
  assert.equal(mergeSnapshotPurchaseCapturedItemIds(null), null);
  assert.equal(mergeSnapshotPurchaseCapturedItemIds(undefined), null);
  assert.equal(mergeSnapshotPurchaseCapturedItemIds([]), null);
});

test('legacy row without captured_list_item_ids yields null', () => {
  assert.equal(mergeSnapshotPurchaseCapturedItemIds([{ captured_list_item_ids: null }]), null);
});

test('dedupes and preserves first-seen order across rows', () => {
  const out = mergeSnapshotPurchaseCapturedItemIds([
    { captured_list_item_ids: ['a', 'b', 'a'] },
    { captured_list_item_ids: ['b', 'c'] },
  ]);
  assert.deepEqual(out, ['a', 'b', 'c']);
});

test('skips non-array captured_list_item_ids but still requires null check on others', () => {
  const out = mergeSnapshotPurchaseCapturedItemIds([
    { captured_list_item_ids: ['x'] },
    { captured_list_item_ids: 'not-array' },
  ]);
  assert.deepEqual(out, ['x']);
});

test('non-array only rows yields empty merged list', () => {
  const out = mergeSnapshotPurchaseCapturedItemIds([
    { captured_list_item_ids: 'bad' },
    { captured_list_item_ids: 1 },
  ]);
  assert.deepEqual(out, []);
});
