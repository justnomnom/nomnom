import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getListUpdateDeliveryByUser,
  resolveListUpdateNotificationAudiences,
  shouldNotifyNewFollower,
} from '../filter-notification-recipients.js';

const CREATOR = 'creator';
const LIST = 'list-1';

function resolveListUpdateAudiences(params) {
  const { inAppRecipients, pushRecipients } = resolveListUpdateNotificationAudiences({
    listId: LIST,
    creatorId: CREATOR,
    ...params,
  });
  return { inAppRecipients, pushRecipients };
}

test('flow: public list → follower receives in-app and push', () => {
  const { inAppRecipients, pushRecipients } = resolveListUpdateAudiences({
    visibility: 'public',
    followerIds: ['follower'],
    actingUserId: CREATOR,
  });
  assert.deepEqual(inAppRecipients, ['follower']);
  assert.deepEqual(pushRecipients, ['follower']);
});

test('flow: public list → paid subscriber receives update', () => {
  const { inAppRecipients } = resolveListUpdateAudiences({
    visibility: 'public',
    subscriberIds: ['subscriber'],
    actingUserId: CREATOR,
  });
  assert.deepEqual(inAppRecipients, ['subscriber']);
});

test('flow: public list → follower and subscriber both notified, deduped', () => {
  const { inAppRecipients } = resolveListUpdateAudiences({
    visibility: 'public',
    followerIds: ['u1'],
    subscriberIds: ['u1'],
    actingUserId: CREATOR,
  });
  assert.deepEqual(inAppRecipients, ['u1']);
});

test('flow: public_subscribers → follower alone does not receive update', () => {
  const { inAppRecipients } = resolveListUpdateAudiences({
    visibility: 'public_subscribers',
    followerIds: ['follower'],
    subscriberIds: ['subscriber'],
    actingUserId: CREATOR,
  });
  assert.deepEqual(inAppRecipients, ['subscriber']);
});

test('flow: private list → nobody receives update', () => {
  const { inAppRecipients, pushRecipients } = resolveListUpdateAudiences({
    visibility: 'private',
    followerIds: ['follower'],
    subscriberIds: ['subscriber'],
    actingUserId: CREATOR,
  });
  assert.deepEqual(inAppRecipients, []);
  assert.deepEqual(pushRecipients, []);
});

test('flow: creator adding a spot is never notified', () => {
  const { inAppRecipients } = resolveListUpdateAudiences({
    visibility: 'public',
    followerIds: [CREATOR, 'follower'],
    actingUserId: CREATOR,
    creatorId: CREATOR,
  });
  assert.deepEqual(inAppRecipients, ['follower']);
});

test('flow: collaborator adding a spot is excluded but followers still notified', () => {
  const { inAppRecipients } = resolveListUpdateAudiences({
    visibility: 'public',
    followerIds: ['follower'],
    actingUserId: 'collaborator',
    creatorId: CREATOR,
  });
  assert.deepEqual(inAppRecipients, ['follower']);
});

test('flow: user who mutes the list receives nothing', () => {
  const { inAppRecipients } = resolveListUpdateAudiences({
    visibility: 'public',
    followerIds: ['follower'],
    actingUserId: CREATOR,
    muteRows: [{ user_id: 'follower', target_type: 'list', target_id: LIST }],
  });
  assert.deepEqual(inAppRecipients, []);
});

test('flow: user who mutes the creator receives nothing', () => {
  const { inAppRecipients } = resolveListUpdateAudiences({
    visibility: 'public',
    followerIds: ['follower'],
    actingUserId: CREATOR,
    muteRows: [{ user_id: 'follower', target_type: 'creator', target_id: CREATOR }],
  });
  assert.deepEqual(inAppRecipients, []);
});

test('flow: in-app off still allows push when push is on', () => {
  const { inAppRecipients, pushRecipients } = resolveListUpdateAudiences({
    visibility: 'public',
    followerIds: ['follower'],
    actingUserId: CREATOR,
    prefRows: [{ user_id: 'follower', list_updates_in_app: false, list_updates_push: true }],
  });
  assert.deepEqual(inAppRecipients, []);
  assert.deepEqual(pushRecipients, ['follower']);
});

test('flow: push off still allows in-app when in-app is on', () => {
  const { inAppRecipients, pushRecipients } = resolveListUpdateAudiences({
    visibility: 'public',
    followerIds: ['follower'],
    actingUserId: CREATOR,
    prefRows: [{ user_id: 'follower', list_updates_in_app: true, list_updates_push: false }],
  });
  assert.deepEqual(inAppRecipients, ['follower']);
  assert.deepEqual(pushRecipients, []);
});

test('flow: mixed audience — follower and subscriber with different prefs', () => {
  const { inAppRecipients, pushRecipients } = resolveListUpdateAudiences({
    visibility: 'public',
    followerIds: ['follower'],
    subscriberIds: ['subscriber'],
    actingUserId: CREATOR,
    prefRows: [
      { user_id: 'follower', list_updates_in_app: true, list_updates_push: false },
      { user_id: 'subscriber', list_updates_in_app: false, list_updates_push: true },
    ],
  });
  assert.deepEqual(new Set(inAppRecipients), new Set(['follower']));
  assert.deepEqual(new Set(pushRecipients), new Set(['subscriber']));
});

test('flow: new follower notification — actor notifies recipient', () => {
  assert.equal(shouldNotifyNewFollower('follower', CREATOR), true);
});

test('flow: new follower notification — self-follow blocked', () => {
  assert.equal(shouldNotifyNewFollower(CREATOR, CREATOR), false);
});
