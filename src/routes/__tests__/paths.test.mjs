/**
 * Frontend QA — critical route builders (nav regressions = broken links).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { paths } from '../paths.js';

test('auth paths are under /auth', () => {
  assert.equal(paths.auth.supabase.login, '/auth/login');
  assert.equal(paths.auth.supabase.register, '/auth/register');
  assert.equal(paths.auth.supabase.callback, '/auth/callback');
});

test('dashboard core destinations', () => {
  assert.equal(paths.dashboard.discover, '/dashboard/discover');
  assert.equal(paths.dashboard.map, '/dashboard/map');
  assert.equal(paths.dashboard.lists, '/dashboard/lists');
  assert.equal(paths.dashboard.restaurant('abc'), '/dashboard/restaurants/abc');
});

test('listPublic: uuid vs username/slug SEO URL', () => {
  assert.equal(paths.listPublic('uuid-1'), '/lists/uuid-1');
  assert.equal(
    paths.listPublic('uuid-1', { username: 'chef', slug: 'lisbon' }),
    '/lists/chef/lisbon'
  );
});

test('userPublic strips leading @', () => {
  assert.equal(paths.userPublic('@chef'), '/u/chef');
  assert.equal(paths.userPublic('chef'), '/u/chef');
  assert.equal(paths.userPublic(null), '/u/');
});

test('restaurantPublic and site roulette', () => {
  assert.equal(paths.restaurantPublic('r1'), '/restaurants/r1');
  assert.equal(paths.site.rouletteLisboa, '/roleta/lisboa');
});

test('post.details interpolates title', () => {
  assert.equal(paths.post.details('hello-world'), '/post/hello-world');
});

test('listManage and admin ops destinations', () => {
  assert.equal(paths.dashboard.listManage('list-1'), '/dashboard/lists/list-1/manage');
  assert.equal(paths.dashboard.admin, '/dashboard/admin');
  assert.equal(
    paths.dashboard.adminSponsoredPlacements,
    '/dashboard/admin/sponsored-placements'
  );
});
