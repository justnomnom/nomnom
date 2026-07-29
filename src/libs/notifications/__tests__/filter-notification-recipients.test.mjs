import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  filterMutedRecipients,
  shouldNotifyNewFollower,
  splitRecipientsByListUpdatePreferences,
} from '../filter-notification-recipients.js';

const LIST = 'list-1';
const CREATOR = 'creator-1';

test('filterMutedRecipients removes users who muted the list', () => {
  const out = filterMutedRecipients(
    ['u1', 'u2'],
    [{ user_id: 'u1', target_type: 'list', target_id: LIST }],
    { listId: LIST, creatorId: CREATOR }
  );
  assert.deepEqual(out, ['u2']);
});

test('filterMutedRecipients removes users who muted the creator', () => {
  const out = filterMutedRecipients(
    ['u1', 'u2'],
    [{ user_id: 'u2', target_type: 'creator', target_id: CREATOR }],
    { listId: LIST, creatorId: CREATOR }
  );
  assert.deepEqual(out, ['u1']);
});

test('filterMutedRecipients ignores mutes for other lists or creators', () => {
  const out = filterMutedRecipients(
    ['u1'],
    [
      { user_id: 'u1', target_type: 'list', target_id: 'other-list' },
      { user_id: 'u1', target_type: 'creator', target_id: 'other-creator' },
    ],
    { listId: LIST, creatorId: CREATOR }
  );
  assert.deepEqual(out, ['u1']);
});

test('filterMutedRecipients with no mute rows returns all recipients', () => {
  const out = filterMutedRecipients(['a', 'b'], [], { listId: LIST, creatorId: CREATOR });
  assert.deepEqual(out, ['a', 'b']);
});

test('splitRecipientsByListUpdatePreferences defaults missing rows to both channels', () => {
  const out = splitRecipientsByListUpdatePreferences(['u1', 'u2'], []);
  assert.deepEqual(out.inAppRecipients, ['u1', 'u2']);
  assert.deepEqual(out.pushRecipients, ['u1', 'u2']);
});

test('splitRecipientsByListUpdatePreferences respects in-app opt-out', () => {
  const out = splitRecipientsByListUpdatePreferences(['u1', 'u2'], [
    { user_id: 'u1', list_updates_in_app: false, list_updates_push: true },
  ]);
  assert.deepEqual(out.inAppRecipients, ['u2']);
  assert.deepEqual(out.pushRecipients, ['u1', 'u2']);
});

test('splitRecipientsByListUpdatePreferences respects push opt-out', () => {
  const out = splitRecipientsByListUpdatePreferences(['u1', 'u2'], [
    { user_id: 'u2', list_updates_in_app: true, list_updates_push: false },
  ]);
  assert.deepEqual(out.inAppRecipients, ['u1', 'u2']);
  assert.deepEqual(out.pushRecipients, ['u1']);
});

test('splitRecipientsByListUpdatePreferences can disable both channels for one user', () => {
  const out = splitRecipientsByListUpdatePreferences(['u1'], [
    { user_id: 'u1', list_updates_in_app: false, list_updates_push: false },
  ]);
  assert.deepEqual(out.inAppRecipients, []);
  assert.deepEqual(out.pushRecipients, []);
});

test('shouldNotifyNewFollower allows distinct actor and recipient', () => {
  assert.equal(shouldNotifyNewFollower('a', 'b'), true);
});

test('shouldNotifyNewFollower rejects self-follow', () => {
  assert.equal(shouldNotifyNewFollower('same', 'same'), false);
});

test('shouldNotifyNewFollower rejects missing ids', () => {
  assert.equal(shouldNotifyNewFollower('', 'b'), false);
  assert.equal(shouldNotifyNewFollower('a', null), false);
});

test('shouldNotifyNewFollower treats coerced equal ids as self-follow', () => {
  assert.equal(shouldNotifyNewFollower(123, '123'), false);
});

test('filterMutedRecipients drops falsy recipient ids', () => {
  const out = filterMutedRecipients(['', 'u1', null], [], { listId: LIST, creatorId: CREATOR });
  assert.deepEqual(out, ['u1']);
});

test('splitRecipientsByListUpdatePreferences ignores pref rows for non-recipients', () => {
  const out = splitRecipientsByListUpdatePreferences(['u1'], [
    { user_id: 'other', list_updates_in_app: false, list_updates_push: false },
  ]);
  assert.deepEqual(out.inAppRecipients, ['u1']);
  assert.deepEqual(out.pushRecipients, ['u1']);
});
