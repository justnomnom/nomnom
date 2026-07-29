import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  USER_SCOPED_KEYS,
  clientScopedStorageKey,
  userScopedStorageKey,
} from '../user-scoped-storage.js';

test('userScopedStorageKey: builds uid-segmentA-segmentB', () => {
  assert.equal(userScopedStorageKey('user-1', 'map', 'viewState'), 'user-1-map-viewState');
});

test('userScopedStorageKey: null/empty/non-string userId → null', () => {
  assert.equal(userScopedStorageKey(null, 'a', 'b'), null);
  assert.equal(userScopedStorageKey('', 'a', 'b'), null);
  assert.equal(userScopedStorageKey(undefined, 'a', 'b'), null);
  assert.equal(userScopedStorageKey(123, 'a', 'b'), null);
});

test('userScopedStorageKey: sanitizes segments (special chars, length, empty)', () => {
  assert.equal(
    userScopedStorageKey('u', 'hello world!', 'x/y'),
    'u-hello_world_-x_y'
  );
  assert.equal(userScopedStorageKey('u', '', ''), 'u-_-_');
  const long = 'a'.repeat(100);
  const key = userScopedStorageKey('u', long, 'b');
  assert.ok(key.startsWith('u-'));
  assert.ok(key.includes('-b'));
  assert.ok(key.length < 100 + 10);
});

test('clientScopedStorageKey: falls back to guest when unsigned', () => {
  assert.equal(clientScopedStorageKey(null, 'map', 'filterPrefs'), 'guest-map-filterPrefs');
  assert.equal(clientScopedStorageKey('', 'map', 'filterPrefs'), 'guest-map-filterPrefs');
  assert.equal(clientScopedStorageKey('uid', 'map', 'filterPrefs'), 'uid-map-filterPrefs');
});

test('USER_SCOPED_KEYS: canonical segment pairs are stable tuples', () => {
  assert.deepEqual(USER_SCOPED_KEYS.mapFilterPrefs, ['map', 'filterPrefs']);
  assert.deepEqual(USER_SCOPED_KEYS.mapViewState, ['map', 'viewState']);
  assert.deepEqual(USER_SCOPED_KEYS.listPlacesView, ['lists', 'placesView']);
});
