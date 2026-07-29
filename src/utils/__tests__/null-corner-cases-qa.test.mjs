/**
 * Frontend QA — null / undefined / non-array corner cases (must never throw).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { filterE2eTestListsForDisplay } from '../filter-e2e-test-lists.js';
import { paramCase, snakeCase } from '../change-case.js';
import { flattenArray } from '../flatten-array.js';
import { fCurrency, fNumber, fPercent, fShortenNumber } from '../format-number.js';
import { dedupeMustTryDishesByDisplayLabel } from '../../lib/must-try-dedupe.js';
import { mapListItemRowsToIds } from '../../libs/stripe/map-list-item-rows-to-ids.js';
import { groupListItemsByRestaurant } from '../../libs/lists/group-list-items-by-restaurant.js';
import { buildListItemRows } from '../../libs/lists/build-list-item-rows.js';
import { sortListItemsByMode } from '../../libs/lists/sort-list-items.js';
import { groupNotifications } from '../../libs/notifications/group-notifications.js';
import { groupListUpdatesByUserForDigest } from '../../libs/notifications/group-list-update-digest.js';
import {
  filterMutedRecipients,
  splitRecipientsByListUpdatePreferences,
} from '../../libs/notifications/filter-notification-recipients.js';
import { buildFollowingListOwnersMap } from '../../libs/restaurant/following-list-owners.js';
import { chunkArray } from '../../libs/notifications/chunk.js';

const nonArrays = [null, undefined, 0, false, {}, NaN, Infinity];
const garbage = [...nonArrays, '', 'not-array'];

test('paramCase / snakeCase: nullish + non-string → empty (no throw)', () => {
  for (const v of nonArrays) {
    assert.equal(paramCase(v), '');
    assert.equal(snakeCase(v), '');
  }
  assert.equal(paramCase(''), '');
  assert.equal(paramCase('Hello'), 'hello');
});

test('flattenArray: non-array → []', () => {
  for (const v of garbage) {
    assert.deepEqual(flattenArray(v), []);
  }
});

test('dedupe / map ids / group list items: non-array → empty', () => {
  for (const v of garbage) {
    assert.deepEqual(dedupeMustTryDishesByDisplayLabel(v), []);
    assert.deepEqual(mapListItemRowsToIds(v), []);
    assert.deepEqual(groupListItemsByRestaurant(v), {});
  }
});

test('buildListItemRows: non-array restaurantIds → []', () => {
  assert.deepEqual(buildListItemRows({ listId: 'L', restaurantIds: null, addedBy: 'u' }), []);
  assert.deepEqual(buildListItemRows({ listId: 'L', restaurantIds: {}, addedBy: 'u' }), []);
});

test('sortListItemsByMode: non-array items → []', () => {
  assert.deepEqual(sortListItemsByMode(null, 'recent'), []);
  assert.deepEqual(sortListItemsByMode({}, 'distance', { lat: 0, lng: 0 }), []);
});

test('groupNotifications / digest: non-array → empty', () => {
  assert.deepEqual(groupNotifications(null), []);
  assert.deepEqual(groupNotifications({}), []);
  assert.equal(groupListUpdatesByUserForDigest(false).size, 0);
});

test('filterMuted / prefs split: non-array safe', () => {
  assert.deepEqual(filterMutedRecipients(null, null, { listId: 'L', creatorId: 'C' }), []);
  assert.deepEqual(splitRecipientsByListUpdatePreferences(null, null), {
    inAppRecipients: [],
    pushRecipients: [],
  });
});

test('buildFollowingListOwnersMap: non-arrays → {}', () => {
  assert.deepEqual(buildFollowingListOwnersMap(null, null, null), {});
  assert.deepEqual(buildFollowingListOwnersMap({}, {}, {}), {});
});

test('chunkArray: already null-safe', () => {
  assert.deepEqual(chunkArray(null, 2), []);
  assert.deepEqual(chunkArray({}, 2), []);
});

test('fNumber family: objects / NaN → empty (never "NaN" string)', () => {
  assert.equal(fNumber({}), '');
  assert.equal(fNumber(NaN), '');
  assert.equal(fCurrency('nope'), '');
  assert.equal(fPercent({}), '');
  assert.equal(fShortenNumber(Infinity), '');
});

test('mapListItemRowsToIds: null row entries skipped', () => {
  assert.deepEqual(mapListItemRowsToIds([{ id: 'a' }, null, { id: '' }, { id: 'b' }]), [
    'a',
    'b',
  ]);
});

test('filterE2eTestListsForDisplay: non-array → []', () => {
  assert.deepEqual(filterE2eTestListsForDisplay(null), []);
  assert.deepEqual(filterE2eTestListsForDisplay(undefined), []);
  assert.deepEqual(filterE2eTestListsForDisplay({}), []);
});
