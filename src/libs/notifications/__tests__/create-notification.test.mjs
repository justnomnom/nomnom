import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeNotificationRecipientIds } from '../create-notification.js';

test('normalizeNotificationRecipientIds deduplicates ids', () => {
  assert.deepEqual(normalizeNotificationRecipientIds(['a', 'a', 'b']), ['a', 'b']);
});

test('normalizeNotificationRecipientIds drops falsy values', () => {
  assert.deepEqual(normalizeNotificationRecipientIds(['a', '', null, undefined, 'b']), ['a', 'b']);
});

test('normalizeNotificationRecipientIds coerces to strings', () => {
  assert.deepEqual(normalizeNotificationRecipientIds([1, '1']), ['1']);
});

test('normalizeNotificationRecipientIds empty and null input yields []', () => {
  assert.deepEqual(normalizeNotificationRecipientIds([]), []);
  assert.deepEqual(normalizeNotificationRecipientIds(null), []);
  assert.deepEqual(normalizeNotificationRecipientIds(undefined), []);
});
