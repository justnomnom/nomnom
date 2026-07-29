/**
 * Frontend QA — list membership map + recipient builder edges.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { groupListItemsByRestaurant } from '../group-list-items-by-restaurant.js';
import { buildListUpdateRecipients } from '../../notifications/build-list-update-recipients.js';

test('groupListItemsByRestaurant: skips missing ids and dedupes list ids', () => {
  const map = groupListItemsByRestaurant([
    { restaurant_id: 'r1', list_id: 'L1' },
    { restaurant_id: 'r1', list_id: 'L1' },
    { restaurant_id: 'r1', list_id: 'L2' },
    { restaurant_id: null, list_id: 'L3' },
    { restaurant_id: 'r2', list_id: '' },
  ]);
  assert.deepEqual(map.r1, ['L1', 'L2']);
  assert.equal(map.r2, undefined);
});

test('groupListItemsByRestaurant: null → {}', () => {
  assert.deepEqual(groupListItemsByRestaurant(null), {});
});

test('buildListUpdateRecipients: unknown visibility → nobody', () => {
  assert.deepEqual(
    buildListUpdateRecipients({
      visibility: 'secret',
      followerIds: ['f1'],
      subscriberIds: ['s1'],
    }),
    []
  );
});

test('buildListUpdateRecipients: excludes creator and actor; stringifies ids', () => {
  const out = buildListUpdateRecipients({
    visibility: 'public',
    followerIds: [1, 'f2', '', null],
    subscriberIds: ['s1', 'f2'],
    creatorId: 1,
    actingUserId: 's1',
  });
  assert.deepEqual(new Set(out), new Set(['f2']));
});
