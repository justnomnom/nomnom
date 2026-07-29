/**
 * Frontend QA — map sheet restaurant builder + spot id equality.
 * These drive the pin sheet UI; regressions show as wrong address/tags/phone.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildSheetRestaurantFromMapPlace,
  spotIdEq,
} from '../map-sheet-restaurant-builders.js';

test('spotIdEq: nullish never equal', () => {
  assert.equal(spotIdEq(null, null), false);
  assert.equal(spotIdEq(undefined, 'a'), false);
  assert.equal(spotIdEq('a', null), false);
});

test('spotIdEq: coerces to string (uuid vs same string)', () => {
  assert.equal(spotIdEq('abc', 'abc'), true);
  assert.equal(spotIdEq(123, '123'), true);
  assert.equal(spotIdEq('abc', 'ABC'), false);
});

test('buildSheetRestaurantFromMapPlace: null selected → null', () => {
  assert.equal(buildSheetRestaurantFromMapPlace(null, []), null);
  assert.equal(buildSheetRestaurantFromMapPlace(undefined, []), null);
});

test('buildSheetRestaurantFromMapPlace: prefers row address over metadata', () => {
  const out = buildSheetRestaurantFromMapPlace(
    {
      id: 'r1',
      name: 'Cafe',
      address: ' Row ',
      metadata: { address: 'Meta', tag_slugs: ['pizza'] },
      phone: ' 911 ',
      latitude: '38.7',
      longitude: -9.1,
    },
    [{ slug: 'pizza', label: 'Pizza', category: 'cuisine', sort_order: 1, id: 't1' }]
  );
  assert.equal(out.address, 'Row');
  assert.equal(out.phone, '911');
  assert.equal(out.latitude, 38.7);
  assert.equal(out.longitude, -9.1);
  assert.equal(out.tags[0].slug, 'pizza');
});

test('buildSheetRestaurantFromMapPlace: catalog loading → __loading placeholders', () => {
  const out = buildSheetRestaurantFromMapPlace(
    { id: 'r1', name: 'X', metadata: { tag_slugs: ['unknown-slug'] } },
    [],
    { tagCatalogLoaded: false }
  );
  assert.equal(out.tags.length, 1);
  assert.equal(out.tags[0].__loading, true);
  assert.equal(out.tags[0].label, '');
});

test('buildSheetRestaurantFromMapPlace: unloaded catalog false; loaded slug-prettifies', () => {
  const out = buildSheetRestaurantFromMapPlace(
    { id: 'r1', name: 'X', metadata: { tag_slugs: ['fine-dining'] } },
    [],
    { tagCatalogLoaded: true }
  );
  assert.equal(out.tags[0].label, 'Fine Dining');
  assert.equal(out.tags[0].__loading, undefined);
});

test('buildSheetRestaurantFromMapPlace: phone from metadata formatted_phone_number', () => {
  const out = buildSheetRestaurantFromMapPlace(
    {
      id: 'r1',
      name: 'X',
      metadata: { formatted_phone_number: '+351 211 000 000' },
    },
    []
  );
  assert.equal(out.phone, '+351 211 000 000');
});

test('buildSheetRestaurantFromMapPlace: invalid coords → null lat/lng', () => {
  const out = buildSheetRestaurantFromMapPlace(
    { id: 'r1', name: 'X', latitude: 'nope', longitude: undefined },
    []
  );
  assert.equal(out.latitude, null);
  assert.equal(out.longitude, null);
});

test('buildSheetRestaurantFromMapPlace: blanks in tag_slugs dropped', () => {
  const out = buildSheetRestaurantFromMapPlace(
    { id: 'r1', name: 'X', metadata: { tag_slugs: ['  ', 'pizza', null] } },
    [{ slug: 'pizza', label: 'Pizza', category: 'cuisine', id: '1' }]
  );
  assert.equal(out.tags.length, 1);
});
