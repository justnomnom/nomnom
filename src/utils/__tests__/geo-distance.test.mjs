import { test } from 'node:test';
import assert from 'node:assert/strict';
import { haversineKm } from '../geo-distance.js';

test('haversineKm: zero distance for identical points', () => {
  assert.equal(haversineKm(38.7223, -9.1393, 38.7223, -9.1393), 0);
});

test('haversineKm: Lisbon → Porto is roughly 275 km', () => {
  const km = haversineKm(38.7223, -9.1393, 41.1579, -8.6291);
  assert.ok(km > 270 && km < 285, `expected ~275 km, got ${km}`);
});

test('haversineKm: symmetric', () => {
  const a = haversineKm(38.7, -9.1, 41.1, -8.6);
  const b = haversineKm(41.1, -8.6, 38.7, -9.1);
  assert.ok(Math.abs(a - b) < 1e-9);
});

test('haversineKm: missing/non-finite coordinates return Infinity', () => {
  assert.equal(haversineKm(38.7, -9.1, NaN, -8.6), Infinity);
  assert.equal(haversineKm(38.7, -9.1, undefined, -8.6), Infinity);
  assert.equal(haversineKm(38.7, -9.1, 41.1, null), Infinity);
});

test('haversineKm: closer point yields smaller distance (sort ordering)', () => {
  const ref = [38.7223, -9.1393]; // Lisbon
  const near = haversineKm(ref[0], ref[1], 38.73, -9.15); // ~2 km
  const far = haversineKm(ref[0], ref[1], 41.1579, -8.6291); // Porto
  assert.ok(near < far);
});
