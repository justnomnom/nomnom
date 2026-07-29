/**
 * The privacy contract of the follow-circle card.
 *
 * `restaurant_follow_circle_for_viewer` returns identity only for savers who also reviewed
 * the restaurant — a review is already public, so naming its author reveals nothing new. A
 * saver who merely added the place to a list comes back as an avatar with no user_id at all,
 * and must stay anonymous on every surface.
 *
 * These tests exist because the failure mode is silent: a normalizer that dropped
 * id-less members would make the avatars disappear while `total` still said "3 people",
 * and one that defaulted a name in would leak exactly what the RPC withheld.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeFollowCircle, followCircleMemberLabel } from '../follow-circle.js';

const UID = '550e8400-e29b-41d4-a716-446655440000';
const UID2 = '660e8400-e29b-41d4-a716-446655440000';

test('review-backed saver carries display name and handle', () => {
  const out = normalizeFollowCircle({
    total: 1,
    members: [
      {
        user_id: UID,
        avatar_url: 'https://img.example/a.jpg',
        display_name: 'Ana Pereira',
        username: 'anap',
      },
    ],
  });
  assert.equal(out.members[0].userId, UID);
  assert.equal(out.members[0].displayName, 'Ana Pereira');
  assert.equal(out.members[0].username, 'anap');
  assert.equal(followCircleMemberLabel(out.members[0]), 'Ana Pereira');
});

test('list-only saver is kept as an anonymous face, not dropped', () => {
  const out = normalizeFollowCircle({
    total: 2,
    members: [{ avatar_url: 'https://img.example/b.jpg' }, { user_id: UID2 }],
  });
  // Dropping the id-less member would contradict `total` and blank the avatar row.
  assert.equal(out.members.length, 2);
  assert.equal(out.members[0].userId, null);
  assert.equal(out.members[0].avatarUrl, 'https://img.example/b.jpg');
  assert.equal(followCircleMemberLabel(out.members[0]), null);
});

test('a name attached to an id-less member is discarded, not rendered', () => {
  // Defence in depth: if the RPC ever regressed and sent a name without an id, the client
  // must not be the thing that publishes it.
  const out = normalizeFollowCircle({
    total: 1,
    members: [{ avatar_url: null, display_name: 'Should Not Appear', username: 'nope' }],
  });
  assert.equal(out.members[0].displayName, null);
  assert.equal(out.members[0].username, null);
  assert.equal(followCircleMemberLabel(out.members[0]), null);
});

test('handle is used when no display name is set', () => {
  const out = normalizeFollowCircle({
    total: 1,
    members: [{ user_id: UID, username: 'solohandle', display_name: '   ' }],
  });
  assert.equal(out.members[0].displayName, null);
  assert.equal(followCircleMemberLabel(out.members[0]), '@solohandle');
});

test('a review-backed member with neither name nor handle has no label', () => {
  const out = normalizeFollowCircle({ total: 1, members: [{ user_id: UID }] });
  assert.equal(followCircleMemberLabel(out.members[0]), null);
});

test('malformed ids are dropped, absent ids are not', () => {
  const out = normalizeFollowCircle({
    total: 3,
    members: [{ user_id: 'not-a-uuid' }, { avatar_url: 'https://img.example/c.jpg' }],
  });
  assert.equal(out.members.length, 1, 'the corrupt row goes, the anonymous row stays');
  assert.equal(out.members[0].avatarUrl, 'https://img.example/c.jpg');
});

test('label helper tolerates junk', () => {
  assert.equal(followCircleMemberLabel(null), null);
  assert.equal(followCircleMemberLabel(undefined), null);
  assert.equal(followCircleMemberLabel({}), null);
});
