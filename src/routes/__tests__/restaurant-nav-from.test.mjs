import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { paths } from '../paths.js';
import { restaurantHrefWithFrom, resolveRestaurantNavBackHref } from '../restaurant-nav-from.js';

describe('resolveRestaurantNavBackHref', () => {
  it('maps known from keys', () => {
    assert.equal(resolveRestaurantNavBackHref('roleta'), paths.site.rouletteLisboa);
    assert.equal(resolveRestaurantNavBackHref('roulette'), paths.dashboard.roulette);
    assert.equal(resolveRestaurantNavBackHref('discover'), paths.dashboard.discover);
    assert.equal(resolveRestaurantNavBackHref('map'), paths.dashboard.map);
    assert.equal(resolveRestaurantNavBackHref('lists'), paths.dashboard.lists);
  });

  it('resolves list with listId', () => {
    const id = '11111111-1111-1111-1111-111111111111';
    assert.equal(resolveRestaurantNavBackHref('list', { listId: id }), paths.dashboard.listDetails(id));
    assert.equal(resolveRestaurantNavBackHref('list'), paths.dashboard.lists);
  });

  it('returns null for unknown from', () => {
    assert.equal(resolveRestaurantNavBackHref(null), null);
    assert.equal(resolveRestaurantNavBackHref('nope'), null);
  });
});

describe('restaurantHrefWithFrom', () => {
  it('appends from and optional listId', () => {
    assert.equal(
      restaurantHrefWithFrom('/dashboard/restaurants/x', 'discover'),
      '/dashboard/restaurants/x?from=discover'
    );
    assert.equal(
      restaurantHrefWithFrom('/dashboard/restaurants/x', 'list', { listId: 'abc' }),
      '/dashboard/restaurants/x?from=list&listId=abc'
    );
  });

  it('returns bare path when from is missing', () => {
    assert.equal(restaurantHrefWithFrom('/dashboard/restaurants/x', null), '/dashboard/restaurants/x');
  });
});
