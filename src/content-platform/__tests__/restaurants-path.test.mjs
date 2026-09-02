/**
 * Country restaurant list URLs: pagination, tags, and [[...parts]] parsing.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  getRestaurantPageSize,
  paginateRestaurants,
  restaurantListPath,
} from '../restaurant-list-urls.js';
import { tryParseRestaurantParts } from '../restaurants-path-parse.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const CATALOG = path.join(ROOT, 'content', 'data', 'restaurants.json');

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

test('Lisbon catalog is large enough for a second restaurants page', () => {
  const restaurants = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  const lisbon = restaurants.filter((r) => r.country === 'portugal' && r.city === 'lisbon');
  assert.ok(lisbon.length > getRestaurantPageSize(), `got ${lisbon.length} Lisbon rows`);
  const slugs = new Set(lisbon.map((r) => r.slug));
  assert.equal(slugs.size, lisbon.length);
  assert.ok(lisbon.some((r) => (r.categories ?? []).includes('tasca')));
});
