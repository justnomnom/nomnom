/**
 * Run: node --test src/libs/lists/__tests__/pick-restaurant-match.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeName, pickRestaurantMatch } from '../pick-restaurant-match.js';

test('normalizeName strips accents, punctuation, and venue prefixes', () => {
  assert.equal(normalizeName('Restaurante  O Trevo'), 'o trevo');
  assert.equal(normalizeName('Estrela d’Ouro'), 'estrela d ouro');
  assert.equal(normalizeName('Cervejaria Bogotá'), 'bogota');
  assert.equal(normalizeName('Pérola Dourada'), 'perola dourada');
  assert.equal(normalizeName(null), '');
});

test('exact name match wins', () => {
  const candidates = [
    { id: 'r1', name: 'O Trevo', latitude: 38.711, longitude: -9.143 },
    { id: 'r2', name: 'Solar da Madalena', latitude: 38.7111, longitude: -9.1431 },
  ];
  const match = pickRestaurantMatch({ name: 'Restaurante O Trevo', lat: 38.711, lng: -9.143 }, candidates);
  assert.equal(match?.id, 'r1');
});

test('containment match handles venue-prefix and extra words', () => {
  const candidates = [{ id: 'r1', name: 'Tati Restaurante', latitude: 0, longitude: 0 }];
  assert.equal(pickRestaurantMatch({ name: 'Tati', lat: 0, lng: 0 }, candidates)?.id, 'r1');
});

test('distinct neighbours in the same box are NOT collapsed', () => {
  // Regression: two different restaurants ~80m apart, neither matching the
  // place name. Old logic returned nearby[0]; correct behaviour is no match.
  const candidates = [
    { id: 'r1', name: 'Maria Azeitona', latitude: 38.7584, longitude: -9.2354 },
    { id: 'r2', name: 'Cervejaria Bogotá', latitude: 38.7585, longitude: -9.2355 },
  ];
  const match = pickRestaurantMatch(
    { name: 'Some Place Not In Our DB', lat: 38.7584, lng: -9.2354 },
    candidates
  );
  assert.equal(match, null);
});

test('among equal-score matches, the nearest wins', () => {
  const candidates = [
    { id: 'far', name: 'O Forno', latitude: 38.72, longitude: -9.15 },
    { id: 'near', name: 'O Forno', latitude: 38.711, longitude: -9.143 },
  ];
  const match = pickRestaurantMatch({ name: 'O Forno', lat: 38.711, lng: -9.143 }, candidates);
  assert.equal(match?.id, 'near');
});

test('empty / nullish candidates yield null', () => {
  assert.equal(pickRestaurantMatch({ name: 'X', lat: 0, lng: 0 }, []), null);
  assert.equal(pickRestaurantMatch({ name: 'X' }, null), null);
  assert.equal(pickRestaurantMatch(null, [{ id: 'r1', name: 'X' }]), null);
});
