/**
 * Sponsored placement admin actions: allowlist + input validation (AD1/AD2 gates).
 */
import assert from 'node:assert/strict';
import { describe, mock, test } from 'node:test';

const ADMIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
/** @type {object | null} */
let authUser = { id: ADMIN_ID };
const inserts = [];

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

mock.module('next/cache', {
  exports: {
    revalidatePath() {},
  },
});

mock.module('src/libs/supabase/supabase-admin.js', {
  exports: {
    supabaseAdminClient: {
      from(table) {
        const ctx = { table, op: 'select', payload: undefined };
        const api = {
          insert(payload) {
            ctx.op = 'insert';
            ctx.payload = payload;
            inserts.push(payload);
            return api;
          },
          delete() {
            ctx.op = 'delete';
            return api;
          },
          update(payload) {
            ctx.op = 'update';
            ctx.payload = payload;
            return api;
          },
          eq() {
            return api;
          },
          select() {
            return api;
          },
          maybeSingle() {
            return Promise.resolve({ data: { id: 'row-1' }, error: null });
          },
          then(onFulfilled, onRejected) {
            return Promise.resolve({ data: ctx.payload ?? { id: 'row-1' }, error: null }).then(
              onFulfilled,
              onRejected
            );
          },
        };
        return api;
      },
    },
  },
});

const {
  createSponsoredPlacementAction,
  deleteSponsoredPlacementAction,
  updateSponsoredPlacementAction,
} = await import('../actions/sponsored-placement-actions.js');

describe('sponsored placement actions', { concurrency: false }, () => {
  test('non-admin is forbidden', async () => {
    authUser = { id: 'not-admin' };
    await assert.rejects(
      () =>
        createSponsoredPlacementAction({
          geographyId: 'g',
          restaurantId: 'r',
          injectAfterOrganic: null,
        }),
      /forbidden/
    );
  });

  test('create: missing ids and invalid inject', async () => {
    authUser = { id: ADMIN_ID };
    assert.deepEqual(
      await createSponsoredPlacementAction({
        geographyId: '',
        restaurantId: 'r',
        injectAfterOrganic: null,
      }),
      { ok: false, error: 'missing_ids' }
    );
    assert.deepEqual(
      await createSponsoredPlacementAction({
        geographyId: 'g',
        restaurantId: 'r',
        injectAfterOrganic: -1,
      }),
      { ok: false, error: 'invalid_inject' }
    );
  });

  test('create: happy path defaults pin sort; delete/update require id', async () => {
    authUser = { id: ADMIN_ID };
    inserts.length = 0;
    const created = await createSponsoredPlacementAction({
      geographyId: 'geo-1',
      restaurantId: 'rest-1',
      injectAfterOrganic: 2,
    });
    assert.equal(created.ok, true);
    assert.equal(inserts[0].city_id, 'geo-1');
    assert.equal(inserts[0].restaurant_id, 'rest-1');
    assert.equal(inserts[0].pin_sort_order, 0);
    assert.equal(inserts[0].inject_after_organic, 2);
    assert.deepEqual(await deleteSponsoredPlacementAction(''), { ok: false, error: 'missing_id' });
    assert.deepEqual(await updateSponsoredPlacementAction('', {}), { ok: false, error: 'missing_id' });
  });
});
