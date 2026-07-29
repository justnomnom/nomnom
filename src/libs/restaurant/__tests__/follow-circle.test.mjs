import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFollowCircle } from '../follow-circle.js';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID2 = '660e8400-e29b-41d4-a716-446655440001';
const VALID_UUID3 = '770e8400-e29b-41d4-a716-446655440002';

// null / invalid input
test('returns null for null input', () => {
  assert.equal(normalizeFollowCircle(null), null);
});
test('returns null for undefined input', () => {
  assert.equal(normalizeFollowCircle(undefined), null);
});
test('returns null for non-object', () => {
  assert.equal(normalizeFollowCircle('string'), null);
  assert.equal(normalizeFollowCircle(42), null);
});
test('negative total clamped to 0 (not null)', () => {
  // Implementation uses Math.max(0, ...) for numeric totals, so -1 → 0
  const r = normalizeFollowCircle({ total: -1, members: [] });
  assert.deepEqual(r, { members: [], total: 0 });
});
test('returns null for non-numeric total', () => {
  assert.equal(normalizeFollowCircle({ total: 'bad', members: [] }), null);
});

// valid payload
test('total 0, no members → {members:[], total:0}', () => {
  const r = normalizeFollowCircle({ total: 0, members: [] });
  assert.deepEqual(r, { members: [], total: 0 });
});
test('parses snake_case user_id', () => {
  const r = normalizeFollowCircle({
    total: 1,
    members: [{ user_id: VALID_UUID, avatar_url: 'https://img.example.com/a.jpg' }],
  });
  assert.equal(r.members[0].userId, VALID_UUID);
  assert.equal(r.members[0].avatarUrl, 'https://img.example.com/a.jpg');
});
test('parses camelCase userId', () => {
  const r = normalizeFollowCircle({
    total: 1,
    members: [{ userId: VALID_UUID }],
  });
  assert.equal(r.members[0].userId, VALID_UUID);
});
test('drops member with invalid UUID', () => {
  const r = normalizeFollowCircle({
    total: 2,
    members: [
      { user_id: 'not-a-uuid' },
      { user_id: VALID_UUID },
    ],
  });
  assert.equal(r.members.length, 1);
  assert.equal(r.members[0].userId, VALID_UUID);
});
test('caps members at 3', () => {
  const r = normalizeFollowCircle({
    total: 10,
    members: [
      { user_id: VALID_UUID },
      { user_id: VALID_UUID2 },
      { user_id: VALID_UUID3 },
      { user_id: '880e8400-e29b-41d4-a716-446655440003' },
    ],
  });
  assert.equal(r.members.length, 3);
});
test('null avatar_url → avatarUrl: null', () => {
  const r = normalizeFollowCircle({
    total: 1,
    members: [{ user_id: VALID_UUID, avatar_url: null }],
  });
  assert.equal(r.members[0].avatarUrl, null);
});
test('empty avatar_url string → avatarUrl: null', () => {
  const r = normalizeFollowCircle({
    total: 1,
    members: [{ user_id: VALID_UUID, avatar_url: '   ' }],
  });
  assert.equal(r.members[0].avatarUrl, null);
});
test('missing members key → empty members array', () => {
  const r = normalizeFollowCircle({ total: 5 });
  assert.deepEqual(r, { members: [], total: 5 });
});
test('total as string number gets parsed', () => {
  const r = normalizeFollowCircle({ total: '3', members: [] });
  assert.equal(r.total, 3);
});
