/**
 * Notification corner cases + different user usage paths.
 *
 * Covers: creator / collaborator / follower / subscriber / muted / prefs /
 * digest / feed grouping / API mutation targets / panel filters / live-list cooldown.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildListUpdateRecipients } from '../build-list-update-recipients.js';
import { normalizeNotificationRecipientIds } from '../create-notification.js';
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
import {
  LIVE_LIST_NOTIFY_COOLDOWN_HOURS,
  isWithinLiveListNotifyCooldown,
} from '../live-list-notify-cooldown.js';
import {
  parseNotificationListOffset,
  resolveNotificationMutationTarget,
} from '../notification-api-helpers.js';
import {
  NOTIFICATION_LIST_FILTER_ALL,
  NOTIFICATION_TYPES,
  buildNotificationListFilterChips,
  canMuteNotificationList,
  filterNotificationsByListId,
} from '../notification-feed-helpers.js';

const CREATOR = 'creator';
const COLLAB = 'collab';
const FOLLOWER = 'follower';
const SUBSCRIBER = 'subscriber';
const STRANGER = 'stranger';
const LIST = 'list-1';
const LIST_B = 'list-2';

const t = (minsAgo) =>
  new Date(Date.UTC(2026, 0, 1, 12, 0, 0) - minsAgo * 60000).toISOString();

function listUpdate(id, listId, minsAgo, extra = {}) {
  return {
    id,
    type: 'list_update',
    data: {
      list_id: listId,
      creator_id: CREATOR,
      list_name: listId === LIST ? 'Lisbon' : 'Porto',
      ...extra,
    },
    read_at: null,
    created_at: t(minsAgo),
  };
}

// ---------------------------------------------------------------------------
// Multi-user usage: who gets what for a public list update
// ---------------------------------------------------------------------------

test('usage: creator adds spot — follower + subscriber notified; creator/collab/stranger not', () => {
  const delivery = getListUpdateDeliveryByUser(
    [CREATOR, COLLAB, FOLLOWER, SUBSCRIBER, STRANGER],
    {
      visibility: 'public',
      followerIds: [FOLLOWER, COLLAB],
      subscriberIds: [SUBSCRIBER],
      creatorId: CREATOR,
      actingUserId: CREATOR,
      listId: LIST,
    }
  );
  assert.deepEqual(delivery[FOLLOWER], { inApp: true, push: true });
  assert.deepEqual(delivery[SUBSCRIBER], { inApp: true, push: true });
  // Collaborator follows the creator → they still get updates when creator acts
  assert.deepEqual(delivery[COLLAB], { inApp: true, push: true });
  assert.deepEqual(delivery[CREATOR], { inApp: false, push: false });
  assert.deepEqual(delivery[STRANGER], { inApp: false, push: false });
});

test('usage: collaborator adds spot — excluded as actor; creator never notified; followers still are', () => {
  const delivery = getListUpdateDeliveryByUser([CREATOR, COLLAB, FOLLOWER], {
    visibility: 'public',
    followerIds: [FOLLOWER, COLLAB, CREATOR],
    creatorId: CREATOR,
    actingUserId: COLLAB,
    listId: LIST,
  });
  assert.deepEqual(delivery[FOLLOWER], { inApp: true, push: true });
  assert.deepEqual(delivery[COLLAB], { inApp: false, push: false });
  assert.deepEqual(delivery[CREATOR], { inApp: false, push: false });
});

test('usage: paid-only list — free follower blocked, paid subscriber notified', () => {
  const delivery = getListUpdateDeliveryByUser([FOLLOWER, SUBSCRIBER], {
    visibility: 'public_subscribers',
    followerIds: [FOLLOWER],
    subscriberIds: [SUBSCRIBER],
    creatorId: CREATOR,
    actingUserId: CREATOR,
    listId: LIST,
  });
  assert.deepEqual(delivery[FOLLOWER], { inApp: false, push: false });
  assert.deepEqual(delivery[SUBSCRIBER], { inApp: true, push: true });
});

test('usage: private list — silent for everyone including subscribers', () => {
  const delivery = getListUpdateDeliveryByUser([FOLLOWER, SUBSCRIBER, COLLAB], {
    visibility: 'private',
    followerIds: [FOLLOWER, COLLAB],
    subscriberIds: [SUBSCRIBER],
    creatorId: CREATOR,
    actingUserId: CREATOR,
    listId: LIST,
  });
  for (const id of [FOLLOWER, SUBSCRIBER, COLLAB]) {
    assert.deepEqual(delivery[id], { inApp: false, push: false });
  }
});

test('usage: dual follower+subscriber on public_subscribers receives once', () => {
  const { recipients, inAppRecipients } = resolveListUpdateNotificationAudiences({
    visibility: 'public_subscribers',
    followerIds: ['dual'],
    subscriberIds: ['dual'],
    creatorId: CREATOR,
    actingUserId: CREATOR,
    listId: LIST,
  });
  assert.deepEqual(recipients, ['dual']);
  assert.deepEqual(inAppRecipients, ['dual']);
});

// ---------------------------------------------------------------------------
// Mute + preference corner cases per user
// ---------------------------------------------------------------------------

test('usage: mute list blocks both channels; mute of other list does not', () => {
  const muted = resolveListUpdateNotificationAudiences({
    visibility: 'public',
    followerIds: [FOLLOWER],
    creatorId: CREATOR,
    actingUserId: CREATOR,
    listId: LIST,
    muteRows: [{ user_id: FOLLOWER, target_type: 'list', target_id: LIST }],
  });
  assert.deepEqual(muted.inAppRecipients, []);
  assert.deepEqual(muted.pushRecipients, []);

  const otherListMute = resolveListUpdateNotificationAudiences({
    visibility: 'public',
    followerIds: [FOLLOWER],
    creatorId: CREATOR,
    actingUserId: CREATOR,
    listId: LIST,
    muteRows: [{ user_id: FOLLOWER, target_type: 'list', target_id: LIST_B }],
  });
  assert.deepEqual(otherListMute.inAppRecipients, [FOLLOWER]);
});

test('usage: mute creator blocks all their lists for that user', () => {
  const out = resolveListUpdateNotificationAudiences({
    visibility: 'public',
    followerIds: [FOLLOWER],
    creatorId: CREATOR,
    actingUserId: CREATOR,
    listId: LIST,
    muteRows: [{ user_id: FOLLOWER, target_type: 'creator', target_id: CREATOR }],
  });
  assert.deepEqual(out.activeRecipients, []);
});

test('usage: channel prefs — in-app off / push on / both off / missing row default-on', () => {
  const scenarios = [
    {
      prefs: { list_updates_in_app: false, list_updates_push: true },
      expect: { inApp: false, push: true },
    },
    {
      prefs: { list_updates_in_app: true, list_updates_push: false },
      expect: { inApp: true, push: false },
    },
    {
      prefs: { list_updates_in_app: false, list_updates_push: false },
      expect: { inApp: false, push: false },
    },
  ];
  for (const { prefs, expect } of scenarios) {
    const delivery = getListUpdateDeliveryByUser([FOLLOWER], {
      visibility: 'public',
      followerIds: [FOLLOWER],
      creatorId: CREATOR,
      actingUserId: CREATOR,
      listId: LIST,
      prefRows: [{ user_id: FOLLOWER, ...prefs }],
    });
    assert.deepEqual(delivery[FOLLOWER], expect, JSON.stringify(prefs));
  }

  // Missing pref row → both ON (opt-out model for in-app/push)
  const defaults = getListUpdateDeliveryByUser([FOLLOWER], {
    visibility: 'public',
    followerIds: [FOLLOWER],
    creatorId: CREATOR,
    actingUserId: CREATOR,
    listId: LIST,
    prefRows: [],
  });
  assert.deepEqual(defaults[FOLLOWER], { inApp: true, push: true });
});

test('usage: mute wins over prefs (muted user with channels on still gets nothing)', () => {
  const out = resolveListUpdateNotificationAudiences({
    visibility: 'public',
    followerIds: [FOLLOWER],
    creatorId: CREATOR,
    actingUserId: CREATOR,
    listId: LIST,
    muteRows: [{ user_id: FOLLOWER, target_type: 'list', target_id: LIST }],
    prefRows: [{ user_id: FOLLOWER, list_updates_in_app: true, list_updates_push: true }],
  });
  assert.deepEqual(out.inAppRecipients, []);
  assert.deepEqual(out.pushRecipients, []);
});

test('corner: prefs only treat explicit boolean false as opt-out (null/undefined stay on)', () => {
  const out = splitRecipientsByListUpdatePreferences([FOLLOWER], [
    { user_id: FOLLOWER, list_updates_in_app: null, list_updates_push: undefined },
  ]);
  assert.deepEqual(out.inAppRecipients, [FOLLOWER]);
  assert.deepEqual(out.pushRecipients, [FOLLOWER]);
});

test('corner: mute target ids coerced to string (numeric ids still match)', () => {
  const out = filterMutedRecipients(['42'], [{ user_id: 42, target_type: 'list', target_id: 7 }], {
    listId: 7,
    creatorId: CREATOR,
  });
  assert.deepEqual(out, []);
});

test('corner: empty listId/creatorId keys do not false-match other mutes', () => {
  const out = filterMutedRecipients(
    [FOLLOWER],
    [{ user_id: FOLLOWER, target_type: 'list', target_id: LIST }],
    { listId: undefined, creatorId: undefined }
  );
  assert.deepEqual(out, [FOLLOWER]);
});

// ---------------------------------------------------------------------------
// Email digest asymmetry (opt-in) vs in-app/push (opt-out)
// ---------------------------------------------------------------------------

test('usage: email digest is opt-in — default / false / true', () => {
  assert.equal(filterDigestRecipientsByEmailPreference([FOLLOWER], []).size, 0);
  assert.equal(
    filterDigestRecipientsByEmailPreference([FOLLOWER], [
      { user_id: FOLLOWER, list_updates_email: false },
    ]).size,
    0
  );
  assert.deepEqual(
    [
      ...filterDigestRecipientsByEmailPreference([FOLLOWER], [
        { user_id: FOLLOWER, list_updates_email: true },
      ]),
    ],
    [FOLLOWER]
  );
});

test('usage: user can keep in-app on while email digest stays off', () => {
  const delivery = getListUpdateDeliveryByUser([FOLLOWER], {
    visibility: 'public',
    followerIds: [FOLLOWER],
    creatorId: CREATOR,
    actingUserId: CREATOR,
    listId: LIST,
  });
  assert.deepEqual(delivery[FOLLOWER], { inApp: true, push: true });
  assert.equal(
    filterDigestRecipientsByEmailPreference([FOLLOWER], [
      { user_id: FOLLOWER, list_updates_email: false },
    ]).size,
    0
  );
});

test('corner: digest aggregation skips rows without list_id; keeps first list name', () => {
  const byUser = groupListUpdatesByUserForDigest([
    { user_id: FOLLOWER, data: { list_id: LIST, list_name: 'First' } },
    { user_id: FOLLOWER, data: { list_id: LIST, list_name: 'Ignored' } },
    { user_id: FOLLOWER, data: {} },
    { user_id: FOLLOWER, data: null },
  ]);
  assert.equal(byUser.get(FOLLOWER).get(LIST).count, 2);
  assert.equal(byUser.get(FOLLOWER).get(LIST).listName, 'First');
});

// ---------------------------------------------------------------------------
// New follower
// ---------------------------------------------------------------------------

test('usage: new follower notifies followed user; self / missing blocked', () => {
  assert.equal(shouldNotifyNewFollower(FOLLOWER, CREATOR), true);
  assert.equal(shouldNotifyNewFollower(CREATOR, CREATOR), false);
  assert.equal(shouldNotifyNewFollower(null, CREATOR), false);
  assert.equal(shouldNotifyNewFollower(FOLLOWER, ''), false);
  assert.equal(shouldNotifyNewFollower(123, '123'), false);
});

// ---------------------------------------------------------------------------
// Feed grouping + panel filters (consumer UI usage)
// ---------------------------------------------------------------------------

test('usage: mixed feed — list_update bursts group; social types stay single', () => {
  const feed = [
    listUpdate('a', LIST, 0),
    listUpdate('b', LIST, 2),
    {
      id: 'f1',
      type: 'new_follower',
      data: { actor_id: FOLLOWER },
      read_at: null,
      created_at: t(3),
    },
    {
      id: 'inv',
      type: 'list_invite',
      data: { list_id: LIST_B, actor_id: CREATOR },
      read_at: null,
      created_at: t(4),
    },
    listUpdate('c', LIST_B, 5),
  ];
  const grouped = groupNotifications(feed);
  assert.equal(grouped.filter((e) => e.kind === 'group').length, 1);
  assert.equal(grouped.find((e) => e.kind === 'group').count, 2);
  assert.ok(grouped.some((e) => e.kind === 'single' && e.notification.type === 'new_follower'));
  assert.ok(grouped.some((e) => e.kind === 'single' && e.notification.type === 'list_invite'));
});

test('usage: panel list chip filter hides other lists; All restores full feed', () => {
  const feed = [listUpdate('a', LIST, 0), listUpdate('b', LIST_B, 1)];
  assert.deepEqual(filterNotificationsByListId(feed, LIST).map((n) => n.id), ['a']);
  assert.deepEqual(
    filterNotificationsByListId(feed, NOTIFICATION_LIST_FILTER_ALL).map((n) => n.id),
    ['a', 'b']
  );
  assert.deepEqual(filterNotificationsByListId(null, LIST), []);
});

test('usage: list chips are unique first-seen; new_follower without list_id ignored', () => {
  const chips = buildNotificationListFilterChips(
    [
      listUpdate('a', LIST, 0),
      listUpdate('b', LIST, 1),
      listUpdate('c', LIST_B, 2, { list_name: 'Porto Spots' }),
      { id: 'f', type: 'new_follower', data: {}, created_at: t(3) },
    ],
    'Fallback'
  );
  assert.deepEqual(chips, [
    { id: LIST, name: 'Lisbon' },
    { id: LIST_B, name: 'Porto Spots' },
  ]);
});

test('usage: mute action only offered on list_update with list_id', () => {
  assert.equal(canMuteNotificationList(listUpdate('a', LIST, 0)), true);
  assert.equal(
    canMuteNotificationList({
      type: 'new_follower',
      data: { list_id: LIST },
    }),
    false
  );
  assert.equal(
    canMuteNotificationList({ type: 'list_update', data: {} }),
    false
  );
  assert.equal(canMuteNotificationList(null), false);
});

test('corner: known notification types include social + list producers', () => {
  for (const type of [
    'list_update',
    'new_follower',
    'list_invite',
    'list_subscribed',
    'invite_accepted',
    'join_approved',
  ]) {
    assert.ok(NOTIFICATION_TYPES.includes(type), type);
  }
});

test('corner: grouping window exclusive at exactly 24h; just under groups', () => {
  const justUnder = groupNotifications([
    listUpdate('a', LIST, 0),
    listUpdate('b', LIST, 24 * 60 - 1),
  ]);
  assert.equal(justUnder.length, 1);
  assert.equal(justUnder[0].kind, 'group');

  const exact = groupNotifications([listUpdate('a', LIST, 0), listUpdate('b', LIST, 24 * 60)]);
  assert.equal(exact.length, 2);
});

test('corner: missing creator_id still groups by empty creator key + list', () => {
  const grouped = groupNotifications([
    {
      id: 'a',
      type: 'list_update',
      data: { list_id: LIST },
      read_at: null,
      created_at: t(0),
    },
    {
      id: 'b',
      type: 'list_update',
      data: { list_id: LIST },
      read_at: null,
      created_at: t(1),
    },
  ]);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].kind, 'group');
  assert.equal(grouped[0].count, 2);
});

// ---------------------------------------------------------------------------
// API read/delete / pagination corner cases
// ---------------------------------------------------------------------------

test('api: offset parsing — NaN / negative / float / null → safe non-negative int', () => {
  assert.equal(parseNotificationListOffset(null), 0);
  assert.equal(parseNotificationListOffset(undefined), 0);
  assert.equal(parseNotificationListOffset(''), 0);
  assert.equal(parseNotificationListOffset('abc'), 0);
  assert.equal(parseNotificationListOffset('-5'), 0);
  assert.equal(parseNotificationListOffset('12.9'), 12);
  assert.equal(parseNotificationListOffset('30'), 30);
  assert.equal(parseNotificationListOffset('0'), 0);
});

test('api: mutation target — all wins; empty/non-string id rejected; valid id accepted', () => {
  assert.deepEqual(resolveNotificationMutationTarget({ all: true }), { mode: 'all' });
  assert.deepEqual(resolveNotificationMutationTarget({ all: true, id: 'x' }), { mode: 'all' });
  assert.deepEqual(resolveNotificationMutationTarget({ id: 'abc' }), { mode: 'one', id: 'abc' });
  assert.deepEqual(resolveNotificationMutationTarget({ id: '' }), {
    mode: 'error',
    error: 'missing_target',
  });
  assert.deepEqual(resolveNotificationMutationTarget({ id: 123 }), {
    mode: 'error',
    error: 'missing_target',
  });
  assert.deepEqual(resolveNotificationMutationTarget({ all: false }), {
    mode: 'error',
    error: 'missing_target',
  });
  assert.deepEqual(resolveNotificationMutationTarget(null), {
    mode: 'error',
    error: 'missing_target',
  });
  assert.deepEqual(resolveNotificationMutationTarget({}), {
    mode: 'error',
    error: 'missing_target',
  });
});

// ---------------------------------------------------------------------------
// Live List subscriber email cooldown
// ---------------------------------------------------------------------------

test('usage: live-list cooldown — null/invalid allow send; inside window blocks; past window allows', () => {
  const now = Date.UTC(2026, 0, 2, 12, 0, 0);
  assert.equal(isWithinLiveListNotifyCooldown(null, now), false);
  assert.equal(isWithinLiveListNotifyCooldown('not-a-date', now), false);
  assert.equal(
    isWithinLiveListNotifyCooldown(new Date(now - 1 * 3600_000).toISOString(), now),
    true
  );
  assert.equal(
    isWithinLiveListNotifyCooldown(
      new Date(now - LIVE_LIST_NOTIFY_COOLDOWN_HOURS * 3600_000).toISOString(),
      now
    ),
    false
  );
  assert.equal(
    isWithinLiveListNotifyCooldown(
      new Date(now - (LIVE_LIST_NOTIFY_COOLDOWN_HOURS + 1) * 3600_000).toISOString(),
      now
    ),
    false
  );
});

// ---------------------------------------------------------------------------
// Writer / recipient normalize corner cases
// ---------------------------------------------------------------------------

test('corner: writer normalize drops whitespace-only and dedupes after trim', () => {
  assert.deepEqual(normalizeNotificationRecipientIds(['  a  ', 'a', ' ', '\t', false, 0]), [
    'a',
    '0',
  ]);
});

test('corner: buildListUpdateRecipients ignores non-iterables and string audience', () => {
  assert.deepEqual(
    buildListUpdateRecipients({
      visibility: 'public',
      followerIds: 'not-an-id-list',
      subscriberIds: 99,
      creatorId: CREATOR,
      actingUserId: CREATOR,
    }),
    []
  );
});

test('corner: empty audience after actor exclusions yields no deliveries', () => {
  const out = resolveListUpdateNotificationAudiences({
    visibility: 'public',
    followerIds: [CREATOR, COLLAB],
    subscriberIds: [CREATOR],
    creatorId: CREATOR,
    actingUserId: COLLAB,
    listId: LIST,
  });
  assert.deepEqual(out.recipients, []);
  assert.deepEqual(out.inAppRecipients, []);
  assert.deepEqual(out.pushRecipients, []);
});

test('corner: canceled-style subscriber id is still delivered if passed in (upstream must filter status)', () => {
  // Documents contract: visibility helpers do not know subscription status —
  // notify-list-followers must only pass active/trialing ids.
  const out = buildListUpdateRecipients({
    visibility: 'public_subscribers',
    subscriberIds: ['canceled-sub', 'active-sub'],
    creatorId: CREATOR,
    actingUserId: CREATOR,
  });
  assert.deepEqual(new Set(out), new Set(['canceled-sub', 'active-sub']));
});
