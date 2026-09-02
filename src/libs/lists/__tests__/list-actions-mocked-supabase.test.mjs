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
/** Admin `list_items` result used by map-by-list-ids (mutable so happy paths can return rows). */
let adminListItemsResult = { data: null, error: null };

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
          maybeSingle: async () => adminListItemsResult,
          then(resolve, reject) {
            return Promise.resolve(adminListItemsResult).then(resolve, reject);
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

mock.module('src/libs/notifications/create-notification.js', {
  exports: {
    insertNotifications: async () => {},
  },
});

mock.module('src/libs/notifications/social-notification-payloads.js', {
  exports: {
    buildListSocialNotificationData: () => ({}),
    resolveOwnerRecipientExcludingActor: () => null,
    shouldEmitDirectNotification: () => false,
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

const { createList, fetchMyLists, fetchMyListsHub, deleteList, fetchOwnedListsForBilling, updateListMeta, restaurantInMyLists, fetchListSummariesForViewer } =
  await import('../actions/crud-hub-actions.js');
const {
  addRestaurantToLists,
  searchRestaurantsForPicker,
  listIdsByRestaurantIdsForUser,
  addListItem,
  fetchViewerSavedListMap,
  removeRestaurantFromList,
} = await import('../actions/items-actions.js');
const {
  fetchSavedRestaurantsForMap,
  fetchFollowingRestaurantsForMap,
  fetchMyOwnedListsForMapDropdown,
  fetchMyCollaboratorListsForMapDropdown,
  fetchSavedRestaurantsForMapByListIds,
  fetchFollowingRestaurantsForMapByListIds,
  fetchFollowingListsForMapDropdown,
  fetchFollowingListOwnersForRestaurants,
  fetchViewerFollowingOwnersMap,
  fetchFollowCircleForRestaurant,
} = await import('../actions/map-actions.js');
const { fetchRestaurantListMentions, fetchPublicListItemsForRestaurant, fetchViewerFollowingIds } =
  await import('../actions/mentions-actions.js');
const {
  fetchListPage,
  resolveListSlug,
  fetchListForManage,
  fetchListMetadata,
  fetchListMembershipForViewer,
} = await import('../actions/list-page-actions.js');
const {
  inviteToList,
  acceptListInvite,
  declineListInvite,
  removeListMember,
  approveListJoinRequest,
  rejectListJoinRequest,
  setListMemberRole,
  fetchPublicProfileActivityPage,
  resolveUsernameToUserId,
} = await import('../actions/members-profile-actions.js');

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
      const p = resolve({ kind: 'rpc', rpc: name, args });
      return {
        range() {
          return p;
        },
        then: p.then.bind(p),
        catch: p.catch.bind(p),
      };
    },
  };
}

function resetSideEffects() {
  ensureSlugCalls.length = 0;
  notifyFollowersCalls.length = 0;
  notifyLiveCalls.length = 0;
  adminListItemsResult = { data: null, error: null };
}

function mapRestaurantRow(overrides = {}) {
  return {
    id: RESTAURANT_ID,
    name: 'Spot',
    latitude: 38.72,
    longitude: -9.14,
    municipality_id: null,
    metadata: {},
    is_sponsored: false,
    ...overrides,
  };
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
  assert.deepEqual(await fetchMyLists(), { lists: [], error: 'unauthorized' });
  const hub = await fetchMyListsHub();
  assert.equal(hub.error, 'unauthorized');
  assert.deepEqual(hub.owned, []);
  assert.deepEqual(await deleteList(LIST_ID), { error: 'unauthorized' });
});

test('map saved/following: logged-out viewers get empty restaurants', async () => {
  authUser = null;
  supabase = makeSupabaseMock(() => {
    throw new Error('should not query');
  });
  assert.deepEqual(await fetchSavedRestaurantsForMap(), { restaurants: [], error: null });
  assert.deepEqual(await fetchFollowingRestaurantsForMap(), { restaurants: [], error: null });
});

test('fetchRestaurantListMentions: missing restaurant id is empty', async () => {
  assert.deepEqual(await fetchRestaurantListMentions(''), { items: [], error: null });
  assert.deepEqual(await fetchRestaurantListMentions(null), { items: [], error: null });
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

test('searchRestaurantsForPicker: queries shorter than 2 chars skip the table', async () => {
  authUser = { id: USER_ID };
  supabase = makeSupabaseMock(() => {
    throw new Error('should not query restaurants');
  });
  assert.deepEqual(await searchRestaurantsForPicker('a'), { restaurants: [], error: null });
  assert.deepEqual(await searchRestaurantsForPicker('  '), { restaurants: [], error: null });
  assert.deepEqual(await searchRestaurantsForPicker(null), { restaurants: [], error: null });
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

test('resolveListSlug: blank handle or slug → null without querying', async () => {
  supabase = makeSupabaseMock(() => ({ data: null, error: null }));
  assert.equal(await resolveListSlug('', 'dinner'), null);
  assert.equal(await resolveListSlug('ada', ''), null);
  assert.equal(
    supabase.calls.some((c) => c.kind === 'rpc'),
    false
  );
});

test('resolveListSlug: unknown creator → null', async () => {
  supabase = makeSupabaseMock((ctx) => {
    if (ctx.kind === 'rpc' && ctx.rpc === 'resolve_user_id_from_username') {
      return { data: null, error: null };
    }
    return { data: null, error: null };
  });
  assert.equal(await resolveListSlug('nobody', 'dinner'), null);
  assert.equal(
    supabase.calls.some((c) => c.table === 'lists'),
    false
  );
});

test('resolveListSlug: handle + slug resolve to the list id', async () => {
  supabase = makeSupabaseMock((ctx) => {
    if (ctx.kind === 'rpc' && ctx.rpc === 'resolve_user_id_from_username') {
      assert.equal(ctx.args.p_username, 'ada');
      return { data: USER_ID, error: null };
    }
    if (ctx.table === 'lists' && ctx.single === 'maybe') {
      assert.equal(ctx.filter.user_id, USER_ID);
      assert.equal(ctx.filter.slug, 'dinner');
      return { data: { id: LIST_ID }, error: null };
    }
    return { data: null, error: null };
  });
  assert.equal(await resolveListSlug('@Ada', 'Dinner'), LIST_ID);
});

test('fetchListForManage: missing list → not_found', async () => {
  authUser = { id: USER_ID };
  supabase = makeSupabaseMock((ctx) => {
    if (ctx.table === 'lists' && ctx.single === 'maybe') {
      return { data: null, error: null };
    }
    return { data: [], error: null };
  });
  const out = await fetchListForManage(LIST_ID, { viewerLang: 'en' });
  assert.equal(out.error, 'not_found');
  assert.equal(out.list, null);
  assert.deepEqual(out.items, []);
});

test('fetchListForManage: editor viewer gets list, items, members, and owner in parallel', async () => {
  authUser = { id: OTHER_USER_ID };
  supabase = makeSupabaseMock((ctx) => {
    if (ctx.table === 'lists' && ctx.single === 'maybe') {
      return {
        data: {
          id: LIST_ID,
          user_id: USER_ID,
          name: 'Dinner',
          description: '',
          cover_image_url: null,
          visibility: 'public',
          published_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
          paid_access_enabled: false,
          monthly_amount_cents: null,
          currency: 'eur',
          stripe_price_id: null,
          stripe_product_id: null,
        },
        error: null,
      };
    }
    if (ctx.table === 'list_items' && ctx.op === 'select') {
      return { data: [], error: null };
    }
    if (ctx.kind === 'rpc' && ctx.rpc === 'list_members_with_profiles') {
      return {
        data: [
          {
            user_id: OTHER_USER_ID,
            role: 'editor',
            status: 'accepted',
            invited_by: USER_ID,
            created_at: '2026-01-01T00:00:00Z',
            display_name: 'Bo',
            username: 'bo',
            avatar_url: null,
          },
        ],
        error: null,
      };
    }
    if (ctx.kind === 'rpc' && ctx.rpc === 'list_manage_owner_profile') {
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
  const out = await fetchListForManage(LIST_ID, { viewerLang: 'en' });
  assert.equal(out.error, null);
  assert.equal(out.list?.id, LIST_ID);
  assert.deepEqual(out.items, []);
  assert.equal(out.members[0]?.user_id, OTHER_USER_ID);
  assert.equal(out.listOwner?.user_id, USER_ID);
  assert.ok(supabase.calls.some((c) => c.table === 'lists' && c.single === 'maybe'));
  assert.ok(supabase.calls.some((c) => c.table === 'list_items'));
  assert.ok(supabase.calls.some((c) => c.rpc === 'list_members_with_profiles'));
  assert.ok(supabase.calls.some((c) => c.rpc === 'list_manage_owner_profile'));
});

test('addRestaurantToLists: min-sort and existing-row selects both run', async () => {
  authUser = { id: USER_ID };
  resetSideEffects();
  supabase = makeSupabaseMock((ctx) => {
    if (ctx.table === 'list_items' && ctx.op === 'select' && String(ctx.select).includes('sort_order')) {
      return { data: [{ list_id: LIST_ID, sort_order: 1 }], error: null };
    }
    if (ctx.table === 'list_items' && ctx.op === 'select') {
      return { data: [], error: null };
    }
    if (ctx.table === 'list_items' && ctx.op === 'upsert') {
      return { data: null, error: null };
    }
    if (ctx.table === 'lists' && ctx.op === 'update') {
      return { data: null, error: null };
    }
    return { data: null, error: null };
  });
  const out = await addRestaurantToLists(RESTAURANT_ID, [LIST_ID]);
  assert.deepEqual(out, { error: null });
  const selects = supabase.calls.filter((c) => c.table === 'list_items' && c.op === 'select');
  assert.equal(selects.length, 2);
  assert.ok(selects.some((c) => String(c.select).includes('sort_order')));
  assert.ok(selects.some((c) => c.filter.restaurant_id === RESTAURANT_ID));
});

test('list collaboration: unauthorized invites/accept/decline/remove skip RPCs', async () => {
  authUser = null;
  supabase = makeSupabaseMock(() => ({ data: null, error: null }));
  assert.deepEqual(await inviteToList(LIST_ID, OTHER_USER_ID, 'editor'), { error: 'unauthorized' });
  assert.deepEqual(await acceptListInvite(LIST_ID), { error: 'unauthorized' });
  assert.deepEqual(await declineListInvite(LIST_ID), { error: 'unauthorized' });
  assert.deepEqual(await removeListMember(LIST_ID, OTHER_USER_ID), { error: 'unauthorized' });
  assert.deepEqual(await approveListJoinRequest(LIST_ID, OTHER_USER_ID, 'viewer'), {
    error: 'unauthorized',
  });
  assert.deepEqual(await rejectListJoinRequest(LIST_ID, OTHER_USER_ID), { error: 'unauthorized' });
  assert.deepEqual(await setListMemberRole(LIST_ID, OTHER_USER_ID, 'editor'), {
    error: 'unauthorized',
  });
  assert.equal(
    supabase.calls.some((c) => c.kind === 'rpc'),
    false
  );

  authUser = { id: USER_ID };
  supabase = makeSupabaseMock((ctx) => {
    if (ctx.rpc === 'invite_to_list') {
      return { data: null, error: { message: 'already_member' } };
    }
    return { data: null, error: null };
  });
  assert.deepEqual(await inviteToList(LIST_ID, OTHER_USER_ID, 'viewer'), {
    error: 'already_member',
  });

  supabase = makeSupabaseMock(() => ({ data: null, error: null }));
  assert.deepEqual(await acceptListInvite(LIST_ID), { error: null });
  assert.deepEqual(await declineListInvite(LIST_ID), { error: null });
  assert.deepEqual(await approveListJoinRequest(LIST_ID, OTHER_USER_ID, 'editor'), { error: null });
  assert.deepEqual(await rejectListJoinRequest(LIST_ID, OTHER_USER_ID), { error: null });
  assert.deepEqual(await setListMemberRole(LIST_ID, OTHER_USER_ID, 'viewer'), { error: null });
  assert.deepEqual(await removeListMember(LIST_ID, OTHER_USER_ID), { error: null });
  assert.equal(
    supabase.calls.filter((c) => c.kind === 'rpc').map((c) => c.rpc).sort().join(','),
    [
      'accept_list_invite',
      'approve_list_join_request',
      'decline_list_invite',
      'reject_list_join_request',
      'remove_list_member',
      'set_list_member_role',
    ].join(',')
  );
});

test('hub/map/mentions remaining exports: unauthorized, empty input, slim RPC mapping', async () => {
  resetSideEffects();
  authUser = null;
  supabase = makeSupabaseMock(() => ({ data: null, error: null }));
  assert.deepEqual(await fetchOwnedListsForBilling(), { lists: [], error: 'unauthorized' });
  assert.deepEqual(await updateListMeta(LIST_ID, { name: 'x' }), { error: 'unauthorized' });
  assert.deepEqual(await addListItem(LIST_ID, RESTAURANT_ID), { error: 'unauthorized' });
  assert.deepEqual(await restaurantInMyLists(RESTAURANT_ID), {
    listIds: [],
    lists: [],
    error: null,
  });
  assert.deepEqual(await fetchListSummariesForViewer([LIST_ID]), { lists: [], error: null });
  assert.deepEqual(await listIdsByRestaurantIdsForUser([RESTAURANT_ID]), { map: {}, error: null });
  assert.deepEqual(await fetchMyOwnedListsForMapDropdown(), { lists: [], error: null });
  assert.deepEqual(await fetchMyCollaboratorListsForMapDropdown(), { lists: [], error: null });
  assert.deepEqual(await fetchFollowingListsForMapDropdown(), { lists: [], error: null });
  assert.deepEqual(await fetchSavedRestaurantsForMapByListIds([]), { restaurants: [], error: null });
  assert.deepEqual(await fetchFollowingRestaurantsForMapByListIds([LIST_ID]), {
    restaurants: [],
    error: null,
  });
  assert.deepEqual(await fetchFollowingListOwnersForRestaurants([RESTAURANT_ID]), {
    map: {},
    error: null,
  });
  assert.deepEqual(await fetchViewerFollowingOwnersMap(), {
    map: {},
    complete: false,
    error: null,
  });
  assert.deepEqual(await fetchFollowCircleForRestaurant(''), { circle: null, error: null });
  assert.deepEqual(await fetchFollowCircleForRestaurant(RESTAURANT_ID), { circle: null, error: null });
  assert.deepEqual(await fetchViewerFollowingIds(), new Set());
  assert.deepEqual(await fetchPublicListItemsForRestaurant(''), []);
  assert.deepEqual(await resolveUsernameToUserId('  '), { userId: null, error: 'invalid' });
  assert.deepEqual(await fetchPublicProfileActivityPage(''), { activity: [], error: 'invalid' });
  assert.deepEqual(await fetchViewerSavedListMap(), { map: {}, complete: false, error: null });
  assert.deepEqual(await fetchListMembershipForViewer(LIST_ID), {
    isOwner: false,
    isEditor: false,
    isMember: false,
    pending: null,
    error: null,
  });
  assert.deepEqual(await removeRestaurantFromList(LIST_ID, RESTAURANT_ID), { error: 'unauthorized' });

  authUser = { id: USER_ID };
  supabase = makeSupabaseMock((ctx) => {
    if (ctx.table === 'lists' && ctx.single === 'maybe') {
      if (ctx.filter.id === LIST_B_ID) {
        return { data: { id: LIST_B_ID, user_id: OTHER_USER_ID, visibility: 'private' }, error: null };
      }
      return {
        data: {
          id: LIST_ID,
          user_id: USER_ID,
          name: 'Dinner',
          description: 'd',
          cover_image_url: null,
          visibility: 'public',
          published_at: '2026-01-01',
          slug: 'dinner',
        },
        error: null,
      };
    }
    if (ctx.rpc === 'published_list_owner' || ctx.rpc === 'list_owner_snapshot') {
      return { data: [{ display_name: 'Ada', username: 'ada' }], error: null };
    }
    if (ctx.rpc === 'map_my_owned_lists') {
      return {
        data: [{ id: LIST_ID, name: 'Dinner', item_count: 3n, owner_username: 'ada' }],
        error: null,
      };
    }
    if (ctx.rpc === 'map_my_collaborator_lists') {
      return {
        data: [{ id: LIST_B_ID, name: 'Shared', item_count: '2', owner_username: 'ada' }],
        error: null,
      };
    }
    if (ctx.rpc === 'map_following_lists') {
      return { data: [], error: null };
    }
    if (ctx.rpc === 'resolve_user_id_from_username') {
      return { data: OTHER_USER_ID, error: null };
    }
    if (ctx.rpc === 'public_profile_activity') {
      return { data: [], error: null };
    }
    if (ctx.rpc === 'restaurant_follow_circle_for_viewer') {
      return { data: { you: true, people: [] }, error: null };
    }
    if (ctx.table === 'list_items' && ctx.op === 'insert') {
      return { data: ctx.payload, error: null };
    }
    if (ctx.table === 'list_items') {
      return {
        data: [
          {
            id: ITEM_ID,
            list_id: LIST_ID,
            restaurant_id: RESTAURANT_ID,
            lists: { visibility: 'public' },
          },
        ],
        error: null,
      };
    }
    if (ctx.table === 'lists' && ctx.op === 'update') {
      return { data: { id: LIST_ID }, error: null };
    }
    if (ctx.table === 'lists') {
      return { data: [{ id: LIST_ID, name: 'Dinner', user_id: USER_ID }], error: null };
    }
    if (ctx.table === 'user_follows') {
      return { data: [{ following_id: OTHER_USER_ID }], error: null };
    }
    if (ctx.table === 'restaurants') {
      return { data: [{ id: RESTAURANT_ID, name: 'Spot', address: 'Lisboa' }], error: null };
    }
    return { data: [], error: null };
  });

  const billing = await fetchOwnedListsForBilling();
  assert.equal(billing.error, null);
  assert.equal(billing.lists[0].id, LIST_ID);

  assert.equal((await updateListMeta(LIST_B_ID, { name: 'Nope' })).error, 'forbidden');
  assert.deepEqual(await updateListMeta(LIST_ID, { name: 'Dinner' }), { error: null });
  assert.deepEqual(await addListItem(LIST_ID, RESTAURANT_ID), { error: null });

  const owned = await fetchMyOwnedListsForMapDropdown();
  assert.equal(owned.lists[0].item_count, 3);
  assert.deepEqual(await fetchViewerFollowingOwnersMap(), { map: {}, complete: true, error: null });
  assert.deepEqual(await fetchSavedRestaurantsForMapByListIds([LIST_B_ID]), {
    restaurants: [],
    error: null,
  });

  const meta = await fetchListMetadata(LIST_ID);
  assert.equal(meta.name, 'Dinner');
  assert.equal(meta.ownerUsername, 'ada');
  assert.equal(await fetchListMetadata(LIST_B_ID), null);

  assert.deepEqual(await resolveUsernameToUserId('@ada'), { userId: OTHER_USER_ID, error: null });
  assert.deepEqual(await fetchPublicProfileActivityPage(OTHER_USER_ID), {
    activity: [],
    error: null,
  });
  const publicItems = await fetchPublicListItemsForRestaurant(RESTAURANT_ID);
  assert.equal(publicItems.length, 1);
  const followingIds = await fetchViewerFollowingIds();
  assert.equal(followingIds.has(OTHER_USER_ID), true);
  const circle = await fetchFollowCircleForRestaurant(RESTAURANT_ID);
  assert.equal(circle.error, null);

  const membership = await fetchListMembershipForViewer(LIST_ID);
  assert.equal(membership.isOwner, true);
  const saved = await fetchViewerSavedListMap();
  assert.equal(saved.complete, true);
  assert.equal(saved.map[RESTAURANT_ID]?.includes(LIST_ID), true);
  assert.deepEqual(await removeRestaurantFromList(LIST_ID, RESTAURANT_ID), { error: null });
  const picker = await searchRestaurantsForPicker('Sp');
  assert.equal(picker.restaurants[0].id, RESTAURANT_ID);

  const mine = await restaurantInMyLists(RESTAURANT_ID);
  assert.equal(mine.error, null);
  assert.equal(mine.listIds.includes(LIST_ID), true);
  const summaries = await fetchListSummariesForViewer([LIST_ID]);
  assert.equal(summaries.lists[0].name, 'Dinner');
  const savedByRestaurant = await listIdsByRestaurantIdsForUser([RESTAURANT_ID]);
  assert.equal(savedByRestaurant.map[RESTAURANT_ID]?.includes(LIST_ID), true);
  const collab = await fetchMyCollaboratorListsForMapDropdown();
  assert.equal(collab.lists[0].id, LIST_B_ID);
  assert.equal(collab.lists[0].item_count, 2);
});

test('map by list ids: admin list_items intersect saved/following RPC pins', async () => {
  resetSideEffects();
  authUser = { id: USER_ID };
  adminListItemsResult = {
    data: [{ restaurant_id: RESTAURANT_ID }, { restaurant_id: 'not-on-map' }],
    error: null,
  };
  supabase = makeSupabaseMock((ctx) => {
    if (ctx.rpc === 'map_my_owned_lists') {
      return { data: [{ id: LIST_ID, name: 'Dinner' }], error: null };
    }
    if (ctx.rpc === 'map_my_collaborator_lists') {
      return { data: [], error: null };
    }
    if (ctx.rpc === 'map_following_lists') {
      return { data: [{ id: LIST_B_ID, name: 'Ada dinner' }], error: null };
    }
    if (ctx.rpc === 'saved_restaurants_for_map' || ctx.rpc === 'following_restaurants_for_map') {
      return {
        data: [
          mapRestaurantRow(),
          mapRestaurantRow({ id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', name: 'Other' }),
        ],
        error: null,
      };
    }
    return { data: [], error: null };
  });

  const saved = await fetchSavedRestaurantsForMapByListIds([LIST_ID, 'not-accessible']);
  assert.equal(saved.error, null);
  assert.equal(saved.restaurants.length, 1);
  assert.equal(saved.restaurants[0].id, RESTAURANT_ID);
  assert.equal(saved.restaurants[0].name, 'Spot');

  const following = await fetchFollowingRestaurantsForMapByListIds([LIST_B_ID]);
  assert.equal(following.error, null);
  assert.equal(following.restaurants.length, 1);
  assert.equal(following.restaurants[0].id, RESTAURANT_ID);

  adminListItemsResult = { data: null, error: { message: 'admin_down' } };
  assert.deepEqual(await fetchSavedRestaurantsForMapByListIds([LIST_ID]), {
    restaurants: [],
    error: 'admin_down',
  });
});

test('following list owners: RPC lists + items + profiles map onto restaurant ids', async () => {
  resetSideEffects();
  authUser = { id: USER_ID };
  supabase = makeSupabaseMock((ctx) => {
    if (ctx.rpc === 'map_following_lists') {
      return { data: [{ id: LIST_B_ID, name: 'Ada dinner' }], error: null };
    }
    if (ctx.rpc === 'map_following_owner_profiles') {
      return {
        data: [
          {
            id: OTHER_USER_ID,
            display_name: 'Ada',
            username: 'ada',
            avatar_url: 'https://img.example/ada.png',
          },
        ],
        error: null,
      };
    }
    if (ctx.table === 'lists') {
      return { data: [{ id: LIST_B_ID, user_id: OTHER_USER_ID }], error: null };
    }
    if (ctx.table === 'list_items') {
      return {
        data: [{ restaurant_id: RESTAURANT_ID, list_id: LIST_B_ID }],
        error: null,
      };
    }
    return { data: [], error: null };
  });

  const owners = await fetchFollowingListOwnersForRestaurants([RESTAURANT_ID]);
  assert.equal(owners.error, null);
  assert.equal(owners.map[RESTAURANT_ID][0].userId, OTHER_USER_ID);
  assert.equal(owners.map[RESTAURANT_ID][0].displayName, 'Ada');
  assert.equal(owners.map[RESTAURANT_ID][0].username, 'ada');

  const complete = await fetchViewerFollowingOwnersMap();
  assert.equal(complete.error, null);
  assert.equal(complete.complete, true);
  assert.equal(complete.map[RESTAURANT_ID][0].username, 'ada');
});

test('following map dropdown maps RPC rows including string item_count', async () => {
  authUser = { id: USER_ID };
  supabase = makeSupabaseMock((ctx) => {
    if (ctx.rpc === 'map_following_lists') {
      return {
        data: [
          { id: LIST_B_ID, name: 'Ada dinner', item_count: '4', owner_username: 'ada' },
          { id: '  ', name: 'skip' },
        ],
        error: null,
      };
    }
    return { data: [], error: null };
  });
  const following = await fetchFollowingListsForMapDropdown();
  assert.equal(following.error, null);
  assert.equal(following.lists.length, 1);
  assert.equal(following.lists[0].id, LIST_B_ID);
  assert.equal(following.lists[0].item_count, 4);
});
});
