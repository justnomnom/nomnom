/**
 * Frontend QA — safeClearPattern + localStorageGetItem memory/default path.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { localStorageGetItem, safeClearPattern, safeGetItem, safeSetItem } from '../safe-storage.js';

test('safeClearPattern: clears memory keys containing substring', () => {
  const stamp = Date.now();
  const keep = `qa-keep-${stamp}`;
  const wipeA = `user-xyz-${stamp}-a`;
  const wipeB = `user-xyz-${stamp}-b`;
  safeSetItem(keep, { ok: 1 });
  safeSetItem(wipeA, { a: 1 });
  safeSetItem(wipeB, { b: 1 });
  safeClearPattern(`user-xyz-${stamp}-`);
  assert.deepEqual(safeGetItem(keep), { ok: 1 });
  assert.equal(safeGetItem(wipeA), null);
  assert.equal(safeGetItem(wipeB), null);
});

test('localStorageGetItem: returns default when missing (Node memory path)', () => {
  const key = `qa-missing-${Date.now()}`;
  assert.equal(localStorageGetItem(key, 'fallback'), 'fallback');
  assert.equal(localStorageGetItem(key), '');
});
