import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFollowingListOwnersMap } from '../following-list-owners.js';

test('matches RPC profile rows when list ids need string normalization', () => {
  const result = buildFollowingListOwnersMap(
    [{ restaurant_id: 123, list_id: 456 }],
    [{ id: '456', user_id: 'user-456' }],
    [{ id: 'user-456', display_name: 'Mina', username: 'mina', avatar_url: 'https://img.example.com/a.jpg' }]
  );

  assert.deepEqual(result, {
    123: [
      {
        userId: 'user-456',
        displayName: 'Mina',
        username: 'mina',
        avatarUrl: 'https://img.example.com/a.jpg',
      },
    ],
  });
});

test('deduplicates the same owner per restaurant across multiple lists', () => {
  const result = buildFollowingListOwnersMap(
    [
      { restaurant_id: 'restaurant-a', list_id: 'list-a' },
      { restaurant_id: 'restaurant-a', list_id: 'list-b' },
    ],
    [
      { id: 'list-a', user_id: 'user-1' },
      { id: 'list-b', user_id: 'user-1' },
    ],
    [{ id: 'user-1', display_name: 'Ari', username: 'ari', avatar_url: null }]
  );

  assert.deepEqual(result['restaurant-a'], [
    {
      userId: 'user-1',
      displayName: 'Ari',
      username: 'ari',
      avatarUrl: null,
    },
  ]);
});

test('keeps owners with missing profile rows but nulls public fields', () => {
  const result = buildFollowingListOwnersMap(
    [{ restaurant_id: 'restaurant-a', list_id: 'list-a' }],
    [{ id: 'list-a', user_id: 'user-without-profile' }],
    []
  );

  assert.deepEqual(result, {
    'restaurant-a': [
      {
        userId: 'user-without-profile',
        displayName: null,
        username: null,
        avatarUrl: null,
      },
    ],
  });
});

test('skips list items whose list ownership row is unavailable', () => {
  const result = buildFollowingListOwnersMap(
    [{ restaurant_id: 'restaurant-a', list_id: 'unknown-list' }],
    [{ id: 'list-a', user_id: 'user-1' }],
    [{ id: 'user-1', display_name: 'Ari', username: 'ari', avatar_url: null }]
  );

  assert.deepEqual(result, {});
});
