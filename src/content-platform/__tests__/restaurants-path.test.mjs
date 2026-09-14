/**
 * Country restaurant list URLs: pagination, tags, and [[...parts]] parsing.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getRestaurantPageSize,
  paginateRestaurants,
  restaurantListPath,
} from '../restaurant-list-urls.js';
import { tryParseRestaurantParts } from '../restaurants-path-parse.js';


test('restaurantListPath omits page 1 and encodes tags', () => {
  assert.equal(
    restaurantListPath('portugal', 'lisbon', 1),
    '/countries/portugal/lisbon/restaurants'
  );
  assert.equal(
    restaurantListPath('portugal', 'lisbon', 2),
    '/countries/portugal/lisbon/restaurants/page/2'
  );
  assert.equal(
    restaurantListPath('portugal', 'lisbon', 1, 'tasca'),
    '/countries/portugal/lisbon/restaurants/tag/tasca'
  );
  assert.equal(
    restaurantListPath('portugal', 'lisbon', 3, 'food hall'),
    '/countries/portugal/lisbon/restaurants/tag/food%20hall/page/3'
  );
});

test('tryParseRestaurantParts: list, page, tag, detail, and invalid segments', () => {
  assert.deepEqual(tryParseRestaurantParts(undefined), { kind: 'list', page: 1 });
  assert.deepEqual(tryParseRestaurantParts([]), { kind: 'list', page: 1 });
  assert.deepEqual(tryParseRestaurantParts(['page', '2']), { kind: 'list', page: 2 });
  assert.equal(tryParseRestaurantParts(['page', '1']), null);
  assert.equal(tryParseRestaurantParts(['page', '1.5']), null);
  assert.equal(tryParseRestaurantParts(['page']), null);
  assert.deepEqual(tryParseRestaurantParts(['tag', 'tasca']), {
    kind: 'list',
    page: 1,
    tag: 'tasca',
  });
  assert.deepEqual(tryParseRestaurantParts(['tag', 'tasca', 'page', '2']), {
    kind: 'list',
    page: 2,
    tag: 'tasca',
  });
  assert.equal(tryParseRestaurantParts(['tag']), null);
  assert.equal(tryParseRestaurantParts(['tag', 'tasca', 'page', '1']), null);
  assert.equal(tryParseRestaurantParts(['tag', 'tasca', 'extra']), null);
  assert.deepEqual(tryParseRestaurantParts(['time-out-market']), {
    kind: 'detail',
    slug: 'time-out-market',
  });
  assert.equal(tryParseRestaurantParts(['a', 'b']), null);
});

test('paginateRestaurants uses 1-based pages and sane defaults', () => {
  const items = [1, 2, 3, 4, 5, 6, 7];
  assert.deepEqual(paginateRestaurants(items, 1, 6), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(paginateRestaurants(items, 2, 6), [7]);
  assert.deepEqual(paginateRestaurants(items, 0, 6), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(paginateRestaurants(items, 1, 0), [1]);
});

test('pagination splits a catalogue larger than one page', () => {
  // Was an assertion about content/data/restaurants.json. The catalogue now lives
  // in the database, so what is worth pinning here is the paging maths, not the
  // row count — a data property belongs in `npm run db:check:all`, not a unit test.
  const size = getRestaurantPageSize();
  const rows = Array.from({ length: size + 2 }, (_, i) => ({ slug: `r-${i}` }));
  assert.equal(paginateRestaurants(rows, 1, size).length, size);
  assert.equal(paginateRestaurants(rows, 2, size).length, 2);
  const seen = [
    ...paginateRestaurants(rows, 1, size),
    ...paginateRestaurants(rows, 2, size),
  ].map((r) => r.slug);
  assert.equal(new Set(seen).size, rows.length, 'pages must not overlap or drop rows');
});
