import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeName, pickRestaurantMatch } from '../pick-restaurant-match.js';

test('normalizeName: strips accents, punctuation, venue prefixes', () => {
  assert.equal(normalizeName('Restaurante O Trevo'), 'o trevo');
  assert.equal(normalizeName('Café Lisboa!'), 'lisboa');
  assert.equal(normalizeName(null), '');
  assert.equal(normalizeName(12), '');
});

test('pickRestaurantMatch: null when no candidates / no name match', () => {
  assert.equal(pickRestaurantMatch(null, []), null);
  assert.equal(pickRestaurantMatch({ name: 'A' }, null), null);
  assert.equal(
    pickRestaurantMatch({ name: 'Alpha' }, [{ id: '1', name: 'Zeta' }]),
    null
  );
});

test('pickRestaurantMatch: exact name wins over containment', () => {
  const place = { name: 'O Trevo', lat: 0, lng: 0 };
  const exact = { id: 'exact', name: 'Restaurante O Trevo', latitude: 1, longitude: 1 };
  const contain = { id: 'contain', name: 'O Trevo Bar', latitude: 0, longitude: 0 };
  assert.equal(pickRestaurantMatch(place, [contain, exact]).id, 'exact');
});

test('pickRestaurantMatch: same score ties by distance', () => {
  const place = { name: 'Nom Spot', lat: 0, lng: 0 };
  const far = { id: 'far', name: 'Nom Spot', latitude: 1, longitude: 1 };
  const near = { id: 'near', name: 'Nom Spot', latitude: 0.1, longitude: 0.1 };
  assert.equal(pickRestaurantMatch(place, [far, near]).id, 'near');
});

test('pickRestaurantMatch: containment requires ≥3 chars', () => {
  assert.equal(
    pickRestaurantMatch({ name: 'ab' }, [{ id: '1', name: 'abc restaurant' }]),
    null
  );
  assert.equal(
    pickRestaurantMatch({ name: 'abc' }, [{ id: '1', name: 'abc restaurant' }])?.id,
    '1'
  );
});
