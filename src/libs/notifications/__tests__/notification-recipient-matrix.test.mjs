import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getListUpdateDeliveryByUser,
  resolveListUpdateNotificationAudiences,
} from '../filter-notification-recipients.js';

const CREATOR = 'creator';
const LIST = 'list-1';

/** Assert who receives in-app/push and who receives nothing. */
function expectDelivery(params, candidates, expected) {
  const delivery = getListUpdateDeliveryByUser(candidates, { listId: LIST, ...params });
  for (const [userId, channels] of Object.entries(expected)) {
    assert.deepEqual(
      delivery[userId],
      channels,
      `delivery mismatch for ${userId} in scenario: ${params.label ?? 'unnamed'}`
    );
  }
  for (const id of candidates) {
    if (!expected[id]) {
      assert.deepEqual(
        delivery[id],
        { inApp: false, push: false },
        `expected ${id} to receive nothing`
      );
    }
  }
}

const matrix = [
  {
    label: 'public: follower yes, subscriber yes, stranger no',
    params: {
      visibility: 'public',
      followerIds: ['follower'],
      subscriberIds: ['subscriber'],
      actingUserId: CREATOR,
      creatorId: CREATOR,
    },
    candidates: ['follower', 'subscriber', 'stranger', CREATOR],
    expected: {
      follower: { inApp: true, push: true },
      subscriber: { inApp: true, push: true },
    },
  },
  {
    label: 'public: acting subscriber excluded even when subscribed',
    params: {
      visibility: 'public',
      followerIds: ['follower'],
      subscriberIds: ['acting-subscriber'],
      actingUserId: 'acting-subscriber',
      creatorId: CREATOR,
    },
    candidates: ['follower', 'acting-subscriber'],
    expected: {
      follower: { inApp: true, push: true },
    },
  },
  {
    label: 'public: acting follower excluded even when following',
    params: {
      visibility: 'public',
      followerIds: ['acting-follower', 'other-follower'],
      actingUserId: 'acting-follower',
      creatorId: CREATOR,
    },
    candidates: ['acting-follower', 'other-follower'],
    expected: {
      'other-follower': { inApp: true, push: true },
    },
  },
  {
    label: 'public: creator in subscriber list still excluded',
    params: {
      visibility: 'public',
      subscriberIds: [CREATOR, 'subscriber'],
      actingUserId: CREATOR,
      creatorId: CREATOR,
    },
    candidates: [CREATOR, 'subscriber'],
    expected: {
      subscriber: { inApp: true, push: true },
    },
  },
  {
    label: 'public: creator and collaborator both excluded',
    params: {
      visibility: 'public',
      followerIds: ['follower'],
      subscriberIds: [CREATOR, 'collaborator', 'subscriber'],
      actingUserId: 'collaborator',
      creatorId: CREATOR,
    },
    candidates: [CREATOR, 'collaborator', 'follower', 'subscriber'],
    expected: {
      follower: { inApp: true, push: true },
      subscriber: { inApp: true, push: true },
    },
  },
  {
    label: 'public_subscribers: follower-only never receives',
    params: {
      visibility: 'public_subscribers',
      followerIds: ['follower-only'],
      subscriberIds: ['subscriber'],
      actingUserId: CREATOR,
      creatorId: CREATOR,
    },
    candidates: ['follower-only', 'subscriber'],
    expected: {
      subscriber: { inApp: true, push: true },
    },
  },
  {
    label: 'public_subscribers: follower+subscriber receives once',
    params: {
      visibility: 'public_subscribers',
      followerIds: ['dual'],
      subscriberIds: ['dual'],
      actingUserId: CREATOR,
      creatorId: CREATOR,
    },
    candidates: ['dual'],
    expected: {
      dual: { inApp: true, push: true },
    },
  },
  {
    label: 'private: follower and subscriber both blocked',
    params: {
      visibility: 'private',
      followerIds: ['follower'],
      subscriberIds: ['subscriber'],
      actingUserId: CREATOR,
      creatorId: CREATOR,
    },
    candidates: ['follower', 'subscriber'],
    expected: {},
  },
  {
    label: 'mute list: only muted user dropped from mixed audience',
    params: {
      visibility: 'public',
      followerIds: ['follower-a', 'follower-b'],
      actingUserId: CREATOR,
      creatorId: CREATOR,
      muteRows: [{ user_id: 'follower-a', target_type: 'list', target_id: LIST }],
    },
    candidates: ['follower-a', 'follower-b'],
    expected: {
      'follower-b': { inApp: true, push: true },
    },
  },
  {
    label: 'mute creator: subscriber still blocked when creator muted',
    params: {
      visibility: 'public',
      subscriberIds: ['subscriber'],
      actingUserId: CREATOR,
      creatorId: CREATOR,
      muteRows: [{ user_id: 'subscriber', target_type: 'creator', target_id: CREATOR }],
    },
    candidates: ['subscriber'],
    expected: {},
  },
  {
    label: 'mute list + creator on same user still one exclusion',
    params: {
      visibility: 'public',
      followerIds: ['muted-user', 'active-user'],
      actingUserId: CREATOR,
      creatorId: CREATOR,
      muteRows: [
        { user_id: 'muted-user', target_type: 'list', target_id: LIST },
        { user_id: 'muted-user', target_type: 'creator', target_id: CREATOR },
      ],
    },
    candidates: ['muted-user', 'active-user'],
    expected: {
      'active-user': { inApp: true, push: true },
    },
  },
  {
    label: 'prefs: in-app only user',
    params: {
      visibility: 'public',
      followerIds: ['u1'],
      actingUserId: CREATOR,
      creatorId: CREATOR,
      prefRows: [{ user_id: 'u1', list_updates_in_app: true, list_updates_push: false }],
    },
    candidates: ['u1'],
    expected: {
      u1: { inApp: true, push: false },
    },
  },
  {
    label: 'prefs: push only user',
    params: {
      visibility: 'public',
      followerIds: ['u1'],
      actingUserId: CREATOR,
      creatorId: CREATOR,
      prefRows: [{ user_id: 'u1', list_updates_in_app: false, list_updates_push: true }],
    },
    candidates: ['u1'],
    expected: {
      u1: { inApp: false, push: true },
    },
  },
  {
    label: 'prefs: both channels off → receives nothing',
    params: {
      visibility: 'public',
      followerIds: ['u1'],
      actingUserId: CREATOR,
      creatorId: CREATOR,
      prefRows: [{ user_id: 'u1', list_updates_in_app: false, list_updates_push: false }],
    },
    candidates: ['u1'],
    expected: {
      u1: { inApp: false, push: false },
    },
  },
  {
    label: 'prefs: explicit true matches default-on behavior',
    params: {
      visibility: 'public',
      followerIds: ['u1'],
      actingUserId: CREATOR,
      creatorId: CREATOR,
      prefRows: [{ user_id: 'u1', list_updates_in_app: true, list_updates_push: true }],
    },
    candidates: ['u1'],
    expected: {
      u1: { inApp: true, push: true },
    },
  },
  {
    label: 'mixed audience: mute + prefs combine per user',
    params: {
      visibility: 'public',
      followerIds: ['follower', 'muted-follower'],
      subscriberIds: ['subscriber'],
      actingUserId: CREATOR,
      creatorId: CREATOR,
      muteRows: [{ user_id: 'muted-follower', target_type: 'list', target_id: LIST }],
      prefRows: [
        { user_id: 'follower', list_updates_in_app: true, list_updates_push: false },
        { user_id: 'subscriber', list_updates_in_app: false, list_updates_push: true },
      ],
    },
    candidates: ['follower', 'muted-follower', 'subscriber'],
    expected: {
      follower: { inApp: true, push: false },
      subscriber: { inApp: false, push: true },
    },
  },
  {
    label: 'duplicate follower ids do not duplicate delivery',
    params: {
      visibility: 'public',
      followerIds: ['u1', 'u1', 'u1'],
      actingUserId: CREATOR,
      creatorId: CREATOR,
    },
    candidates: ['u1'],
    expected: {
      u1: { inApp: true, push: true },
    },
  },
  {
    label: 'empty audience after exclusions yields no deliveries',
    params: {
      visibility: 'public',
      followerIds: [CREATOR],
      subscriberIds: ['collaborator'],
      actingUserId: 'collaborator',
      creatorId: CREATOR,
    },
    candidates: [CREATOR, 'collaborator'],
    expected: {},
  },
  {
    label: 'unknown visibility blocks everyone despite followers/subscribers',
    params: {
      visibility: 'draft',
      followerIds: ['follower'],
      subscriberIds: ['subscriber'],
      actingUserId: CREATOR,
      creatorId: CREATOR,
    },
    candidates: ['follower', 'subscriber'],
    expected: {},
  },
];

for (const scenario of matrix) {
  test(`matrix: ${scenario.label}`, () => {
    expectDelivery(scenario.params, scenario.candidates, scenario.expected);
  });
}

test('matrix: resolveListUpdateNotificationAudiences exposes intermediate sets', () => {
  const out = resolveListUpdateNotificationAudiences({
    visibility: 'public',
    followerIds: ['follower', CREATOR],
    subscriberIds: ['subscriber'],
    creatorId: CREATOR,
    actingUserId: CREATOR,
    listId: LIST,
    muteRows: [{ user_id: 'subscriber', target_type: 'creator', target_id: CREATOR }],
    prefRows: [{ user_id: 'follower', list_updates_in_app: false, list_updates_push: true }],
  });

  assert.deepEqual(new Set(out.recipients), new Set(['follower', 'subscriber']));
  assert.deepEqual(out.activeRecipients, ['follower']);
  assert.deepEqual(out.inAppRecipients, []);
  assert.deepEqual(out.pushRecipients, ['follower']);
});

test('matrix: pref row for non-recipient user is ignored safely', () => {
  const delivery = getListUpdateDeliveryByUser(['follower'], {
    visibility: 'public',
    followerIds: ['follower'],
    actingUserId: CREATOR,
    creatorId: CREATOR,
    listId: LIST,
    prefRows: [{ user_id: 'someone-else', list_updates_in_app: false, list_updates_push: false }],
  });
  assert.deepEqual(delivery.follower, { inApp: true, push: true });
});

test('matrix: mute row for non-recipient user does not block others', () => {
  const delivery = getListUpdateDeliveryByUser(['follower-a', 'follower-b'], {
    visibility: 'public',
    followerIds: ['follower-a', 'follower-b'],
    actingUserId: CREATOR,
    creatorId: CREATOR,
    listId: LIST,
    muteRows: [{ user_id: 'unrelated', target_type: 'list', target_id: LIST }],
  });
  assert.deepEqual(delivery['follower-a'], { inApp: true, push: true });
  assert.deepEqual(delivery['follower-b'], { inApp: true, push: true });
});
