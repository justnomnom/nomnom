/**
 * upsertRestaurantReview with a mocked Supabase client.
 * Covers validation, overlapping existing-review + profile fetches, and author denorm on upsert.
 */
import assert from 'node:assert/strict';
import { describe, mock, test } from 'node:test';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const RESTAURANT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

/** @type {object | null} */
let authUser = { id: USER_ID };
/** @type {ReturnType<typeof makeSupabaseMock> | null} */
let supabase = null;

mock.module('src/libs/supabase/supabase-server-client.js', {
  exports: {
    createSupabaseServerClient: async () => supabase,
    getSupabaseAuthUser: async () => ({ data: { user: authUser }, error: null }),
  },
});

const { upsertRestaurantReview, fetchRestaurantReviews, deleteRestaurantReview } = await import(
  '../../auth/actions/restaurant-review-actions.js'
);

/**
 * @param {(ctx: object) => object | Promise<object>} handler
 */
function makeSupabaseMock(handler) {
  const calls = [];
  const removed = [];

  function resolve(ctx) {
    calls.push(ctx);
    return Promise.resolve(handler(ctx)).then((result) => {
      if (result && typeof result === 'object' && ('data' in result || 'error' in result)) {
        return result;
      }
      return { data: result ?? null, error: null };
    });
  }

  function builder(table) {
    const ctx = {
      kind: 'from',
      table,
      op: 'select',
      payload: undefined,
      select: undefined,
      filter: {},
    };
    const api = {
      select(...args) {
        ctx.select = args[0];
        if (ctx.op !== 'update' && ctx.op !== 'delete' && ctx.op !== 'upsert') ctx.op = 'select';
        return api;
      },
      upsert(payload, opts) {
        ctx.op = 'upsert';
        ctx.payload = payload;
        ctx.upsertOpts = opts;
        return api;
      },
      eq(col, val) {
        ctx.filter[col] = val;
        return api;
      },
      order() {
        return api;
      },
      maybeSingle() {
        return resolve({ ...ctx, single: 'maybe' });
      },
      then(onFulfilled, onRejected) {
        return resolve({ ...ctx }).then(onFulfilled, onRejected);
      },
    };
    return api;
  }

  return {
    calls,
    removed,
    from(table) {
      return builder(table);
    },
    rpc(name, args) {
      const p = resolve({ kind: 'rpc', rpc: name, args });
      return {
        then: p.then.bind(p),
        catch: p.catch.bind(p),
      };
    },
    storage: {
      from() {
        return {
          remove: async (paths) => {
            removed.push(...paths);
            return { data: paths, error: null };
          },
        };
      },
    },
  };
}

describe('restaurant review actions with mocked Supabase', { concurrency: false }, () => {
  test('upsertRestaurantReview: unauthorized without a session', async () => {
    authUser = null;
    supabase = makeSupabaseMock(() => ({ data: null, error: null }));
    const out = await upsertRestaurantReview({
      restaurantId: RESTAURANT_ID,
      rating: 4,
      body: 'Great',
    });
    assert.deepEqual(out, { errorKey: 'unauthorized', error: 'unauthorized' });
    assert.equal(supabase.calls.length, 0);
  });

  test('upsertRestaurantReview: invalid rating / restaurant / overlong body', async () => {
    authUser = { id: USER_ID };
    supabase = makeSupabaseMock(() => ({ data: null, error: null }));
    assert.deepEqual(
      await upsertRestaurantReview({ restaurantId: '', rating: 4, body: 'x' }),
      { errorKey: 'invalid_restaurant', error: 'invalid_restaurant' }
    );
    assert.deepEqual(
      await upsertRestaurantReview({ restaurantId: RESTAURANT_ID, rating: 0, body: 'x' }),
      { errorKey: 'invalid_rating', error: 'invalid_rating' }
    );
    assert.deepEqual(
      await upsertRestaurantReview({
        restaurantId: RESTAURANT_ID,
        rating: 4,
        body: 'x'.repeat(2001),
      }),
      { errorKey: 'body_too_long', error: 'body_too_long' }
    );
    assert.equal(supabase.calls.length, 0);
  });

  test('upsertRestaurantReview: fetches existing media and profile together, then upserts', async () => {
    authUser = { id: USER_ID };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'restaurant_reviews' && ctx.single === 'maybe') {
        return {
          data: { media: [{ kind: 'image', path: `${USER_ID}/${RESTAURANT_ID}/old.jpg` }] },
          error: null,
        };
      }
      if (ctx.table === 'users' && ctx.single === 'maybe') {
        return {
          data: { display_name: 'Ada', username: 'ada', avatar_url: 'https://cdn/a.jpg' },
          error: null,
        };
      }
      if (ctx.table === 'restaurant_reviews' && ctx.op === 'upsert') {
        return { data: null, error: null };
      }
      return { data: null, error: null };
    });

    const out = await upsertRestaurantReview({
      restaurantId: RESTAURANT_ID,
      rating: 4.5,
      body: '  Great noodles  ',
      media: [],
    });
    assert.deepEqual(out, { error: null });

    const existing = supabase.calls.find(
      (c) => c.table === 'restaurant_reviews' && c.single === 'maybe'
    );
    const profile = supabase.calls.find((c) => c.table === 'users' && c.single === 'maybe');
    const upsert = supabase.calls.find((c) => c.table === 'restaurant_reviews' && c.op === 'upsert');
    assert.ok(existing);
    assert.ok(profile);
    assert.equal(upsert.payload.rating, 4.5);
    assert.equal(upsert.payload.body, 'Great noodles');
    assert.equal(upsert.payload.author_display_name, 'Ada');
    assert.equal(upsert.payload.author_username, 'ada');
    assert.deepEqual(upsert.payload.media, []);
    assert.deepEqual(supabase.removed, [`${USER_ID}/${RESTAURANT_ID}/old.jpg`]);
  });

  test('fetchRestaurantReviews: blank id → empty without querying', async () => {
    supabase = makeSupabaseMock(() => ({ data: [], error: null }));
    const out = await fetchRestaurantReviews('');
    assert.deepEqual(out, { reviews: [], error: null });
    assert.equal(supabase.calls.length, 0);
  });

  test('deleteRestaurantReview: unauthorized / missing restaurant id', async () => {
    authUser = null;
    supabase = makeSupabaseMock(() => ({ data: null, error: null }));
    assert.deepEqual(await deleteRestaurantReview({ restaurantId: RESTAURANT_ID }), {
      errorKey: 'unauthorized',
      error: 'unauthorized',
    });
    authUser = { id: USER_ID };
    assert.deepEqual(await deleteRestaurantReview({ restaurantId: '' }), {
      errorKey: 'invalid_restaurant',
      error: 'invalid_restaurant',
    });
  });

  test('fetchRestaurantReviews: returns rows; query error surfaces', async () => {
    authUser = { id: USER_ID };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'restaurant_reviews') {
        return {
          data: [
            {
              id: 'rev-1',
              restaurant_id: RESTAURANT_ID,
              user_id: USER_ID,
              rating: 5,
              body: 'Yes',
            },
          ],
          error: null,
        };
      }
      return { data: [], error: null };
    });
    const ok = await fetchRestaurantReviews(RESTAURANT_ID);
    assert.equal(ok.error, null);
    assert.equal(ok.reviews[0].id, 'rev-1');
    assert.equal(ok.reviews[0].rating, 5);

    supabase = makeSupabaseMock(() => ({ data: null, error: { message: 'reviews_down' } }));
    assert.deepEqual(await fetchRestaurantReviews(RESTAURANT_ID), {
      reviews: [],
      error: 'reviews_down',
    });
  });

  test('deleteRestaurantReview: nothing_to_delete, then rpc success clears storage', async () => {
    authUser = { id: USER_ID };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.rpc === 'delete_my_restaurant_review') {
        return { data: { deleted: false }, error: null };
      }
      return { data: null, error: null };
    });
    assert.deepEqual(await deleteRestaurantReview({ restaurantId: RESTAURANT_ID }), {
      errorKey: 'nothing_to_delete',
      error: 'nothing_to_delete',
    });

    supabase = makeSupabaseMock((ctx) => {
      if (ctx.rpc === 'delete_my_restaurant_review') {
        return {
          data: {
            deleted: true,
            media: [{ path: `${USER_ID}/${RESTAURANT_ID}/shot.jpg` }],
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });
    assert.deepEqual(await deleteRestaurantReview({ restaurantId: RESTAURANT_ID }), {
      error: null,
    });
    assert.deepEqual(supabase.removed, [`${USER_ID}/${RESTAURANT_ID}/shot.jpg`]);
  });
});
