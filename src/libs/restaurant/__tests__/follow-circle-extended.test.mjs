import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeFollowCircle } from '../follow-circle.js';

const UID = '550e8400-e29b-41d4-a716-446655440000';
const UID2 = '660e8400-e29b-41d4-a716-446655440000';
const UID3 = '770e8400-e29b-41d4-a716-446655440000';
const UID4 = '880e8400-e29b-41d4-a716-446655440000';

test('normalizeFollowCircle: null for invalid payloads', () => {
  assert.equal(normalizeFollowCircle(null), null);
  assert.equal(normalizeFollowCircle('x'), null);
  assert.equal(normalizeFollowCircle({ total: 'nope' }), null);
  // Negative number is clamped to 0 (still a valid empty circle)
  assert.deepEqual(normalizeFollowCircle({ total: -1 }), { members: [], total: 0 });
});

test('normalizeFollowCircle: parses members, caps at 3, trims avatars', () => {
  const out = normalizeFollowCircle({
    total: '7',
    members: [
      { user_id: UID, avatar_url: ' https://a ' },
      { userId: UID2, avatar_url: '' },
      { user_id: 'not-uuid' },
      { user_id: UID3 },
      { user_id: UID4 },
    ],
  });
  assert.equal(out.total, 7);
  assert.equal(out.members.length, 3);
  assert.equal(out.members[0].avatarUrl, 'https://a');
  assert.equal(out.members[1].avatarUrl, null);
  assert.equal(out.members[2].userId, UID3);
});

test('normalizeFollowCircle: empty members ok', () => {
  assert.deepEqual(normalizeFollowCircle({ total: 0 }), { members: [], total: 0 });
});
