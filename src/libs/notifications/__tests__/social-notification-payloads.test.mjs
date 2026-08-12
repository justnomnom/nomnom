/**
 * Social / direct notification producers — recipient rules + payloads + panel kinds.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildListSocialNotificationData,
  buildNewFollowerNotificationData,
  resolveNotificationActorFields,
  resolveNotificationSentenceKind,
  resolveOwnerRecipientExcludingActor,
  resolveSocialActorName,
  shouldEmitDirectNotification,
} from '../social-notification-payloads.js';

const OWNER = 'owner-id';
const ACTOR = 'actor-id';
const LIST = 'list-id';

test('invite_accepted / list_subscribed: owner notified; self-actor blocked', () => {
  assert.equal(resolveOwnerRecipientExcludingActor(OWNER, ACTOR), OWNER);
  assert.equal(resolveOwnerRecipientExcludingActor(OWNER, OWNER), null);
  assert.equal(resolveOwnerRecipientExcludingActor(null, ACTOR), null);
  assert.equal(resolveOwnerRecipientExcludingActor(OWNER, null), null);
  assert.equal(resolveOwnerRecipientExcludingActor(123, '123'), null);
});

test('direct emit: invitee / requester ids required', () => {
  assert.equal(shouldEmitDirectNotification(ACTOR), true);
  assert.equal(shouldEmitDirectNotification(''), false);
  assert.equal(shouldEmitDirectNotification('   '), false);
  assert.equal(shouldEmitDirectNotification(null), false);
});

test('list_invite payload includes actor + list fields', () => {
  const data = buildListSocialNotificationData({
    actor: { id: ACTOR, display_name: 'Ada', username: 'ada' },
    listId: LIST,
    listName: 'Lisbon',
  });
  assert.deepEqual(data, {
    actor_id: ACTOR,
    actor_username: 'ada',
    actor_name: 'Ada',
    list_id: LIST,
    list_name: 'Lisbon',
  });
});

test('join_approved uses owner fallback name when actor missing', () => {
  const data = buildListSocialNotificationData({
    actor: null,
    listId: LIST,
    listName: null,
    fallbackName: 'The owner',
  });
  assert.equal(data.actor_id, null);
  assert.equal(data.actor_name, 'The owner');
  assert.equal(data.list_name, null);
});

test('new_follower payload prefers display_name then username', () => {
  assert.deepEqual(
    buildNewFollowerNotificationData({ id: ACTOR, username: 'bob' }),
    { actor_id: ACTOR, actor_username: 'bob', actor_name: 'bob' }
  );
  assert.equal(resolveSocialActorName(null), 'Someone');
  assert.equal(resolveSocialActorName({}), 'Someone');
});

test('panel sentence kinds cover all producers; unknown → list_update', () => {
  assert.equal(resolveNotificationSentenceKind('new_follower'), 'new_follower');
  assert.equal(resolveNotificationSentenceKind('list_invite'), 'list_invite');
  assert.equal(resolveNotificationSentenceKind('list_subscribed'), 'list_subscribed');
  assert.equal(resolveNotificationSentenceKind('invite_accepted'), 'invite_accepted');
  assert.equal(resolveNotificationSentenceKind('join_approved'), 'join_approved');
  assert.equal(resolveNotificationSentenceKind('list_update'), 'list_update');
  assert.equal(resolveNotificationSentenceKind('mystery'), 'list_update');
  assert.equal(resolveNotificationSentenceKind(null), 'list_update');
});

test('panel actor fields unify creator_* and actor_*', () => {
  assert.deepEqual(
    resolveNotificationActorFields({
      creator_name: 'C',
      creator_username: 'c',
      actor_name: 'A',
      actor_username: 'a',
    }),
    { name: 'C', username: 'c' }
  );
  assert.deepEqual(
    resolveNotificationActorFields({ actor_name: 'A', actor_username: 'a' }),
    { name: 'A', username: 'a' }
  );
  assert.deepEqual(resolveNotificationActorFields(null), { name: '', username: null });
});

test('usage matrix: social notification recipients by scenario', () => {
  const scenarios = [
    {
      label: 'invite → invitee',
      recipient: ACTOR,
      expectEmit: true,
    },
    {
      label: 'join approved → requester',
      recipient: 'requester',
      expectEmit: true,
    },
    {
      label: 'invite accepted → owner (not actor)',
      recipient: resolveOwnerRecipientExcludingActor(OWNER, ACTOR),
      expectEmit: true,
    },
    {
      label: 'invite accepted by owner themselves → silent',
      recipient: resolveOwnerRecipientExcludingActor(OWNER, OWNER),
      expectEmit: false,
    },
    {
      label: 'self-subscribe → silent',
      recipient: resolveOwnerRecipientExcludingActor(OWNER, OWNER),
      expectEmit: false,
    },
    {
      label: 'paid subscribe → owner',
      recipient: resolveOwnerRecipientExcludingActor(OWNER, 'subscriber'),
      expectEmit: true,
    },
  ];
  for (const s of scenarios) {
    assert.equal(shouldEmitDirectNotification(s.recipient), s.expectEmit, s.label);
  }
});
