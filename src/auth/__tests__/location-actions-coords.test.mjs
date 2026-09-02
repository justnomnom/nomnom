/**
 * Map/geo server actions: WGS84 validation before the locality RPC.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  resolveLocalityFromCoordinates,
  fetchMapSpotDetailById,
  searchRestaurantsByName,
  fetchRestaurantsForHomeLocality,
} from '../actions/location-actions.js';

test('resolveLocalityFromCoordinates: rejects non-finite and out-of-range coords', async () => {
  assert.deepEqual(await resolveLocalityFromCoordinates('x', 38), {
    location: null,
    error: 'invalid_coordinates',
  });
  assert.deepEqual(await resolveLocalityFromCoordinates(NaN, 38), {
    location: null,
    error: 'invalid_coordinates',
  });
  assert.deepEqual(await resolveLocalityFromCoordinates(-9, 91), {
    location: null,
    error: 'invalid_coordinates',
  });
  assert.deepEqual(await resolveLocalityFromCoordinates(-181, 38), {
    location: null,
    error: 'invalid_coordinates',
  });
});

test('fetchMapSpotDetailById: blank / non-uuid → invalid_id', async () => {
  assert.deepEqual(await fetchMapSpotDetailById(''), { row: null, error: 'invalid_id' });
  assert.deepEqual(await fetchMapSpotDetailById('abc'), { row: null, error: 'invalid_id' });
});

test('searchRestaurantsByName: blank query skips the RPC', async () => {
  assert.deepEqual(await searchRestaurantsByName(''), { restaurants: [] });
  assert.deepEqual(await searchRestaurantsByName('   '), { restaurants: [] });
  assert.deepEqual(await searchRestaurantsByName(null), { restaurants: [] });
});

test('fetchRestaurantsForHomeLocality: missing locality skips the RPC', async () => {
  assert.deepEqual(await fetchRestaurantsForHomeLocality(null), {
    restaurants: [],
    error: 'missing_home_locality',
  });
  assert.deepEqual(await fetchRestaurantsForHomeLocality(''), {
    restaurants: [],
    error: 'missing_home_locality',
  });
});
