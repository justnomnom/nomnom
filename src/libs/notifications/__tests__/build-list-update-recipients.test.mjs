import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildListUpdateRecipients } from '../build-list-update-recipients.js';

test('public list notifies followers and subscribers', () => {
  const out = buildListUpdateRecipients({
    visibility: 'public',
    followerIds: ['f1', 'f2'],
    subscriberIds: ['s1'],
    creatorId: 'c',
    actingUserId: 'c',
  });
  assert.deepEqual(new Set(out), new Set(['f1', 'f2', 's1']));
});

test('public_subscribers list notifies only subscribers', () => {
  const out = buildListUpdateRecipients({
    visibility: 'public_subscribers',
    followerIds: ['f1', 'f2'],
    subscriberIds: ['s1'],
    creatorId: 'c',
    actingUserId: 'c',
  });
  assert.deepEqual(new Set(out), new Set(['s1']));
});

test('private list notifies nobody', () => {
  const out = buildListUpdateRecipients({
    visibility: 'private',
    followerIds: ['f1'],
    subscriberIds: ['s1'],
    creatorId: 'c',
  });
  assert.deepEqual(out, []);
});

test('creator and acting user are always excluded', () => {
  const out = buildListUpdateRecipients({
    visibility: 'public',
    followerIds: ['creator', 'actor', 'f1'],
    subscriberIds: ['actor'],
    creatorId: 'creator',
    actingUserId: 'actor',
  });
  assert.deepEqual(out, ['f1']);
});

test('a user who both follows and subscribes is de-duplicated', () => {
  const out = buildListUpdateRecipients({
    visibility: 'public',
    followerIds: ['u1'],
    subscriberIds: ['u1'],
    creatorId: 'c',
  });
  assert.deepEqual(out, ['u1']);
});

test('unknown visibility yields no recipients', () => {
  const out = buildListUpdateRecipients({
    visibility: 'something_else',
    followerIds: ['f1'],
    subscriberIds: ['s1'],
  });
  assert.deepEqual(out, []);
});

test('empty follower and subscriber iterables yield no recipients for public lists', () => {
  const out = buildListUpdateRecipients({
    visibility: 'public',
    followerIds: [],
    subscriberIds: [],
    creatorId: 'c',
  });
  assert.deepEqual(out, []);
});

test('falsy ids in iterables are ignored', () => {
  const out = buildListUpdateRecipients({
    visibility: 'public',
    followerIds: ['', null, 'f1'],
    subscriberIds: [undefined, 's1'],
    creatorId: 'c',
  });
  assert.deepEqual(new Set(out), new Set(['f1', 's1']));
});

test('only creator excluded when no acting user', () => {
  const out = buildListUpdateRecipients({
    visibility: 'public',
    followerIds: ['creator', 'f1'],
    creatorId: 'creator',
  });
  assert.deepEqual(out, ['f1']);
});

test('acting subscriber on public_subscribers is excluded', () => {
  const out = buildListUpdateRecipients({
    visibility: 'public_subscribers',
    subscriberIds: ['acting-subscriber', 'other-subscriber'],
    creatorId: 'creator',
    actingUserId: 'acting-subscriber',
  });
  assert.deepEqual(out, ['other-subscriber']);
});

test('duplicate ids across follower and subscriber iterables collapse to one', () => {
  const out = buildListUpdateRecipients({
    visibility: 'public',
    followerIds: ['u1', 'u1'],
    subscriberIds: ['u1'],
    creatorId: 'creator',
  });
  assert.deepEqual(out, ['u1']);
});

test('creator and acting user are the same person excluded once', () => {
  const out = buildListUpdateRecipients({
    visibility: 'public',
    followerIds: ['follower'],
    subscriberIds: ['creator'],
    creatorId: 'creator',
    actingUserId: 'creator',
  });
  assert.deepEqual(out, ['follower']);
});

test('subscriber on private list is not notified', () => {
  const out = buildListUpdateRecipients({
    visibility: 'private',
    subscriberIds: ['subscriber'],
    creatorId: 'creator',
    actingUserId: 'creator',
  });
  assert.deepEqual(out, []);
});
