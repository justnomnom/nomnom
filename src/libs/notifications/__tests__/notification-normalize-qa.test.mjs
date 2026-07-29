/**
 * Frontend QA — notification recipient normalize + digest email filter.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeNotificationRecipientIds } from '../create-notification.js';
import {
  filterDigestRecipientsByEmailPreference,
  groupListUpdatesByUserForDigest,
} from '../group-list-update-digest.js';

test('normalizeNotificationRecipientIds: dedupes and drops falsy', () => {
  assert.deepEqual(
    normalizeNotificationRecipientIds(['a', 'b', 'a', '', null, undefined, 1, '1']),
    ['a', 'b', '1']
  );
  assert.deepEqual(normalizeNotificationRecipientIds(null), []);
  assert.deepEqual(normalizeNotificationRecipientIds(undefined), []);
});

test('filterDigestRecipientsByEmailPreference: opt-in only', () => {
  const out = filterDigestRecipientsByEmailPreference(['u1', 'u2', 'u3'], [
    { user_id: 'u1', list_updates_email: true },
    { user_id: 'u2', list_updates_email: false },
    { user_id: 'u3' },
  ]);
  assert.deepEqual([...out], ['u1']);
});

test('filterDigestRecipientsByEmailPreference: empty prefs → nobody', () => {
  assert.equal(filterDigestRecipientsByEmailPreference(['u1'], []).size, 0);
  assert.equal(filterDigestRecipientsByEmailPreference(['u1'], null).size, 0);
});

test('groupListUpdatesByUserForDigest: aggregates counts + default list name', () => {
  const map = groupListUpdatesByUserForDigest([
    { user_id: 'u1', data: { list_id: 'L1', list_name: 'Best' } },
    { user_id: 'u1', data: { list_id: 'L1', list_name: 'Best' } },
    { user_id: 'u1', data: { list_id: 'L2' } },
    { user_id: 'u2', data: {} },
  ]);
  assert.equal(map.get('u1').get('L1').count, 2);
  assert.equal(map.get('u1').get('L1').listName, 'Best');
  assert.equal(map.get('u1').get('L2').listName, 'a list');
  assert.equal(map.has('u2'), false);
});
