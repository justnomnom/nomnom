/**
 * Frontend QA — safe-storage memory fallback + user/client scoped JSON.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  clientScopedGetJson,
  clientScopedRemoveJson,
  clientScopedSetJson,
  clearUserScopedStorageForUser,
  userScopedGetJson,
  userScopedRemove,
  userScopedSetJson,
} from '../user-scoped-storage.js';
import { safeGetItem, safeRemoveItem, safeSetItem } from '../safe-storage.js';

test('safeSetItem / safeGetItem: memory path round-trips objects in Node', () => {
  const key = `qa-safe-${Date.now()}`;
  assert.equal(safeSetItem(key, { a: 1, b: 'x' }), true);
  assert.deepEqual(safeGetItem(key), { a: 1, b: 'x' });
  assert.equal(safeRemoveItem(key), true);
  assert.equal(safeGetItem(key), null);
});

test('safeSetItem: undefined coerced to null', () => {
  const key = `qa-undef-${Date.now()}`;
  assert.equal(safeSetItem(key, undefined), true);
  assert.equal(safeGetItem(key), null);
  safeRemoveItem(key);
});

test('userScoped JSON: set/get/remove; clear wipes namespace', () => {
  const uid = `qa-user-${Date.now()}`;
  assert.equal(userScopedSetJson(uid, 'map', 'viewState', { zoom: 12 }), true);
  assert.deepEqual(userScopedGetJson(uid, 'map', 'viewState'), { zoom: 12 });
  clearUserScopedStorageForUser(uid);
  assert.equal(userScopedGetJson(uid, 'map', 'viewState'), null);
});

test('clientScoped JSON: guest namespace persists without userId', () => {
  const stamp = Date.now();
  // Use unique segment so parallel runs don't collide on guest key.
  assert.equal(clientScopedSetJson(null, 'map', `chipPrefs${stamp}`, { own: true }), true);
  assert.deepEqual(clientScopedGetJson(null, 'map', `chipPrefs${stamp}`), { own: true });
  assert.equal(clientScopedRemoveJson(null, 'map', `chipPrefs${stamp}`), true);
  assert.equal(clientScopedGetJson(null, 'map', `chipPrefs${stamp}`), null);
});

test('clearUserScopedStorageForUser: no-op for empty userId', () => {
  clearUserScopedStorageForUser(null);
  clearUserScopedStorageForUser('');
});

test('userScopedRemove: removes one key', () => {
  const uid = `qa-rm-${Date.now()}`;
  userScopedSetJson(uid, 'map', 'selectedSpot', { id: 'r1' });
  assert.equal(userScopedRemove(uid, 'map', 'selectedSpot'), true);
  assert.equal(userScopedGetJson(uid, 'map', 'selectedSpot'), null);
});
