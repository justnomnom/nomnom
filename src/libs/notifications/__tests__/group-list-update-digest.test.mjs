import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  filterDigestRecipientsByEmailPreference,
  groupListUpdatesByUserForDigest,
} from '../group-list-update-digest.js';

test('groupListUpdatesByUserForDigest aggregates spots per user and list', () => {
  const byUser = groupListUpdatesByUserForDigest([
    { user_id: 'u1', data: { list_id: 'L1', list_name: 'Brunch' } },
    { user_id: 'u1', data: { list_id: 'L1', list_name: 'Brunch' } },
    { user_id: 'u1', data: { list_id: 'L2', list_name: 'Dinner' } },
    { user_id: 'u2', data: { list_id: 'L1', list_name: 'Brunch' } },
  ]);

  assert.equal(byUser.size, 2);
  assert.equal(byUser.get('u1').get('L1').count, 2);
  assert.equal(byUser.get('u1').get('L1').listName, 'Brunch');
  assert.equal(byUser.get('u1').get('L2').count, 1);
  assert.equal(byUser.get('u2').get('L1').count, 1);
});

test('groupListUpdatesByUserForDigest skips rows without list_id', () => {
  const byUser = groupListUpdatesByUserForDigest([
    { user_id: 'u1', data: {} },
    { user_id: 'u1', data: { list_id: 'L1' } },
  ]);
  assert.equal(byUser.get('u1').size, 1);
});

test('groupListUpdatesByUserForDigest empty input yields empty map', () => {
  const byUser = groupListUpdatesByUserForDigest([]);
  assert.equal(byUser.size, 0);
});

test('filterDigestRecipientsByEmailPreference keeps only opted-in users', () => {
  const enabled = filterDigestRecipientsByEmailPreference(['u1', 'u2', 'u3'], [
    { user_id: 'u1', list_updates_email: true },
    { user_id: 'u2', list_updates_email: false },
  ]);
  assert.deepEqual([...enabled], ['u1']);
});

test('filterDigestRecipientsByEmailPreference treats missing pref row as not opted in', () => {
  const enabled = filterDigestRecipientsByEmailPreference(['u1'], []);
  assert.equal(enabled.size, 0);
});

test('filterDigestRecipientsByEmailPreference excludes user with email explicitly false', () => {
  const enabled = filterDigestRecipientsByEmailPreference(['u1', 'u2'], [
    { user_id: 'u1', list_updates_email: true },
    { user_id: 'u2', list_updates_email: false },
  ]);
  assert.deepEqual([...enabled], ['u1']);
});

test('digest: user with notifications but email off receives no digest', () => {
  const byUser = groupListUpdatesByUserForDigest([
    { user_id: 'u1', data: { list_id: 'L1', list_name: 'Brunch' } },
  ]);
  const enabled = filterDigestRecipientsByEmailPreference([...byUser.keys()], [
    { user_id: 'u1', list_updates_email: false },
  ]);
  assert.equal(enabled.size, 0);
});

test('digest: only opted-in users among many notification recipients', () => {
  const byUser = groupListUpdatesByUserForDigest([
    { user_id: 'u1', data: { list_id: 'L1' } },
    { user_id: 'u2', data: { list_id: 'L1' } },
    { user_id: 'u3', data: { list_id: 'L1' } },
  ]);
  const enabled = filterDigestRecipientsByEmailPreference([...byUser.keys()], [
    { user_id: 'u1', list_updates_email: true },
    { user_id: 'u3', list_updates_email: true },
  ]);
  assert.deepEqual([...enabled].sort(), ['u1', 'u3']);
});
