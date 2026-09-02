/**
 * Admin restaurant typeahead: forbidden unless allowlisted; empty geography is a no-query.
 */
import assert from 'node:assert/strict';
import { describe, mock, test } from 'node:test';

const ADMIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const CITY_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

/** @type {object | null} */
let authUser = null;
const adminCalls = [];
/** @type {Array<{ id: string }>} */
let cityRows = [];
/** @type {Array<{ id: string, name: string, address: string | null }>} */
let restaurantRows = [];

mock.module('src/libs/supabase/supabase-server-client.js', {
  exports: {
    getSupabaseAuthUser: async () => ({ data: { user: authUser }, error: null }),
    createSupabaseServerClient: async () => ({}),
  },
});

mock.module('src/libs/auth/admin-allowlist.js', {
  exports: {
    isAdminUserId: (id) => id === ADMIN_ID,
  },
});

mock.module('src/libs/supabase/supabase-admin.js', {
  exports: {
    supabaseAdminClient: {
      from(table) {
        const ctx = { table, filters: {}, op: 'select' };
        const api = {
          select() {
            return api;
          },
          eq(col, val) {
            ctx.filters[col] = val;
            return api;
          },
          in(col, vals) {
            ctx.in = { col, vals };
            return api;
          },
          ilike(col, val) {
            ctx.ilike = { col, val };
            return api;
          },
          order() {
            return api;
          },
          limit() {
            return api;
          },
          then(onFulfilled, onRejected) {
            adminCalls.push({ ...ctx });
            const data = table === 'restaurants' ? restaurantRows : table === 'cities' ? cityRows : [];
            return Promise.resolve({ data, error: null }).then(onFulfilled, onRejected);
          },
        };
        return api;
      },
    },
  },
});

const { searchAdminRestaurantsForSelectAction } = await import(
  '../actions/admin-reference-actions.js'
);

describe('searchAdminRestaurantsForSelectAction', { concurrency: false }, () => {
  test('forbidden without an allowlisted session', async () => {
    authUser = null;
    assert.deepEqual(await searchAdminRestaurantsForSelectAction({ scope: 'city', geographyId: CITY_ID }), {
      restaurants: [],
      error: 'forbidden',
    });
    authUser = { id: USER_ID };
    assert.equal(
      (await searchAdminRestaurantsForSelectAction({ scope: 'city', geographyId: CITY_ID })).error,
      'forbidden'
    );
  });

  test('empty geographyId skips the restaurants query', async () => {
    authUser = { id: ADMIN_ID };
    adminCalls.length = 0;
    restaurantRows = [];
    cityRows = [];
    assert.deepEqual(
      await searchAdminRestaurantsForSelectAction({ scope: 'city', geographyId: '  ', query: 'x' }),
      { restaurants: [], error: null }
    );
    assert.equal(adminCalls.length, 0);
  });

  test('allowlisted city search returns name-matched restaurants', async () => {
    authUser = { id: ADMIN_ID };
    adminCalls.length = 0;
    restaurantRows = [
      { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Cervejaria Ramiro', address: 'Av. Almirante Reis' },
    ];
    const out = await searchAdminRestaurantsForSelectAction({
      scope: 'city',
      geographyId: CITY_ID,
      query: 'ram',
    });
    assert.equal(out.error, null);
    assert.equal(out.restaurants[0].name, 'Cervejaria Ramiro');
    const restCall = adminCalls.find((c) => c.table === 'restaurants');
    assert.deepEqual(restCall.in, { col: 'municipality_id', vals: [CITY_ID] });
    assert.equal(restCall.ilike.col, 'name');
    assert.equal(restCall.ilike.val, '%ram%');
  });

  test('state scope resolves municipality cities then restaurants', async () => {
    authUser = { id: ADMIN_ID };
    adminCalls.length = 0;
    cityRows = [{ id: CITY_ID }];
    restaurantRows = [{ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Ramiro', address: null }];
    const out = await searchAdminRestaurantsForSelectAction({
      scope: 'state',
      geographyId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      query: '',
    });
    assert.equal(out.error, null);
    assert.equal(out.restaurants[0].name, 'Ramiro');
    assert.ok(adminCalls.some((c) => c.table === 'cities' && c.filters.state_id));
    assert.ok(adminCalls.some((c) => c.table === 'restaurants' && !c.ilike));
  });
});
