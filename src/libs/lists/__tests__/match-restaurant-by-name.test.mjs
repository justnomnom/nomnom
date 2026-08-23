/**
 * Run: node --test src/libs/lists/__tests__/match-restaurant-by-name.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nameMatchScore, matchRestaurantByName } from '../pick-restaurant-match.js';

test('nameMatchScore is exported: 3 exact, 2 containment, 0 miss', () => {
  assert.equal(nameMatchScore('Pérola Dourada', 'Perola Dourada'), 3);
  assert.equal(nameMatchScore('Tati', 'Tati Restaurante'), 2);
  assert.equal(nameMatchScore('Alpha', 'Zeta'), 0);
});

test('matched: exactly one score-3 auto-accepts', () => {
  const result = matchRestaurantByName({
    name: 'Cervejaria Ramiro',
    candidates: [
      { id: 'a', name: 'Cervejaria Ramiro', address: 'Av. Almirante Reis', city: 'Lisboa' },
      { id: 'b', name: 'Solar da Madalena', address: '', city: 'Lisboa' },
    ],
  });
  assert.equal(result.status, 'matched');
  assert.equal(result.restaurant_id, 'a');
  assert.equal(result.decision, 'accept');
  assert.deepEqual(result.candidates, []);
});

test('ambiguous: score-2 is never auto-accepted', () => {
  const result = matchRestaurantByName({
    name: 'Tati',
    candidates: [{ id: 'a', name: 'Tati Restaurante', city: 'Lisboa' }],
  });
  assert.equal(result.status, 'ambiguous');
  assert.equal(result.decision, null);
  assert.equal(result.restaurant_id, null);
  assert.equal(result.candidates[0].id, 'a');
});

test('ambiguous: two exact names', () => {
  const result = matchRestaurantByName({
    name: 'O Trevo',
    candidates: [
      { id: '1', name: 'O Trevo', city: 'Lisboa' },
      { id: '2', name: 'Restaurante O Trevo', city: 'Porto' },
    ],
  });
  assert.equal(result.status, 'ambiguous');
  assert.equal(result.candidates.length, 2);
});

test('not_found: no score ≥2', () => {
  const result = matchRestaurantByName({
    name: 'Place Not In Db',
    candidates: [{ id: '1', name: 'Maria Azeitona' }],
  });
  assert.equal(result.status, 'not_found');
  assert.equal(result.decision, 'drop');
  assert.equal(result.restaurant_id, null);
});

test('empty candidates is not_found', () => {
  assert.equal(matchRestaurantByName({ name: 'X', candidates: [] }).status, 'not_found');
  assert.equal(matchRestaurantByName({ name: 'X' }).status, 'not_found');
});
