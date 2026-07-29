/**
 * Frontend QA — following list owners map (map sheet "who saved this").
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildFollowingListOwnersMap } from '../following-list-owners.js';

test('buildFollowingListOwnersMap: empty inputs → {}', () => {
  assert.deepEqual(buildFollowingListOwnersMap(null, null, null), {});
  assert.deepEqual(buildFollowingListOwnersMap([], [], []), {});
});

test('buildFollowingListOwnersMap: joins items → list → user once per restaurant', () => {
  const out = buildFollowingListOwnersMap(
    [
      { restaurant_id: 'r1', list_id: 'L1' },
      { restaurant_id: 'r1', list_id: 'L2' },
      { restaurant_id: 'r1', list_id: 'L1' }, // dupe list
      { restaurant_id: 'r2', list_id: 'L1' },
    ],
    [
      { id: 'L1', user_id: 'u1' },
      { id: 'L2', user_id: 'u2' },
    ],
    [
      { id: 'u1', display_name: 'Ana', username: 'ana', avatar_url: 'https://a' },
      { id: 'u2', display_name: null, username: 'bob', avatar_url: null },
    ]
  );
  assert.equal(out.r1.length, 2);
  assert.equal(out.r1[0].userId, 'u1');
  assert.equal(out.r1[0].displayName, 'Ana');
  assert.equal(out.r1[1].username, 'bob');
  assert.equal(out.r2.length, 1);
});

test('buildFollowingListOwnersMap: skips unknown list / missing owner', () => {
  const out = buildFollowingListOwnersMap(
    [{ restaurant_id: 'r1', list_id: 'missing' }],
    [{ id: 'L1', user_id: 'u1' }],
    [{ id: 'u1', display_name: 'Ana' }]
  );
  assert.deepEqual(out, {});
});
