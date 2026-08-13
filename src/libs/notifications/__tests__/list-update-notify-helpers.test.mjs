/**
 * List-update fan-out helpers, digest window, cleanup cutoff, web push guards.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildListUpdateNotificationData,
  digestWindowSinceIso,
  isDeadWebPushStatus,
  listIdsNewlyReceivingRestaurant,
  notificationCleanupCutoffIso,
  shouldAttemptWebPush,
  shouldFanOutListUpdate,
} from '../list-update-notify-helpers.js';

test('shouldFanOutListUpdate: public + public_subscribers only', () => {
  assert.equal(shouldFanOutListUpdate('public'), true);
  assert.equal(shouldFanOutListUpdate('public_subscribers'), true);
  assert.equal(shouldFanOutListUpdate('private'), false);
  assert.equal(shouldFanOutListUpdate('draft'), false);
  assert.equal(shouldFanOutListUpdate(null), false);
});

test('buildListUpdateNotificationData: names + fallbacks', () => {
  const data = buildListUpdateNotificationData({
    list: { id: 'L1', name: 'Brunch', user_id: 'C1' },
    restaurantId: 'R1',
    restaurant: { name: 'Cafe' },
    creatorProfile: { display_name: 'Ada', username: 'ada' },
  });
  assert.deepEqual(data, {
    list_id: 'L1',
    list_name: 'Brunch',
    creator_id: 'C1',
    creator_username: 'ada',
    creator_name: 'Ada',
    restaurant_id: 'R1',
    restaurant_name: 'Cafe',
  });
});

test('buildListUpdateNotificationData: missing restaurant/creator fallbacks', () => {
  const data = buildListUpdateNotificationData({
    list: { id: 'L1', name: null, user_id: 'C1' },
    restaurantId: 'R1',
    restaurant: null,
    creatorProfile: { username: 'ada' },
  });
  assert.equal(data.restaurant_name, 'a new spot');
  assert.equal(data.creator_name, 'ada');
  assert.equal(data.list_name, null);

  const noProfile = buildListUpdateNotificationData({
    list: { id: 'L1', user_id: 'C1' },
    restaurantId: 'R1',
  });
  assert.equal(noProfile.creator_name, 'A creator you follow');
});

test('digest window + cleanup cutoff are deterministic from nowMs', () => {
  const now = Date.UTC(2026, 0, 10, 12, 0, 0);
  assert.equal(digestWindowSinceIso(24, now), new Date(now - 24 * 3600_000).toISOString());
  assert.equal(notificationCleanupCutoffIso(60, now), new Date(now - 60 * 86400_000).toISOString());
  // Invalid inputs fall back to defaults
  assert.equal(digestWindowSinceIso(0, now), new Date(now - 24 * 3600_000).toISOString());
  assert.equal(notificationCleanupCutoffIso(-1, now), new Date(now - 60 * 86400_000).toISOString());
});

test('web push: dead statuses 404/410; empty audience skipped', () => {
  assert.equal(isDeadWebPushStatus(404), true);
  assert.equal(isDeadWebPushStatus(410), true);
  assert.equal(isDeadWebPushStatus(500), false);
  assert.equal(isDeadWebPushStatus(null), false);
  assert.equal(shouldAttemptWebPush(['u1']), true);
  assert.equal(shouldAttemptWebPush([]), false);
  assert.equal(shouldAttemptWebPush(null), false);
  assert.equal(shouldAttemptWebPush('u1'), false);
});

test('listIdsNewlyReceivingRestaurant: re-adds and empties are skipped', () => {
  assert.deepEqual(listIdsNewlyReceivingRestaurant(['A', 'B'], ['A']), ['B']);
  assert.deepEqual(listIdsNewlyReceivingRestaurant(['A', 'B'], ['A', 'B']), []);
  assert.deepEqual(listIdsNewlyReceivingRestaurant(['A', 'B'], []), ['A', 'B']);
  assert.deepEqual(listIdsNewlyReceivingRestaurant(null, ['A']), []);
  assert.deepEqual(listIdsNewlyReceivingRestaurant(['A', '', null], ['A']), []);
  assert.deepEqual(listIdsNewlyReceivingRestaurant(new Set(['A', 'C']), new Set(['A'])), ['C']);
});
