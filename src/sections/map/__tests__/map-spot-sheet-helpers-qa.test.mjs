/**
 * Frontend QA — extra map sheet edge cases (tel, maps URL, tags without catalog hit).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  mapGalleryUrlsFromRow,
  mapPlaceFromListRestaurant,
  mapPlaceMapsUrl,
  mapPlaceNumericRating,
  mapPlaceTagLabelsCapped,
  mapPlaceTelHref,
  normalizeMapSheetPlaces,
  prepareMapSheetPlaces,
  sortMapSheetPlacesByRecency,
} from '../map-spot-sheet-helpers.js';

const t = (key) => key;

test('mapPlaceTelHref: null row / empty phone', () => {
  assert.equal(mapPlaceTelHref(null), null);
  assert.equal(mapPlaceTelHref({ phone: '   ' }), null);
  assert.equal(mapPlaceTelHref({ metadata: {} }), null);
});

test('mapPlaceTelHref: local numbers without + keep digits only', () => {
  const out = mapPlaceTelHref({ phone: '(211) 234-5678' });
  assert.equal(out.href, 'tel:2112345678');
});

test('mapPlaceMapsUrl: null when no name/address/coords', () => {
  assert.equal(mapPlaceMapsUrl({}), null);
  assert.equal(mapPlaceMapsUrl({ latitude: NaN, longitude: 1 }), null);
});

test('mapPlaceMapsUrl: metadata.maps_link and metadata.url', () => {
  assert.equal(
    mapPlaceMapsUrl({ metadata: { maps_link: ' https://m.example ' } }),
    'https://m.example'
  );
  assert.equal(mapPlaceMapsUrl({ metadata: { url: 'https://u.example' } }), 'https://u.example');
});

test('mapPlaceNumericRating: rejects non-finite', () => {
  assert.equal(mapPlaceNumericRating({ rating: NaN, metadata: { rating: Infinity } }), null);
  assert.equal(mapPlaceNumericRating({ rating: '4' }), null);
});

test('mapPlaceTagLabelsCapped: drops null/object slugs (no "null" chip)', () => {
  const labels = mapPlaceTagLabelsCapped(
    { metadata: { tag_slugs: [null, undefined, {}, 'pizza', '  '] } },
    t,
    [{ slug: 'pizza', label: 'Pizza', category: 'cuisine' }],
    { tagCatalogLoaded: true }
  );
  assert.deepEqual(labels, ['Pizza']);
});

test('mapGalleryUrlsFromRow: empty / non-object', () => {
  assert.deepEqual(mapGalleryUrlsFromRow(null), []);
  assert.deepEqual(mapGalleryUrlsFromRow('x'), []);
});

test('mapPlaceFromListRestaurant: metadata address when row address empty', () => {
  const out = mapPlaceFromListRestaurant({
    id: 1,
    name: 'A',
    address: '  ',
    metadata: { formatted_address: ' Fmt Addr ' },
  });
  assert.equal(out.address, 'Fmt Addr');
  assert.equal(out.id, '1');
});

test('normalizeMapSheetPlaces: non-array → []', () => {
  assert.deepEqual(normalizeMapSheetPlaces(null), []);
  assert.deepEqual(normalizeMapSheetPlaces({}), []);
});

test('prepareMapSheetPlaces: sponsored survives normalize', () => {
  const out = prepareMapSheetPlaces([
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B', is_sponsored: true },
  ]);
  assert.equal(out[0].id, 'b');
});

test('sortMapSheetPlacesByRecency: short arrays unchanged reference-ish length', () => {
  assert.deepEqual(sortMapSheetPlacesByRecency(null), []);
  assert.equal(sortMapSheetPlacesByRecency([{ id: 'solo' }])[0].id, 'solo');
});

test('sortMapSheetPlacesByRecency: only is_sponsored === true counts as sponsored', () => {
  const out = sortMapSheetPlacesByRecency([
    { id: 'truthy', is_sponsored: 1, added_at: '2025-01-01' },
    { id: 'real', is_sponsored: true, added_at: '2024-01-01' },
    { id: 'string', is_sponsored: 'true', added_at: '2025-06-01' },
  ]);
  assert.equal(out[0].id, 'real');
});
