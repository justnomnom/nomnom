/**
 * Frontend QA — distance sort sinks missing coords; digest first-wins name.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { sortListItemsByMode } from '../sort-list-items.js';
import { groupListUpdatesByUserForDigest } from '../../notifications/group-list-update-digest.js';
import { normalizeNotificationRecipientIds } from '../../notifications/create-notification.js';

test('sortListItemsByMode distance: null restaurants / bad coords sink to end', () => {
  const items = [
    { id: 'far', restaurants: { latitude: 41.15, longitude: -8.62 } },
    { id: 'none', restaurants: null },
    { id: 'near', restaurants: { latitude: 38.73, longitude: -9.14 } },
    { id: 'bad', restaurants: { latitude: 'x', longitude: -9 } },
  ];
  const out = sortListItemsByMode(items, 'distance', { lat: 38.72, lng: -9.14 });
  assert.equal(out[0].id, 'near');
  assert.equal(out[1].id, 'far');
  assert.ok(['none', 'bad'].includes(out[2].id));
  assert.ok(['none', 'bad'].includes(out[3].id));
});

test('sortListItemsByMode distance: missing geoRef falls back to relevance order', () => {
  const items = [{ id: 'a' }, { id: 'b' }];
  assert.deepEqual(
    sortListItemsByMode(items, 'distance', null).map((x) => x.id),
    ['a', 'b']
  );
});

test('groupListUpdatesByUserForDigest: null input + first-wins listName', () => {
  assert.equal(groupListUpdatesByUserForDigest(null).size, 0);
  const map = groupListUpdatesByUserForDigest([
    { user_id: 'u1', data: { list_id: 'L1', list_name: 'First' } },
    { user_id: 'u1', data: { list_id: 'L1', list_name: 'Second' } },
    { user_id: 'u1', data: { list_id: 'L2' } },
  ]);
  assert.equal(map.get('u1').get('L1').listName, 'First');
  assert.equal(map.get('u1').get('L1').count, 2);
  assert.equal(map.get('u1').get('L2').listName, 'a list');
});

test('normalizeNotificationRecipientIds: drops whitespace-only ids', () => {
  assert.deepEqual(normalizeNotificationRecipientIds(['a', ' ', '\t', 'b']), ['a', 'b']);
});
