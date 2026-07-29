import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mergeSnapshotPurchaseCapturedItemIds } from '../merge-snapshot-purchase-captured-item-ids.js';

test('mergeSnapshotPurchaseCapturedItemIds: null for empty / legacy rows', () => {
  assert.equal(mergeSnapshotPurchaseCapturedItemIds(null), null);
  assert.equal(mergeSnapshotPurchaseCapturedItemIds([]), null);
  assert.equal(
    mergeSnapshotPurchaseCapturedItemIds([{ captured_list_item_ids: ['a'] }, {}]),
    null
  );
  assert.equal(
    mergeSnapshotPurchaseCapturedItemIds([{ captured_list_item_ids: null }]),
    null
  );
});

test('mergeSnapshotPurchaseCapturedItemIds: ordered unique across rows', () => {
  assert.deepEqual(
    mergeSnapshotPurchaseCapturedItemIds([
      { captured_list_item_ids: ['a', 'b', 'a', ''] },
      { captured_list_item_ids: ['b', 'c'] },
    ]),
    ['a', 'b', 'c']
  );
});

test('mergeSnapshotPurchaseCapturedItemIds: empty arrays merge to []', () => {
  assert.deepEqual(
    mergeSnapshotPurchaseCapturedItemIds([{ captured_list_item_ids: [] }]),
    []
  );
});
