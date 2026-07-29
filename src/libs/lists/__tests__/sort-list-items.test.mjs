import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isPlacesView, sortListItemsByMode } from '../sort-list-items.js';

test('isPlacesView accepts list and map only', () => {
  assert.equal(isPlacesView('list'), true);
  assert.equal(isPlacesView('map'), true);
  assert.equal(isPlacesView('grid'), false);
  assert.equal(isPlacesView(null), false);
  assert.equal(isPlacesView(undefined), false);
  assert.equal(isPlacesView(''), false);
});

test('sortListItemsByMode: relevance preserves server order', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const out = sortListItemsByMode(items, 'relevance');
  assert.deepEqual(out.map((x) => x.id), ['a', 'b', 'c']);
});

test('sortListItemsByMode: single or empty arrays unchanged', () => {
  const one = [{ id: 'solo' }];
  assert.deepEqual(sortListItemsByMode(one, 'recent'), one);
  assert.deepEqual(sortListItemsByMode([], 'distance', { lat: 0, lng: 0 }), []);
});

test('sortListItemsByMode: recent orders newest created_at first (stable)', () => {
  const items = [
    { id: 'old', created_at: '2024-01-01T00:00:00.000Z' },
    { id: 'new', created_at: '2025-06-01T00:00:00.000Z' },
    { id: 'mid', created_at: '2024-06-01T00:00:00.000Z' },
  ];
  const out = sortListItemsByMode(items, 'recent');
  assert.deepEqual(out.map((x) => x.id), ['new', 'mid', 'old']);
});

test('sortListItemsByMode: recent ties preserve original order', () => {
  const ts = '2024-01-01T00:00:00.000Z';
  const items = [
    { id: 'first', created_at: ts },
    { id: 'second', created_at: ts },
    { id: 'third', created_at: ts },
  ];
  const out = sortListItemsByMode(items, 'recent');
  assert.deepEqual(out.map((x) => x.id), ['first', 'second', 'third']);
});

test('sortListItemsByMode: recent rows without timestamp sink to end', () => {
  const items = [
    { id: 'no-ts' },
    { id: 'dated', created_at: '2024-01-01T00:00:00.000Z' },
    { id: 'invalid-ts', created_at: 'not-a-date' },
  ];
  const out = sortListItemsByMode(items, 'recent');
  assert.equal(out[0].id, 'dated');
  assert.ok(out.slice(1).some((x) => x.id === 'no-ts'));
  assert.ok(out.slice(1).some((x) => x.id === 'invalid-ts'));
});

test('sortListItemsByMode: distance without geoRef keeps order', () => {
  const items = [
    { id: 'far', restaurants: { latitude: 41.1, longitude: -8.6 } },
    { id: 'near', restaurants: { latitude: 38.73, longitude: -9.15 } },
  ];
  const out = sortListItemsByMode(items, 'distance');
  assert.deepEqual(out.map((x) => x.id), ['far', 'near']);
});

test('sortListItemsByMode: distance orders by haversine from viewer (Lisbon ref)', () => {
  const ref = { lat: 38.7223, lng: -9.1393 };
  const items = [
    { id: 'porto', restaurants: { latitude: 41.1579, longitude: -8.6291 } },
    { id: 'nearby', restaurants: { latitude: 38.73, longitude: -9.15 } },
    { id: 'no-coords', restaurants: {} },
  ];
  const out = sortListItemsByMode(items, 'distance', ref);
  assert.equal(out[0].id, 'nearby');
  assert.equal(out[out.length - 1].id, 'no-coords');
});

test('sortListItemsByMode: distance ties preserve original order', () => {
  const ref = { lat: 38.7223, lng: -9.1393 };
  const items = [
    { id: 'a', restaurants: { latitude: 38.7223, longitude: -9.1393 } },
    { id: 'b', restaurants: { latitude: 38.7223, longitude: -9.1393 } },
  ];
  const out = sortListItemsByMode(items, 'distance', ref);
  assert.deepEqual(out.map((x) => x.id), ['a', 'b']);
});

test('sortListItemsByMode: null/undefined items → empty array', () => {
  assert.deepEqual(sortListItemsByMode(null, 'recent'), []);
  assert.deepEqual(sortListItemsByMode(undefined, 'relevance'), []);
});

test('sortListItemsByMode: unknown mode returns original order', () => {
  const items = [{ id: 'a' }, { id: 'b' }];
  assert.deepEqual(
    sortListItemsByMode(items, 'popularity').map((x) => x.id),
    ['a', 'b']
  );
});
