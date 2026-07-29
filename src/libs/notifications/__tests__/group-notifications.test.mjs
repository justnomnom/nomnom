import assert from 'node:assert/strict';
import { test } from 'node:test';

import { groupNotifications } from '../group-notifications.js';

const t = (isoOffsetMinutes) =>
  new Date(Date.UTC(2026, 0, 1, 12, 0, 0) - isoOffsetMinutes * 60000).toISOString();

function listUpdate(id, listId, creatorId, minutesAgo, read = false) {
  return {
    id,
    type: 'list_update',
    data: { list_id: listId, creator_id: creatorId, list_name: 'L', restaurant_name: 'R' },
    read_at: read ? t(0) : null,
    created_at: t(minutesAgo),
  };
}

test('bursts from same creator+list collapse into one group', () => {
  const out = groupNotifications([
    listUpdate('a', 'L1', 'C1', 0),
    listUpdate('b', 'L1', 'C1', 5),
    listUpdate('c', 'L1', 'C1', 10),
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'group');
  assert.equal(out[0].count, 3);
});

test('single list_update stays a plain single', () => {
  const out = groupNotifications([listUpdate('a', 'L1', 'C1', 0)]);
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'single');
});

test('different lists are not grouped together', () => {
  const out = groupNotifications([
    listUpdate('a', 'L1', 'C1', 0),
    listUpdate('b', 'L2', 'C1', 1),
  ]);
  assert.equal(out.length, 2);
  assert.ok(out.every((e) => e.kind === 'single'));
});

test('items more than 24h apart are not grouped', () => {
  const out = groupNotifications([
    listUpdate('a', 'L1', 'C1', 0),
    listUpdate('b', 'L1', 'C1', 60 * 25),
  ]);
  assert.equal(out.length, 2);
});

test('unreadCount is tallied per group', () => {
  const out = groupNotifications([
    listUpdate('a', 'L1', 'C1', 0, false),
    listUpdate('b', 'L1', 'C1', 5, true),
    listUpdate('c', 'L1', 'C1', 10, false),
  ]);
  assert.equal(out[0].kind, 'group');
  assert.equal(out[0].unreadCount, 2);
});

test('non-list_update types stay single', () => {
  const out = groupNotifications([
    { id: 'x', type: 'new_follower', data: {}, read_at: null, created_at: t(0) },
    { id: 'y', type: 'new_follower', data: {}, read_at: null, created_at: t(1) },
  ]);
  assert.equal(out.length, 2);
  assert.ok(out.every((e) => e.kind === 'single'));
});

test('same list but different creators are not grouped', () => {
  const out = groupNotifications([
    listUpdate('a', 'L1', 'C1', 0),
    listUpdate('b', 'L1', 'C2', 1),
  ]);
  assert.equal(out.length, 2);
  assert.ok(out.every((e) => e.kind === 'single'));
});

test('list_update without list_id stays a single entry', () => {
  const out = groupNotifications([
    {
      id: 'x',
      type: 'list_update',
      data: { creator_id: 'C1' },
      read_at: null,
      created_at: t(0),
    },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'single');
});

test('exactly 24h apart does not group (window is exclusive)', () => {
  const out = groupNotifications([
    listUpdate('a', 'L1', 'C1', 0),
    listUpdate('b', 'L1', 'C1', 24 * 60),
  ]);
  assert.equal(out.length, 2);
});

test('interleaved types break grouping continuity', () => {
  const out = groupNotifications([
    listUpdate('a', 'L1', 'C1', 0),
    { id: 'f', type: 'new_follower', data: {}, read_at: null, created_at: t(1) },
    listUpdate('b', 'L1', 'C1', 2),
  ]);
  assert.equal(out.length, 3);
  assert.equal(out[0].kind, 'single');
  assert.equal(out[2].kind, 'single');
});

test('empty and null input yields empty array', () => {
  assert.deepEqual(groupNotifications([]), []);
  assert.deepEqual(groupNotifications(null), []);
});

test('all-read group still groups but unreadCount is zero', () => {
  const out = groupNotifications([
    listUpdate('a', 'L1', 'C1', 0, true),
    listUpdate('b', 'L1', 'C1', 5, true),
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'group');
  assert.equal(out[0].unreadCount, 0);
});

test('new_follower notifications never group even from same actor', () => {
  const out = groupNotifications([
    {
      id: 'x',
      type: 'new_follower',
      data: { actor_id: 'A1' },
      read_at: null,
      created_at: t(0),
    },
    {
      id: 'y',
      type: 'new_follower',
      data: { actor_id: 'A1' },
      read_at: null,
      created_at: t(1),
    },
  ]);
  assert.equal(out.length, 2);
  assert.ok(out.every((e) => e.kind === 'single'));
});
