/**
 * Ingest ↔ curated-restaurant reconciliation.
 *
 * Fixtures mirror the seven curated restaurants seeded into the database, because the
 * whole point of the step is that those seven specific venues stop duplicating.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  haversineMeters,
  matchEditorialEntry,
  EDITORIAL_MATCH_RADIUS_M,
  loadEditorialCatalogSafely,
} from '../reconcile-editorial-catalog.js';

const RAMIRO = {
  name: 'Cervejaria Ramiro',
  slug: 'cervejaria-ramiro',
  location: { lat: 38.7223, lng: -9.1351 },
};
const ALOMA = {
  name: 'Pastelaria Aloma',
  slug: 'pastelaria-aloma',
  location: { lat: 38.7166, lng: -9.1999 },
};
const MOURARIA = {
  name: 'Zé da Mouraria',
  slug: 'ze-da-mouraria',
  location: { lat: 38.7185, lng: -9.1366 },
};
const CATALOG = [RAMIRO, ALOMA, MOURARIA];

/** Metres → degrees latitude, for placing fixtures a known distance apart. */
const metresNorth = (m) => m / 111_320;

test('haversineMeters: same point is zero', () => {
  assert.equal(haversineMeters({ lat: 38.72, lng: -9.13 }, { lat: 38.72, lng: -9.13 }), 0);
});

test('haversineMeters: unusable coordinates are Infinity, not NaN', () => {
  assert.equal(haversineMeters(null, { lat: 1, lng: 1 }), Infinity);
  assert.equal(haversineMeters({ lat: 'x', lng: 1 }, { lat: 1, lng: 1 }), Infinity);
});

test('haversineMeters: ~100m north measures ~100m', () => {
  const d = haversineMeters(
    { lat: 38.7223, lng: -9.1351 },
    { lat: 38.7223 + metresNorth(100), lng: -9.1351 }
  );
  assert.ok(Math.abs(d - 100) < 2, `expected ~100m, got ${d}`);
});

test('exact name at the same coordinates matches with exact confidence', () => {
  const r = matchEditorialEntry(
    { name: 'Cervejaria Ramiro', latitude: 38.7223, longitude: -9.1351 },
    CATALOG
  );
  assert.equal(r.status, 'matched');
  assert.equal(r.slug, 'cervejaria-ramiro');
  assert.equal(r.confidence, 'exact');
  assert.equal(r.distanceMeters, 0);
});

test('venue prefix is not identity — scraped "Ramiro" matches "Cervejaria Ramiro"', () => {
  const r = matchEditorialEntry({ name: 'Ramiro', latitude: 38.7223, longitude: -9.1351 }, CATALOG);
  assert.equal(r.status, 'matched');
  assert.equal(r.slug, 'cervejaria-ramiro');
});

test('accents are not identity — "Ze da Mouraria" matches "Zé da Mouraria"', () => {
  const r = matchEditorialEntry(
    { name: 'Ze da Mouraria', latitude: 38.7185, longitude: -9.1366 },
    CATALOG
  );
  assert.equal(r.status, 'matched');
  assert.equal(r.slug, 'ze-da-mouraria');
});

test('the pastelaria prefix widening actually took effect', () => {
  const r = matchEditorialEntry({ name: 'Aloma', latitude: 38.7166, longitude: -9.1999 }, CATALOG);
  assert.equal(r.status, 'matched');
  assert.equal(r.slug, 'pastelaria-aloma');
});

test('right name, wrong city: no match beyond the radius', () => {
  // A "Cervejaria Ramiro" in Porto must not claim the Lisbon editorial entry.
  const r = matchEditorialEntry(
    { name: 'Cervejaria Ramiro', latitude: 41.1579, longitude: -8.6291 },
    CATALOG
  );
  assert.equal(r.status, 'none');
  assert.equal(r.slug, null);
});

test('same building, different restaurant: name gate blocks the match', () => {
  const r = matchEditorialEntry(
    { name: 'Tasca do Jaime', latitude: 38.7223, longitude: -9.1351 },
    CATALOG
  );
  assert.equal(r.status, 'none');
});

test('two identically-named entries too close to separate are ambiguous, not guessed', () => {
  const twins = [
    { name: 'Manteigaria', slug: 'manteigaria-chiado', location: { lat: 38.7105, lng: -9.1421 } },
    {
      name: 'Manteigaria',
      slug: 'manteigaria-rato',
      location: { lat: 38.7105 + metresNorth(30), lng: -9.1421 },
    },
  ];
  const r = matchEditorialEntry(
    { name: 'Manteigaria', latitude: 38.7105, longitude: -9.1421 },
    twins
  );
  assert.equal(r.status, 'ambiguous');
  assert.equal(r.slug, null);
  assert.deepEqual([...r.candidates].sort(), ['manteigaria-chiado', 'manteigaria-rato']);
});

test('identically-named entries far enough apart resolve to the nearer one', () => {
  const twins = [
    { name: 'Manteigaria', slug: 'manteigaria-chiado', location: { lat: 38.7105, lng: -9.1421 } },
    {
      name: 'Manteigaria',
      slug: 'manteigaria-far',
      location: { lat: 38.7105 + metresNorth(200), lng: -9.1421 },
    },
  ];
  const r = matchEditorialEntry(
    { name: 'Manteigaria', latitude: 38.7105, longitude: -9.1421 },
    twins
  );
  assert.equal(r.status, 'matched');
  assert.equal(r.slug, 'manteigaria-chiado');
});

test('missing coordinates or name yield no match rather than throwing', () => {
  assert.equal(matchEditorialEntry({ name: 'Ramiro' }, CATALOG).status, 'none');
  assert.equal(
    matchEditorialEntry({ name: '', latitude: 38.7223, longitude: -9.1351 }, CATALOG).status,
    'none'
  );
  assert.equal(matchEditorialEntry(null, CATALOG).status, 'none');
});

test('empty or malformed catalogue yields no match rather than throwing', () => {
  assert.equal(matchEditorialEntry({ name: 'X', latitude: 1, longitude: 1 }, []).status, 'none');
  assert.equal(
    matchEditorialEntry({ name: 'X', latitude: 1, longitude: 1 }, [null, {}, { slug: 'a' }]).status,
    'none'
  );
});

test('radius is configurable and enforced at the boundary', () => {
  const place = {
    name: 'Cervejaria Ramiro',
    latitude: 38.7223 + metresNorth(EDITORIAL_MATCH_RADIUS_M + 40),
    longitude: -9.1351,
  };
  assert.equal(matchEditorialEntry(place, CATALOG).status, 'none');
  assert.equal(matchEditorialEntry(place, CATALOG, { radiusMeters: 1000 }).status, 'matched');
});






test('loadEditorialCatalogSafely: a throwing reader degrades to no reconciliation', async () => {
  const errors = [];
  const rows = await loadEditorialCatalogSafely(
    () => {
      throw new Error('ENOENT: content/ not traced into the bundle');
    },
    { error: (msg) => errors.push(msg) }
  );
  assert.deepEqual(rows, []);
  assert.equal(errors.length, 1);
});

test('loadEditorialCatalogSafely: a non-array reader result is normalised', async () => {
  assert.deepEqual(await loadEditorialCatalogSafely(() => null), []);
  assert.deepEqual(await loadEditorialCatalogSafely(() => [RAMIRO]), [RAMIRO]);
});

test('a curated row carries its id through so the caller knows what to merge into', () => {
  const withIds = [{ ...RAMIRO, id: 'aaaaaaaa-0000-4000-8000-000000000001' }];
  const r = matchEditorialEntry(
    { name: 'Cervejaria Ramiro', latitude: 38.7223, longitude: -9.1351 },
    withIds
  );
  assert.equal(r.status, 'matched');
  assert.equal(r.restaurantId, 'aaaaaaaa-0000-4000-8000-000000000001');
});

test('an entry with no id matches but yields no merge target', () => {
  const r = matchEditorialEntry(
    { name: 'Cervejaria Ramiro', latitude: 38.7223, longitude: -9.1351 },
    CATALOG
  );
  assert.equal(r.status, 'matched');
  assert.equal(r.restaurantId, null);
});
