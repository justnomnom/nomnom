/**
 * Dual-perspective notification QA:
 *  - Producer (creator / collaborator acting on a list)
 *  - Consumer (follower / subscriber / muted / prefs / digest / feed grouping)
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildListUpdateRecipients } from '../build-list-update-recipients.js';
import {
  filterMutedRecipients,
  getListUpdateDeliveryByUser,
  resolveListUpdateNotificationAudiences,
  shouldNotifyNewFollower,
  splitRecipientsByListUpdatePreferences,
} from '../filter-notification-recipients.js';
import {
  filterDigestRecipientsByEmailPreference,
  groupListUpdatesByUserForDigest,
} from '../group-list-update-digest.js';
import { groupNotifications } from '../group-notifications.js';
import { normalizeNotificationRecipientIds } from '../create-notification.js';
import { chunkArray } from '../chunk.js';

const CREATOR = 'creator-uuid';
const LIST = 'list-uuid';
const COLLAB = 'collab-uuid';
const FOLLOWER = 'follower-uuid';
const SUBSCRIBER = 'subscriber-uuid';

// ---------------------------------------------------------------------------
// PRODUCER perspective — who the list owner / actor can notify
// ---------------------------------------------------------------------------

test('producer: public list fans out to followers + paid subscribers', () => {
  const ids = buildListUpdateRecipients({
    visibility: 'public',
    followerIds: [FOLLOWER],
    subscriberIds: [SUBSCRIBER],
    creatorId: CREATOR,
    actingUserId: CREATOR,
  });
  assert.deepEqual(new Set(ids), new Set([FOLLOWER, SUBSCRIBER]));
});

test('producer: paid-only list never notifies free followers', () => {
  assert.deepEqual(
    buildListUpdateRecipients({
      visibility: 'public_subscribers',
      followerIds: [FOLLOWER],
      subscriberIds: [SUBSCRIBER],
      creatorId: CREATOR,
      actingUserId: CREATOR,
    }),
    [SUBSCRIBER]
  );
});

test('producer: private list → silent (no fan-out)', () => {
  assert.deepEqual(
    buildListUpdateRecipients({
      visibility: 'private',
      followerIds: [FOLLOWER],
      subscriberIds: [SUBSCRIBER],
      creatorId: CREATOR,
      actingUserId: CREATOR,
    }),
    []
  );
});

test('producer: creator + acting collaborator never receive their own update', () => {
  const ids = buildListUpdateRecipients({
    visibility: 'public',
    followerIds: [CREATOR, FOLLOWER, COLLAB],
    subscriberIds: [CREATOR, COLLAB, SUBSCRIBER],
    creatorId: CREATOR,
    actingUserId: COLLAB,
  });
  assert.ok(!ids.includes(CREATOR));
  assert.ok(!ids.includes(COLLAB));
  assert.deepEqual(new Set(ids), new Set([FOLLOWER, SUBSCRIBER]));
});

test('producer: null / non-iterable audience inputs do not throw', () => {
  assert.deepEqual(
    buildListUpdateRecipients({
      visibility: 'public',
      followerIds: null,
      subscriberIds: undefined,
      creatorId: CREATOR,
      actingUserId: CREATOR,
    }),
    []
  );
  assert.deepEqual(
    buildListUpdateRecipients({
      visibility: 'public',
      followerIds: 12,
      subscriberIds: { not: 'iterable' },
      creatorId: CREATOR,
      actingUserId: CREATOR,
    }),
    []
  );
});

test('producer: Set inputs accepted (deduped)', () => {
  const ids = buildListUpdateRecipients({
    visibility: 'public',
    followerIds: new Set([FOLLOWER, FOLLOWER]),
    subscriberIds: new Set([FOLLOWER, SUBSCRIBER]),
    creatorId: CREATOR,
    actingUserId: CREATOR,
  });
  assert.deepEqual(new Set(ids), new Set([FOLLOWER, SUBSCRIBER]));
});

// ---------------------------------------------------------------------------
// CONSUMER perspective — mute / channel prefs / delivery map
// ---------------------------------------------------------------------------

test('consumer: mute list or creator blocks all channels', () => {
  for (const mute of [
    { user_id: FOLLOWER, target_type: 'list', target_id: LIST },
    { user_id: FOLLOWER, target_type: 'creator', target_id: CREATOR },
  ]) {
    const { inAppRecipients, pushRecipients } = resolveListUpdateNotificationAudiences({
      visibility: 'public',
      followerIds: [FOLLOWER],
      creatorId: CREATOR,
      actingUserId: CREATOR,
      listId: LIST,
      muteRows: [mute],
    });
    assert.deepEqual(inAppRecipients, []);
    assert.deepEqual(pushRecipients, []);
  }
});

test('consumer: can keep push while opting out of in-app (and vice versa)', () => {
  const pushOnly = resolveListUpdateNotificationAudiences({
    visibility: 'public',
    followerIds: [FOLLOWER],
    creatorId: CREATOR,
    actingUserId: CREATOR,
    listId: LIST,
    prefRows: [{ user_id: FOLLOWER, list_updates_in_app: false, list_updates_push: true }],
  });
  assert.deepEqual(pushOnly.inAppRecipients, []);
  assert.deepEqual(pushOnly.pushRecipients, [FOLLOWER]);

  const inAppOnly = resolveListUpdateNotificationAudiences({
    visibility: 'public',
    followerIds: [FOLLOWER],
    creatorId: CREATOR,
    actingUserId: CREATOR,
    listId: LIST,
    prefRows: [{ user_id: FOLLOWER, list_updates_in_app: true, list_updates_push: false }],
  });
  assert.deepEqual(inAppOnly.inAppRecipients, [FOLLOWER]);
  assert.deepEqual(inAppOnly.pushRecipients, []);
});

test('consumer: missing pref row defaults both channels ON (opt-out model)', () => {
  const { inAppRecipients, pushRecipients } = resolveListUpdateNotificationAudiences({
    visibility: 'public',
    followerIds: [FOLLOWER],
    creatorId: CREATOR,
    actingUserId: CREATOR,
    listId: LIST,
    prefRows: [],
  });
  assert.deepEqual(inAppRecipients, [FOLLOWER]);
  assert.deepEqual(pushRecipients, [FOLLOWER]);
});

test('consumer: delivery map answers per-user questions for mixed audience', () => {
  const delivery = getListUpdateDeliveryByUser([FOLLOWER, SUBSCRIBER, 'stranger', CREATOR], {
    visibility: 'public',
    followerIds: [FOLLOWER],
    subscriberIds: [SUBSCRIBER],
    creatorId: CREATOR,
    actingUserId: CREATOR,
    listId: LIST,
    prefRows: [
      { user_id: FOLLOWER, list_updates_in_app: true, list_updates_push: false },
      { user_id: SUBSCRIBER, list_updates_in_app: false, list_updates_push: true },
    ],
  });
  assert.deepEqual(delivery[FOLLOWER], { inApp: true, push: false });
  assert.deepEqual(delivery[SUBSCRIBER], { inApp: false, push: true });
  assert.deepEqual(delivery.stranger, { inApp: false, push: false });
  assert.deepEqual(delivery[CREATOR], { inApp: false, push: false });
});

test('consumer: getListUpdateDeliveryByUser null candidates → {}', () => {
  assert.deepEqual(
    getListUpdateDeliveryByUser(null, {
      visibility: 'public',
      followerIds: [FOLLOWER],
      listId: LIST,
      creatorId: CREATOR,
      actingUserId: CREATOR,
    }),
    {}
  );
});

test('consumer: filterMuted + prefs helpers null-safe', () => {
  assert.deepEqual(filterMutedRecipients(null, null, { listId: LIST, creatorId: CREATOR }), []);
  assert.deepEqual(splitRecipientsByListUpdatePreferences(null, {}), {
    inAppRecipients: [],
    pushRecipients: [],
  });
});

// ---------------------------------------------------------------------------
// CONSUMER — email digest + in-app feed grouping
// ---------------------------------------------------------------------------

test('consumer digest: aggregates per user/list; default name; email opt-in only', () => {
  const byUser = groupListUpdatesByUserForDigest([
    { user_id: FOLLOWER, data: { list_id: LIST, list_name: 'Lisbon' } },
    { user_id: FOLLOWER, data: { list_id: LIST, list_name: 'Ignored later' } },
    { user_id: FOLLOWER, data: { list_id: 'other' } },
    { user_id: SUBSCRIBER, data: { list_id: LIST, list_name: 'Lisbon' } },
    { user_id: 'nobody', data: {} },
  ]);
  assert.equal(byUser.get(FOLLOWER).get(LIST).count, 2);
  assert.equal(byUser.get(FOLLOWER).get(LIST).listName, 'Lisbon');
  assert.equal(byUser.get(FOLLOWER).get('other').listName, 'a list');

  const emailOk = filterDigestRecipientsByEmailPreference(
    [FOLLOWER, SUBSCRIBER],
    [
      { user_id: FOLLOWER, list_updates_email: true },
      { user_id: SUBSCRIBER, list_updates_email: false },
    ]
  );
  assert.deepEqual([...emailOk], [FOLLOWER]);
});

test('consumer feed: bursts collapse; unread tallied; different lists stay separate', () => {
  const t = (m) => new Date(Date.UTC(2026, 0, 1, 12, 0, 0) - m * 60000).toISOString();
  const n = (id, listId, mins, read = false) => ({
    id,
    type: 'list_update',
    data: { list_id: listId, creator_id: CREATOR },
    read_at: read ? t(0) : null,
    created_at: t(mins),
  });
  const grouped = groupNotifications([
    n('a', LIST, 0),
    n('b', LIST, 2, true),
    n('c', LIST, 4),
    n('d', 'other', 1),
  ]);
  assert.equal(grouped.length, 2);
  const burst = grouped.find((e) => e.kind === 'group');
  assert.ok(burst);
  assert.equal(burst.count, 3);
  assert.equal(burst.unreadCount, 2);
});

// ---------------------------------------------------------------------------
// Cross-cutting — writer / chunking / follow notify
// ---------------------------------------------------------------------------

test('writer: normalize recipients drops falsy + whitespace; chunks bound payload size', () => {
  assert.deepEqual(normalizeNotificationRecipientIds([FOLLOWER, ' ', FOLLOWER, null]), [
    FOLLOWER,
  ]);
  assert.deepEqual(chunkArray([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunkArray(null, 2), []);
});

test('new-follower: producer notifies consumer; self-follow blocked; null ids blocked', () => {
  assert.equal(shouldNotifyNewFollower(FOLLOWER, CREATOR), true);
  assert.equal(shouldNotifyNewFollower(CREATOR, CREATOR), false);
  assert.equal(shouldNotifyNewFollower(null, CREATOR), false);
  assert.equal(shouldNotifyNewFollower(FOLLOWER, ''), false);
});
