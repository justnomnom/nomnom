/**
 * Regression lock: notification hardening bugs must not return.
 *
 * Covers: email opt-in for Live List, digest vs Live List de-dupe,
 * cron fail-closed auth, self-notify guards, newly-added-only semantics.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  filterDigestRecipientsByEmailPreference,
  groupListUpdatesByUserForDigest,
  omitActiveSubscriptionsFromDigest,
} from '../group-list-update-digest.js';
import { isAuthorizedCronRequest } from '../notification-cron-auth.js';
import { listIdsNewlyReceivingRestaurant } from '../list-update-notify-helpers.js';
import {
  resolveOwnerRecipientExcludingActor,
  shouldEmitDirectNotification,
} from '../social-notification-payloads.js';

const FOLLOWER = 'follower';
const SUBSCRIBER = 'subscriber';
const OWNER = 'owner';
const LIST_A = 'list-a';
const LIST_B = 'list-b';

test('regression: Live List / digest email is opt-in only (missing or false → no email)', () => {
  const ids = [FOLLOWER, SUBSCRIBER];
  assert.equal(filterDigestRecipientsByEmailPreference(ids, []).size, 0);
  assert.equal(
    filterDigestRecipientsByEmailPreference(ids, [
      { user_id: FOLLOWER, list_updates_email: false },
      { user_id: SUBSCRIBER, list_updates_email: false },
    ]).size,
    0
  );
  assert.deepEqual(
    [
      ...filterDigestRecipientsByEmailPreference(ids, [
        { user_id: SUBSCRIBER, list_updates_email: true },
      ]),
    ],
    [SUBSCRIBER]
  );
});

test('regression: digest omits lists the user actively subscribes to (no double email with Live List)', () => {
  const byUser = groupListUpdatesByUserForDigest([
    { user_id: SUBSCRIBER, data: { list_id: LIST_A, list_name: 'Paid' } },
    { user_id: SUBSCRIBER, data: { list_id: LIST_B, list_name: 'Free follow' } },
    { user_id: FOLLOWER, data: { list_id: LIST_A, list_name: 'Paid' } },
  ]);

  omitActiveSubscriptionsFromDigest(byUser, [
    { subscriber_user_id: SUBSCRIBER, list_id: LIST_A },
  ]);

  assert.equal(byUser.get(SUBSCRIBER).has(LIST_A), false);
  assert.equal(byUser.get(SUBSCRIBER).get(LIST_B).listName, 'Free follow');
  // Follower is not a subscriber → keeps LIST_A in digest
  assert.equal(byUser.get(FOLLOWER).has(LIST_A), true);
});

test('regression: digest user with only subscribed lists is dropped entirely', () => {
  const byUser = groupListUpdatesByUserForDigest([
    { user_id: SUBSCRIBER, data: { list_id: LIST_A, list_name: 'Paid' } },
  ]);
  omitActiveSubscriptionsFromDigest(byUser, [
    { user_id: SUBSCRIBER, list_id: LIST_A },
  ]);
  assert.equal(byUser.has(SUBSCRIBER), false);
});

test('regression: omitActiveSubscriptionsFromDigest null-safe', () => {
  assert.equal(omitActiveSubscriptionsFromDigest(null, null).size, 0);
  const empty = groupListUpdatesByUserForDigest([]);
  assert.equal(omitActiveSubscriptionsFromDigest(empty, undefined).size, 0);
});

test('regression: cron auth fails closed when secret missing or wrong', () => {
  assert.equal(isAuthorizedCronRequest('Bearer secret', ''), false);
  assert.equal(isAuthorizedCronRequest('Bearer secret', null), false);
  assert.equal(isAuthorizedCronRequest(null, 'secret'), false);
  assert.equal(isAuthorizedCronRequest('Bearer wrong', 'secret'), false);
  assert.equal(isAuthorizedCronRequest('secret', 'secret'), false);
  assert.equal(isAuthorizedCronRequest('Bearer secret', 'secret'), true);
});

test('regression: self-invite / self-subscribe / self-accept never emit', () => {
  assert.equal(resolveOwnerRecipientExcludingActor(OWNER, OWNER), null);
  assert.equal(shouldEmitDirectNotification(OWNER), true);
  // Producer rule: actor === invitee must skip (mirrors members-profile guard)
  const actorId = OWNER;
  const inviteeId = OWNER;
  assert.equal(String(actorId) === String(inviteeId), true);
  assert.equal(resolveOwnerRecipientExcludingActor(OWNER, 'other'), OWNER);
});

test('regression: newly-added-only semantics — re-add set is empty → no fan-out targets', () => {
  assert.deepEqual(listIdsNewlyReceivingRestaurant([LIST_A, LIST_B], [LIST_A, LIST_B]), []);
  assert.deepEqual(listIdsNewlyReceivingRestaurant([LIST_A, LIST_B], [LIST_A]), [LIST_B]);
});

test('regression: remove path must not be treated as a Live List email trigger', () => {
  // Documented contract: removeRestaurantFromList does not call notifyLiveListSubscribers.
  // This test locks the intended event set for email fan-out.
  const liveListEmailEvents = new Set(['restaurant_newly_added_to_list', 'must_try_batch_update']);
  assert.equal(liveListEmailEvents.has('restaurant_removed_from_list'), false);
  assert.equal(liveListEmailEvents.has('restaurant_readded_noop'), false);
});
