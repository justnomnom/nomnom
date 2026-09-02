/**
 * Google Maps list import: URL allowlist + nested JSON place extraction.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isGoogleMapsUrl,
  MAX_IMPORT_PLACES,
  parsePlacesFromJson,
} from '../actions/google-maps-import-parse.js';

test('isGoogleMapsUrl: accepts Maps share + www.google.com/maps, rejects others', () => {
  assert.equal(isGoogleMapsUrl('https://maps.app.goo.gl/abc'), true);
  assert.equal(isGoogleMapsUrl('http://www.google.com/maps/d/u/0/viewer?mid=x'), true);
  assert.equal(isGoogleMapsUrl('  https://WWW.GOOGLE.COM/maps  '), true);
  assert.equal(isGoogleMapsUrl('https://evil.com/maps.app.goo.gl/x'), false);
  assert.equal(isGoogleMapsUrl('https://google.com.evil/maps'), false);
  assert.equal(isGoogleMapsUrl('not a url'), false);
  assert.equal(isGoogleMapsUrl(''), false);
  assert.equal(isGoogleMapsUrl(null), false);
});

test('parsePlacesFromJson: extracts unique named places with lat/lng', () => {
  const place = [
    null,
    [null, null, '', null, 'Rua Augusta, Lisboa', [null, null, 38.71, -9.14]],
    'Time Out Market',
  ];
  const dup = [
    null,
    [null, null, '', null, 'other', [null, null, 1, 2]],
    'time out market',
  ];
  const json = [place, { skip: true }, [dup]];
  const places = parsePlacesFromJson(json);
  assert.equal(places.length, 1);
  assert.deepEqual(places[0], {
    name: 'Time Out Market',
    address: 'Rua Augusta, Lisboa',
    lat: 38.71,
    lng: -9.14,
  });
});

test('parsePlacesFromJson: ignores malformed nodes and empty input', () => {
  assert.deepEqual(parsePlacesFromJson(null), []);
  assert.deepEqual(parsePlacesFromJson({}), []);
  assert.deepEqual(
    parsePlacesFromJson([[null, [null, null, '', null, 'addr', ['no-coords']], 'Name']]),
    []
  );
  assert.deepEqual(parsePlacesFromJson([[null, [null, null, '', null, 'addr', [null, null, 1, 2]], 'ab']]), []);
});

test('parsePlacesFromJson caps at MAX_IMPORT_PLACES', () => {
  const json = Array.from({ length: MAX_IMPORT_PLACES + 25 }, (_, i) => [
    null,
    [null, null, '', null, 'addr', [null, null, 38, -9]],
    `Place ${i}`,
  ]);
  assert.equal(parsePlacesFromJson(json).length, MAX_IMPORT_PLACES);
});
