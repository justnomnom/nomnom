/**
 * Frontend QA — Google place price/coords edge cases.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  PRICE_TAG_SLUGS,
  parseCoordinates,
  priceRangeToPriceLevelAndSlug,
} from '../map-google-place-payload.js';

test('PRICE_TAG_SLUGS has 4 tiers', () => {
  assert.equal(PRICE_TAG_SLUGS.length, 4);
  assert.equal(PRICE_TAG_SLUGS[0], 'budget');
  assert.equal(PRICE_TAG_SLUGS[3], 'fine_dining');
});

test('parseCoordinates: accepts numbers and typo longtitude', () => {
  assert.deepEqual(parseCoordinates({ latitude: 38.7, longitude: -9.1 }), {
    lat: 38.7,
    lng: -9.1,
  });
  assert.deepEqual(parseCoordinates({ latitude: '41.1', longtitude: '-8.6' }), {
    lat: 41.1,
    lng: -8.6,
  });
});

test('parseCoordinates: rejects out of range / garbage', () => {
  assert.equal(parseCoordinates(null), null);
  assert.equal(parseCoordinates({ latitude: 91, longitude: 0 }), null);
  assert.equal(parseCoordinates({ latitude: 0, longitude: 181 }), null);
  assert.equal(parseCoordinates({ latitude: 'x', longitude: 'y' }), null);
});

test('priceRangeToPriceLevelAndSlug: symbols and numeric bands', () => {
  assert.deepEqual(priceRangeToPriceLevelAndSlug('$$'), {
    priceLevel: 2,
    priceTagSlug: 'moderate',
  });
  assert.deepEqual(priceRangeToPriceLevelAndSlug('€€€€'), {
    priceLevel: 4,
    priceTagSlug: 'fine_dining',
  });
  assert.deepEqual(priceRangeToPriceLevelAndSlug('$10–20'), {
    priceLevel: 2,
    priceTagSlug: 'moderate',
  });
  assert.deepEqual(priceRangeToPriceLevelAndSlug('€50+'), {
    priceLevel: 4,
    priceTagSlug: 'fine_dining',
  });
  assert.deepEqual(priceRangeToPriceLevelAndSlug(''), {
    priceLevel: null,
    priceTagSlug: null,
  });
  assert.deepEqual(priceRangeToPriceLevelAndSlug(12), {
    priceLevel: null,
    priceTagSlug: null,
  });
});
