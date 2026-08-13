/**
 * Integration-style tests for list server actions with a mocked Supabase client.
 * Avoids next/headers by replacing supabase-server-client (and notify/slug side effects).
 */
import assert from 'node:assert/strict';
import { describe, mock, test } from 'node:test';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';
const LIST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const LIST_B_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const RESTAURANT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ITEM_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

/** @type {object | null} */
let authUser = { id: USER_ID };
/** @type {ReturnType<typeof makeSupabaseMock> | null} */
let supabase = null;

const ensureSlugCalls = [];
const notifyFollowersCalls = [];
const notifyLiveCalls = [];

mock.module('src/libs/supabase/supabase-admin.js', {
  exports: {
    supabaseAdminClient: {
      from() {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          in() {
            return this;
          },
          not() {
            return this;
          },
          gt() {
            return this;
          },
          maybeSingle: async () => ({ data: null, error: null }),
          then(resolve, reject) {
            return Promise.resolve({ data: null, error: null, count: 0 }).then(resolve, reject);
          },
        };
      },
    },
  },
});

mock.module('src/libs/supabase/supabase-server-client.js', {
  exports: {
    createSupabaseServerClient: async () => supabase,
    getSupabaseAuthUser: async () => ({ data: { user: authUser }, error: null }),
    getUserOnboardingRow: async () => ({ data: null, error: null }),
  },
});

mock.module('src/libs/lists/ensure-list-slug.js', {
  exports: {
    ensureListSlug: async (listId) => {
      ensureSlugCalls.push(listId);
      return { error: null, slug: 'untitled-list' };
    },
  },
});

mock.module('src/libs/notifications/notify-list-followers.js', {
  exports: {
    notifyListFollowers: (_sb, listId, restaurantId, actingUserId) => {
      notifyFollowersCalls.push({ listId, restaurantId, actingUserId });
      return Promise.resolve();
    },
  },
});

mock.module('src/libs/notifications/list-live-update-notify.js', {
  exports: {
    notifyLiveListSubscribers: (_sb, listId) => {
      notifyLiveCalls.push({ listId });
      return Promise.resolve();
    },
  },
});

const { createList } = await import('../actions/crud-hub-actions.js');
const { addRestaurantToLists } = await import('../actions/items-actions.js');
const { fetchListPage } = await import('../actions/list-page-actions.js');

/**
 * Chainable PostgREST stub. `handler` returns `{ data, error }` (or a thenable) per call.
 * @param {(ctx: object) => object | Promise<object>} handler
 */
function makeSupabaseMock(handler) {
  const calls = [];

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
        if (ctx.op !== 'update' && ctx.op !== 'delete') ctx.op = 'select';
        return api;
      },
      insert(payload) {
        ctx.op = 'insert';
        ctx.payload = payload;
        return api;
      },
      upsert(payload, opts) {
        ctx.op = 'upsert';
        ctx.payload = payload;
        ctx.upsertOpts = opts;
        return api;
      },
      update(payload) {
        ctx.op = 'update';
        ctx.payload = payload;
        return api;
      },
      delete() {
        ctx.op = 'delete';
        return api;
      },
      eq(col, val) {
        ctx.filter[col] = val;
        return api;
      },
      in(col, val) {
        ctx.filter[`in:${col}`] = val;
        return api;
      },
      order() {
        return api;
      },
      limit() {
        return api;
      },
      range() {
        return api;
      },
      not() {
        return api;
      },
      gt() {
        return api;
      },
      ilike() {
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
    from(table) {
      return builder(table);
    },
    rpc(name, args) {
      return resolve({ kind: 'rpc', rpc: name, args });
    },
  };
}

function resetSideEffects() {
  ensureSlugCalls.length = 0;
  notifyFollowersCalls.length = 0;
  notifyLiveCalls.length = 0;
}

function publicListRow(overrides = {}) {
  return {
    id: LIST_ID,
    user_id: USER_ID,
    name: 'Dinner',
    description: '',
    cover_image_url: null,
    visibility: 'public',
    published_at: '2026-01-01T00:00:00Z',
    paid_access_enabled: false,
    monthly_amount_cents: null,
    currency: 'eur',
    list_updated_at: '2026-01-02T00:00:00Z',
    slug: 'dinner',
    ...overrides,
  };
}

describe('list server actions with mocked Supabase', { concurrency: false }, () => {
test('createList: unauthorized without a session', async () => {
  authUser = null;
  supabase = makeSupabaseMock(() => ({ data: null, error: null }));
  const out = await createList({ name: 'Dinner' });
  assert.deepEqual(out, { list: null, error: 'unauthorized' });
  assert.equal(
    supabase.calls.some((c) => c.kind === 'rpc'),
    false
  );
});

test('createList: trims name, defaults visibility, rpc success + slug', async () => {
  authUser = { id: USER_ID };
  resetSideEffects();
  supabase = makeSupabaseMock((ctx) => {
    if (ctx.kind === 'rpc' && ctx.rpc === 'create_user_list') {
      return { data: LIST_ID, error: null };
    }
    return { data: null, error: null };
  });

  const out = await createList({ name: '  Dinner  ', description: '  spots  ' });
  assert.deepEqual(out, { list: { id: LIST_ID }, error: null });

  const rpc = supabase.calls.find((c) => c.kind === 'rpc' && c.rpc === 'create_user_list');
  assert.ok(rpc);
  assert.deepEqual(rpc.args, {
    p_name: 'Dinner',
    p_description: 'spots',
    p_visibility: 'private',
  });
  assert.deepEqual(ensureSlugCalls, [LIST_ID]);
});

test('createList: rpc error surfaces the message', async () => {
  authUser = { id: USER_ID };
  resetSideEffects();
  supabase = makeSupabaseMock((ctx) => {
    if (ctx.kind === 'rpc' && ctx.rpc === 'create_user_list') {
      return { data: null, error: { message: 'duplicate_name' } };
    }
    return { data: null, error: null };
  });

  const out = await createList({ name: 'Dinner', visibility: 'public' });
  assert.deepEqual(out, { list: null, error: 'duplicate_name' });
  assert.deepEqual(ensureSlugCalls, []);
});

test('addRestaurantToLists: unauthorized / invalid input', async () => {
  authUser = null;
  supabase = makeSupabaseMock(() => ({ data: null, error: null }));
  assert.deepEqual(await addRestaurantToLists(RESTAURANT_ID, [LIST_ID]), { error: 'unauthorized' });

  authUser = { id: USER_ID };
  assert.deepEqual(await addRestaurantToLists('', [LIST_ID]), { error: 'invalid' });
  assert.deepEqual(await addRestaurantToLists(RESTAURANT_ID, []), { error: 'invalid' });
});

test('addRestaurantToLists: upserts prepended sort_order and notifies only new lists', async () => {
  authUser = { id: USER_ID };
  resetSideEffects();
  supabase = makeSupabaseMock((ctx) => {
    if (ctx.table === 'list_items' && ctx.op === 'select' && String(ctx.select).includes('sort_order')) {
      return {
        data: [
          { list_id: LIST_ID, sort_order: 5 },
          { list_id: LIST_ID, sort_order: 8 },
        ],
        error: null,
      };
    }
    if (ctx.table === 'list_items' && ctx.op === 'select') {
      return { data: [{ list_id: LIST_B_ID }], error: null };
    }
    if (ctx.table === 'list_items' && ctx.op === 'upsert') {
      return { data: null, error: null };
    }
    if (ctx.table === 'lists' && ctx.op === 'update') {
      return { data: null, error: null };
    }
    return { data: null, error: null };
  });

  const out = await addRestaurantToLists(RESTAURANT_ID, [LIST_ID, LIST_B_ID]);
  assert.deepEqual(out, { error: null });

  const upsert = supabase.calls.find((c) => c.table === 'list_items' && c.op === 'upsert');
  assert.ok(upsert);
  assert.equal(upsert.upsertOpts?.onConflict, 'list_id,restaurant_id');
  assert.deepEqual(upsert.payload, [
    { list_id: LIST_ID, restaurant_id: RESTAURANT_ID, sort_order: 4, added_by: USER_ID },
    { list_id: LIST_B_ID, restaurant_id: RESTAURANT_ID, sort_order: 0, added_by: USER_ID },
  ]);

  assert.deepEqual(
    notifyFollowersCalls.map((c) => c.listId),
    [LIST_ID]
  );
  assert.deepEqual(
    notifyLiveCalls.map((c) => c.listId),
    [LIST_ID]
  );
  assert.equal(notifyFollowersCalls[0].restaurantId, RESTAURANT_ID);
  assert.equal(notifyFollowersCalls[0].actingUserId, USER_ID);
});

test('fetchListPage: missing list → not_found', async () => {
  authUser = { id: USER_ID };
  supabase = makeSupabaseMock((ctx) => {
    if (ctx.table === 'lists' && ctx.single === 'maybe') {
      return { data: null, error: null };
    }
    return { data: [], error: null };
  });

  const out = await fetchListPage(LIST_ID, { viewerLang: 'en' });
  assert.equal(out.error, 'not_found');
  assert.equal(out.list, null);
  assert.deepEqual(out.items, []);
});

test('fetchListPage: private list denied for a stranger', async () => {
  authUser = { id: OTHER_USER_ID };
  supabase = makeSupabaseMock((ctx) => {
    if (ctx.table === 'lists' && ctx.single === 'maybe') {
      return { data: publicListRow({ visibility: 'private', user_id: USER_ID }), error: null };
    }
    if (ctx.table === 'list_members') {
      return { data: null, error: null };
    }
    if (ctx.table === 'list_subscriptions' || ctx.table === 'list_snapshot_purchases') {
      return { data: [], error: null };
    }
    return { data: [], error: null };
  });

  const out = await fetchListPage(LIST_ID, { viewerLang: 'en' });
  assert.equal(out.error, 'not_public');
  assert.equal(out.list, null);
  assert.deepEqual(out.items, []);
});

test('fetchListPage: unpublished public_subscribers without session → login_required', async () => {
  authUser = null;
  supabase = makeSupabaseMock((ctx) => {
    if (ctx.table === 'lists' && ctx.single === 'maybe') {
      return {
        data: publicListRow({
          visibility: 'public_subscribers',
          published_at: null,
          user_id: USER_ID,
        }),
        error: null,
      };
    }
    if (ctx.kind === 'rpc' && ctx.rpc === 'list_owner_snapshot') {
      return {
        data: [
          {
            owner_id: USER_ID,
            display_name: 'Ada',
            username: 'ada',
            avatar_url: null,
          },
        ],
        error: null,
      };
    }
    return { data: [], error: null };
  });

  const out = await fetchListPage(LIST_ID, { viewerLang: 'en' });
  assert.equal(out.error, 'login_required');
  assert.equal(out.list?.id, LIST_ID);
  assert.deepEqual(out.items, []);
  assert.equal(out.owner?.username, 'ada');
  assert.equal(out.paidAccess?.enabled, false);
});

test('fetchListPage: owner of a public list gets items, membership, and owner', async () => {
  authUser = { id: USER_ID };
  supabase = makeSupabaseMock((ctx) => {
    if (ctx.table === 'lists' && ctx.single === 'maybe') {
      return { data: publicListRow(), error: null };
    }
    if (ctx.table === 'list_subscriptions' || ctx.table === 'list_snapshot_purchases') {
      return { data: [], error: null };
    }
    if (ctx.table === 'list_items' && ctx.op === 'select') {
      return {
        data: [
          {
            id: ITEM_ID,
            restaurant_id: RESTAURANT_ID,
            sort_order: 0,
            added_by: null,
            created_at: '2026-01-02T00:00:00Z',
            list_item_must_try_dishes: [],
            restaurants: {
              id: RESTAURANT_ID,
              name: 'Cafe',
              metadata: { rating: 4.5, user_reviews: ['secret'], hero_url: 'https://img/h.jpg' },
            },
          },
        ],
        error: null,
      };
    }
    if (ctx.kind === 'rpc' && ctx.rpc === 'published_list_owner') {
      return {
        data: {
          owner_id: USER_ID,
          display_name: 'Ada',
          username: 'ada',
          avatar_url: null,
        },
        error: null,
      };
    }
    return { data: [], error: null };
  });

  const out = await fetchListPage(LIST_ID, { viewerLang: 'en' });
  assert.equal(out.error, null);
  assert.equal(out.list?.id, LIST_ID);
  assert.equal(out.membership?.isOwner, true);
  assert.equal(out.membership?.isEditor, true);
  assert.equal(out.paidAccess?.enabled, false);
  assert.equal(out.paidAccess?.hasMore, false);
  assert.equal(out.owner?.username, 'ada');
  assert.equal(out.items.length, 1);
  assert.equal(out.items[0].id, ITEM_ID);
  assert.equal(out.items[0].contributor_review, null);
  assert.deepEqual(out.items[0].must_try_dishes, []);
  assert.equal(out.items[0].restaurants.metadata.rating, 4.5);
  assert.equal(out.items[0].restaurants.metadata.hero_url, 'https://img/h.jpg');
  assert.equal('user_reviews' in out.items[0].restaurants.metadata, false);
});

test('fetchListPage: non-owner on a paid list uses the freemium preview RPC', async () => {
  authUser = { id: OTHER_USER_ID };
  supabase = makeSupabaseMock((ctx) => {
    if (ctx.table === 'lists' && ctx.single === 'maybe') {
      return {
        data: publicListRow({
          paid_access_enabled: true,
          monthly_amount_cents: 399,
          visibility: 'public',
        }),
        error: null,
      };
    }
    if (ctx.table === 'list_members') {
      return { data: null, error: null };
    }
    if (ctx.table === 'list_subscriptions' || ctx.table === 'list_snapshot_purchases') {
      return { data: [], error: null };
    }
    if (ctx.kind === 'rpc' && ctx.rpc === 'public_list_creator_charges_enabled') {
      return { data: true, error: null };
    }
    if (ctx.kind === 'rpc' && ctx.rpc === 'list_freemium_preview_items') {
      return {
        data: {
          items: [
            {
              id: ITEM_ID,
              restaurant_id: RESTAURANT_ID,
              added_by: null,
              list_item_must_try_dishes: [],
              restaurants: { id: RESTAURANT_ID, name: 'Cafe', metadata: null },
            },
          ],
          has_more: true,
        },
        error: null,
      };
    }
    if (ctx.kind === 'rpc' && ctx.rpc === 'published_list_owner') {
      return {
        data: { owner_id: USER_ID, display_name: 'Ada', username: 'ada', avatar_url: null },
        error: null,
      };
    }
    return { data: [], error: null };
  });

  const out = await fetchListPage(LIST_ID, { viewerLang: 'en' });
  assert.equal(out.error, null);
  assert.equal(out.membership?.isOwner, false);
  assert.equal(out.paidAccess?.enabled, true);
  assert.equal(out.paidAccess?.hasSubscription, false);
  assert.equal(out.paidAccess?.hasMore, true);
  assert.equal(out.paidAccess?.chargesEnabled, true);
  assert.equal(out.items.length, 1);
  assert.ok(supabase.calls.some((c) => c.kind === 'rpc' && c.rpc === 'list_freemium_preview_items'));
  assert.equal(
    supabase.calls.some((c) => c.table === 'list_items' && c.op === 'select'),
    false
  );
});
});
