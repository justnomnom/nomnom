/**
 * Frontend QA — map/roulette fetch ceilings (pins vs detail list budgets).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LISBOA_ROULETTE_BBOX,
  MAP_VIEW_BBOX,
  MAP_VIEW_DETAIL_MAX,
  MAP_VIEW_FETCH_LIMIT,
  MAP_VIEW_PINS_LIMIT,
  ROULETTE_POOL_FETCH_LIMIT,
  ROULETTE_PREVIEW_BBOX,
} from '../constants.js';

function assertValidBbox(b, label) {
  assert.ok(b.west < b.east, `${label}: west < east`);
  assert.ok(b.south < b.north, `${label}: south < north`);
  assert.ok(b.west >= -180 && b.east <= 180, `${label}: longitude in range`);
  assert.ok(b.south >= -90 && b.north <= 90, `${label}: latitude in range`);
}

test('bboxes are well-formed', () => {
  assertValidBbox(ROULETTE_PREVIEW_BBOX, 'ROULETTE_PREVIEW');
  assertValidBbox(MAP_VIEW_BBOX, 'MAP_VIEW');
  assertValidBbox(LISBOA_ROULETTE_BBOX, 'LISBOA');
});

test('Lisbon bbox sits inside Portugal preview band', () => {
  assert.ok(LISBOA_ROULETTE_BBOX.west >= ROULETTE_PREVIEW_BBOX.west);
  assert.ok(LISBOA_ROULETTE_BBOX.east <= ROULETTE_PREVIEW_BBOX.east);
  assert.ok(LISBOA_ROULETTE_BBOX.south >= ROULETTE_PREVIEW_BBOX.south);
  assert.ok(LISBOA_ROULETTE_BBOX.north <= ROULETTE_PREVIEW_BBOX.north);
});

test('fetch limits: detail page < detail max ≤ pins/pool', () => {
  assert.equal(MAP_VIEW_FETCH_LIMIT, 80);
  assert.equal(MAP_VIEW_DETAIL_MAX, 500);
  assert.equal(MAP_VIEW_PINS_LIMIT, 5000);
  assert.equal(ROULETTE_POOL_FETCH_LIMIT, 5000);
  assert.ok(MAP_VIEW_FETCH_LIMIT < MAP_VIEW_DETAIL_MAX);
  assert.ok(MAP_VIEW_DETAIL_MAX <= MAP_VIEW_PINS_LIMIT);
});
