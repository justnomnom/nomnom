/**
 * Unauthenticated / invalid-input gates for feature server actions (TEST-PLAN O9 + feature coverage).
 */
import assert from 'node:assert/strict';
import { describe, mock, test } from 'node:test';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const LIST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RESTAURANT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const TAG_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

/** @type {object | null} */
let authUser = { id: USER_ID, email: 'a@b.co' };
/** @type {ReturnType<typeof makeSupabaseMock> | null} */
let supabase = null;

mock.module('src/libs/supabase/supabase-server-client.js', {
  exports: {
    createSupabaseServerClient: async () => supabase,
    getSupabaseAuthUser: async () => ({ data: { user: authUser }, error: authUser ? null : new Error('no session') }),
  },
});

mock.module('next/cache', {
  exports: {
    revalidatePath() {},
  },
});

mock.module('next/headers', {
  exports: {
    headers: async () => ({
      get: () => null,
    }),
  },
});

mock.module('src/libs/notifications/list-live-update-notify.js', {
  exports: {
    notifyLiveListSubscribers: async () => {},
  },
});

mock.module('src/libs/dish-tags/dish-tag-resolve.js', {
  exports: {
    fetchDishTagsCatalog: async () => [],
    fetchDishTagsForRestaurant: async () => [{ id: TAG_ID, label: 'Pastel de nata', sort_order: 1 }],
    matchRestaurantDishTag: async () => null,
    sortDishCatalogRows: (rows) => rows,
  },
});

/** @type {object | null} */
let stripeClient = null;

mock.module('src/libs/stripe/stripe-server.js', {
  exports: {
    getStripe: () => stripeClient,
  },
});

mock.module('src/libs/notifications/create-notification.js', {
  exports: {
    insertNotifications: async () => {},
    normalizeNotificationRecipientIds: (ids) =>
      [...new Set((ids || []).filter(Boolean).map(String))],
  },
});

mock.module('src/libs/email/subscription-cancelled-email.js', {
  exports: {
    sendSubscriptionCancelledEmail: async () => {},
    listNameFromSubscriptionRow: (row) => row?.lists?.name ?? '',
  },
});

/** Admin `users` rows for subscriber profile lookup (mutable). */
let adminUsersResult = { data: null, error: null };

mock.module('src/libs/supabase/supabase-admin.js', {
  exports: {
    supabaseAdminClient: {
      from(table) {
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
          delete() {
            return this;
          },
          upsert() {
            return this;
          },
          maybeSingle: async () =>
            table === 'users' ? adminUsersResult : { data: null, error: null },
          then(resolve, reject) {
            const result = table === 'users' ? adminUsersResult : { data: null, error: null };
            return Promise.resolve(result).then(resolve, reject);
          },
        };
      },
      auth: {
        admin: {
          getUserById: async () => ({ data: { user: null } }),
          deleteUser: async () => ({ data: null, error: null }),
        },
      },
    },
  },
});

const { fetchMySystemListIds, fetchMyVisitedRestaurantIds, fetchMyVisitSummary } = await import(
  '../actions/visit-actions.js'
);
const { setNotificationMute } = await import('../actions/notification-mutes-actions.js');
const { getMyNotificationPreferences, updateMyNotificationPreferences } = await import(
  '../actions/notification-preferences-actions.js'
);
const { setFollowUser, fetchViewerFollowsUser, getMyProfile, updateMyProfile, getMyFollowers, getMyFollowing } =
  await import('../actions/profile-actions.js');
const {
  previewGoogleMapsImport,
  commitGoogleMapsImport,
} = await import('../actions/google-maps-import-actions.js');
const {
  getOnboardingStatus,
  saveUserRestaurantTagPreferences,
  completeOnboarding,
  saveOnboardingFollows,
  saveOnboardingLocation,
  getUserRestaurantTagPreferences,
} = await import('../actions/onboarding-actions.js');
const { fetchSuggestedCreatorsForMunicipality } = await import(
  '../actions/suggested-creators-actions.js'
);
const { getMyStripeConnectStatus, syncSubscriberListsBundlePrice } = await import(
  '../actions/stripe-list-actions.js'
);
const { getMyPaidListSubscribers, cancelSubscriberListSubscription, cancelMyCreatorSubscription, getCreatorListStats, getMyActiveSubscriptions } =
  await import('../actions/creator-subscribers-actions.js');
const { getOrCreateCustomer, deleteAccount, ensureUserRecord } = await import(
  '../actions/auth-actions.js'
);
const {
  fetchRestaurantDishSuggestions,
  fetchUserMustTryDishTags,
  fetchMyMustTryDraftForRestaurant,
  upsertMustTryDishesForRestaurantLists,
} = await import('../actions/must-try-actions.js');
const {
  loadDiscoverPageData,
  syncDiscoverHomeFromDevice,
  syncDiscoverHomeToFallbackMarket,
  updateDiscoverHomeMarket,
} = await import('../actions/discover-actions.js');
const {
  fetchRestaurantsForHomeLocality,
  fetchUserHomeLocalityId,
  fetchRestaurantsInBbox,
  fetchCircleRestaurantIds,
  fetchLocationLocalities,
  fetchRestaurantPinsInBbox,
  fetchPublicLisboaRouletteRestaurantIds,
  searchRestaurantsByName,
  fetchRestaurantTagsCatalog,
  fetchMapSpotDetailById,
} = await import('../actions/location-actions.js');

/**
 * @param {(ctx: object) => object | Promise<object>} handler
 */
function makeSupabaseMock(handler) {
  const calls = [];

  function resolve(ctx) {
    calls.push(ctx);
    return Promise.resolve(handler(ctx)).then((result) => {
      if (result && typeof result === 'object' && ('data' in result || 'error' in result || 'ok' in result)) {
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
      inFilter: undefined,
    };
    const api = {
      select(...args) {
        ctx.select = args[0];
        if (ctx.op !== 'update' && ctx.op !== 'delete' && ctx.op !== 'upsert' && ctx.op !== 'insert') {
          ctx.op = 'select';
        }
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
      in(col, vals) {
        ctx.inFilter = { col, vals };
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
      gte() {
        return api;
      },
      lte() {
        return api;
      },
      not() {
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
    auth: {
      updateUser: async () => ({ data: { user: authUser }, error: null }),
    },
  };
}

describe('feature server actions — auth and validation gates', { concurrency: false }, () => {
  test('visit: unauthorized without a session', async () => {
    authUser = null;
    supabase = makeSupabaseMock(() => ({ data: null, error: null }));
    assert.deepEqual(await fetchMySystemListIds(), {
      visited: null,
      must_go: null,
      error: 'unauthorized',
    });
    assert.deepEqual(await fetchMyVisitSummary(), { saved: 0, visited: 0, error: 'unauthorized' });
    assert.equal(supabase.calls.length, 0);
  });

  test('visit: system_key 42703 retries without the column; visited ids de-dupe', async () => {
    authUser = { id: USER_ID };
    let listsSelects = 0;
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'lists' && ctx.op === 'select') {
        listsSelects += 1;
        if (String(ctx.select).includes('system_key') && listsSelects === 1) {
          return { data: null, error: { message: 'column', code: '42703' } };
        }
        return {
          data: [
            { id: LIST_ID, name: 'Visited', created_at: '2026-01-01', system_key: 'visited' },
          ],
          error: null,
        };
      }
      if (ctx.table === 'list_items' && ctx.op === 'select') {
        return {
          data: [
            { restaurant_id: RESTAURANT_ID },
            { restaurant_id: RESTAURANT_ID },
            { restaurant_id: null },
          ],
          error: null,
        };
      }
      return { data: null, error: null };
    });
    const ids = await fetchMySystemListIds();
    assert.equal(ids.error, null);
    assert.equal(ids.visited, LIST_ID);
    const visited = await fetchMyVisitedRestaurantIds();
    assert.deepEqual(visited.restaurantIds, [RESTAURANT_ID]);
  });

  test('visit summary: distinct saved spots and visited overlap', async () => {
    authUser = { id: USER_ID };
    const extraRestaurant = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'lists') {
        return {
          data: [
            { id: LIST_ID, name: 'Visited', created_at: '2026-01-01', system_key: 'visited' },
          ],
          error: null,
        };
      }
      if (ctx.table === 'list_items') {
        if (ctx.filter.list_id === LIST_ID) {
          return { data: [{ restaurant_id: RESTAURANT_ID }], error: null };
        }
        return {
          data: [{ restaurant_id: RESTAURANT_ID }, { restaurant_id: extraRestaurant }],
          error: null,
        };
      }
      return { data: null, error: null };
    });
    const summary = await fetchMyVisitSummary();
    assert.equal(summary.error, null);
    assert.equal(summary.saved, 2);
    assert.equal(summary.visited, 1);
  });

  test('visit: missing Visited list is empty; list_items / owned-lists errors surface', async () => {
    authUser = { id: USER_ID };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'lists') {
        return {
          data: [{ id: LIST_ID, name: 'Must go', created_at: '2026-01-01', system_key: 'must_go' }],
          error: null,
        };
      }
      return { data: null, error: { message: 'should_not_query_items' } };
    });
    assert.deepEqual(await fetchMyVisitedRestaurantIds(), { restaurantIds: [], error: null });

    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'lists') {
        return {
          data: [{ id: LIST_ID, name: 'Visited', created_at: '2026-01-01', system_key: 'visited' }],
          error: null,
        };
      }
      if (ctx.table === 'list_items') {
        return { data: null, error: { message: 'items_down' } };
      }
      return { data: null, error: null };
    });
    assert.deepEqual(await fetchMyVisitedRestaurantIds(), { restaurantIds: [], error: 'items_down' });

    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'lists' && ctx.select === 'id') {
        return { data: null, error: { message: 'owned_lists_down' } };
      }
      if (ctx.table === 'lists') {
        return { data: [], error: null };
      }
      return { data: null, error: null };
    });
    assert.deepEqual(await fetchMyVisitSummary(), { saved: 0, visited: 0, error: 'owned_lists_down' });

    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'lists' && ctx.select === 'id') {
        return { data: [], error: null };
      }
      if (ctx.table === 'lists') {
        return { data: [], error: null };
      }
      return { data: null, error: null };
    });
    assert.deepEqual(await fetchMyVisitSummary(), { saved: 0, visited: 0, error: null });
  });

  test('paid list subscribers: maps list names and admin profiles', async () => {
    adminUsersResult = {
      data: [
        {
          id: OTHER_ID,
          username: 'ada',
          display_name: 'Ada',
          avatar_url: 'https://img.example/ada.png',
        },
      ],
      error: null,
    };
    authUser = { id: USER_ID };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'lists') {
        return { data: [{ id: LIST_ID, name: 'Dinner' }], error: null };
      }
      if (ctx.table === 'list_subscriptions') {
        return {
          data: [
            {
              id: 'sub-1',
              list_id: LIST_ID,
              subscriber_user_id: OTHER_ID,
              status: 'active',
              current_period_end: '2026-09-01',
              cancel_at_period_end: false,
              created_at: '2026-08-01',
              stripe_subscription_id: 'sub_x',
              stripe_connect_account_id: 'acct_x',
            },
          ],
          error: null,
        };
      }
      return { data: [], error: null };
    });
    try {
      const out = await getMyPaidListSubscribers();
      assert.equal(out.error, null);
      assert.equal(out.rows[0].list_name, 'Dinner');
      assert.equal(out.rows[0].subscriber.username, 'ada');
    } finally {
      adminUsersResult = { data: null, error: null };
    }
  });

  test('notification mute: unauthorized / invalid target / mute insert + unmute delete', async () => {
    authUser = null;
    supabase = makeSupabaseMock(() => ({ data: null, error: null }));
    assert.deepEqual(await setNotificationMute('list', LIST_ID, true), { error: 'unauthorized' });

    authUser = { id: USER_ID };
    assert.deepEqual(await setNotificationMute('restaurant', LIST_ID, true), { error: 'invalid' });

    supabase = makeSupabaseMock((ctx) => {
      if (ctx.op === 'insert') return { data: ctx.payload, error: { code: '23505', message: 'dup' } };
      return { data: null, error: null };
    });
    assert.deepEqual(await setNotificationMute('list', LIST_ID, true), { ok: true });
    assert.deepEqual(await setNotificationMute('creator', OTHER_ID, false), { ok: true });
    assert.equal(
      supabase.calls.some((c) => c.op === 'delete' && c.filter.target_id === OTHER_ID),
      true
    );
  });

  test('notification prefs: unauthorized; empty patch is a no-op; upsert writes booleans', async () => {
    authUser = null;
    supabase = makeSupabaseMock(() => ({ data: null, error: null }));
    const unauth = await getMyNotificationPreferences();
    assert.equal(unauth.error, 'unauthorized');
    assert.equal(unauth.list_updates_in_app, true);
    assert.deepEqual(await updateMyNotificationPreferences({ list_updates_email: true }), {
      error: 'unauthorized',
    });

    authUser = { id: USER_ID };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'notification_preferences' && ctx.op === 'select') {
        return { data: null, error: null };
      }
      return { data: ctx.payload ?? null, error: null };
    });
    const defaults = await getMyNotificationPreferences();
    assert.equal(defaults.error, null);
    assert.equal(defaults.list_updates_email, false);
    assert.deepEqual(await updateMyNotificationPreferences({ nope: true }), { error: null });
    const saved = await updateMyNotificationPreferences({ list_updates_email: true });
    assert.deepEqual(saved, { error: null });
    assert.equal(
      supabase.calls.some((c) => c.op === 'upsert' && c.payload.list_updates_email === true),
      true
    );
  });

  test('follow: cannot follow self; unauthorized; duplicate insert is ok', async () => {
    authUser = null;
    supabase = makeSupabaseMock(() => ({ data: null, error: null }));
    assert.deepEqual(await setFollowUser(OTHER_ID, true), { error: 'Unauthorized' });
    assert.deepEqual(await fetchViewerFollowsUser(OTHER_ID), { following: false });

    authUser = { id: USER_ID };
    assert.deepEqual(await setFollowUser(USER_ID, true), { error: 'invalid' });
    assert.deepEqual(await fetchViewerFollowsUser(USER_ID), { following: false });

    supabase = makeSupabaseMock((ctx) => {
      if (ctx.op === 'insert') return { data: null, error: { code: '23505', message: 'dup' } };
      if (ctx.op === 'select') return { data: { follower_id: USER_ID }, error: null };
      return { data: null, error: null };
    });
    assert.deepEqual(await setFollowUser(OTHER_ID, true), { ok: true });
    assert.deepEqual(await fetchViewerFollowsUser(OTHER_ID), { following: true });
    assert.deepEqual(await setFollowUser(OTHER_ID, false), { ok: true });
  });

  test('google maps import: unauthorized, missing/invalid url, commit needs restaurants', async () => {
    authUser = null;
    supabase = makeSupabaseMock(() => ({ data: null, error: null }));
    assert.equal((await previewGoogleMapsImport('https://maps.app.goo.gl/x')).error, 'unauthorized');
    assert.equal((await commitGoogleMapsImport({ restaurantIds: [RESTAURANT_ID] })).error, 'unauthorized');

    authUser = { id: USER_ID };
    assert.equal((await previewGoogleMapsImport('')).error, 'missing_url');
    assert.equal((await previewGoogleMapsImport('https://evil.example/maps')).error, 'invalid_url');
    assert.equal((await commitGoogleMapsImport({ restaurantIds: [] })).error, 'no_restaurants');
    assert.equal((await commitGoogleMapsImport({ restaurantIds: [RESTAURANT_ID] })).error, 'missing_name');

    const prevFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error('network');
    };
    try {
      assert.equal(
        (await previewGoogleMapsImport('https://maps.app.goo.gl/xyz')).error,
        'fetch_failed'
      );
    } finally {
      globalThis.fetch = prevFetch;
    }
  });

  test('onboarding: unauthorized status / tag save / complete', async () => {
    authUser = null;
    supabase = makeSupabaseMock(() => ({ data: null, error: null }));
    assert.deepEqual(await getOnboardingStatus(), { completed: false, error: 'unauthorized' });
    assert.deepEqual(await saveUserRestaurantTagPreferences([TAG_ID]), { error: 'Unauthorized' });
    assert.deepEqual(await completeOnboarding(), { error: 'Unauthorized' });
    assert.deepEqual(await saveOnboardingFollows([OTHER_ID]), { error: 'Unauthorized' });
  });

  test('onboarding status: users row error surfaces', async () => {
    authUser = { id: USER_ID };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'users') {
        return { data: null, error: { message: 'users_down' } };
      }
      return { data: null, error: null };
    });
    assert.deepEqual(await getOnboardingStatus(), { completed: false, error: 'users_down' });
  });

  test('onboarding status: completed_at is treated as done', async () => {
    authUser = { id: USER_ID };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'users') {
        return { data: { onboarding_completed_at: '2026-01-01T00:00:00Z' }, error: null };
      }
      return { data: null, error: null };
    });
    assert.deepEqual(await getOnboardingStatus(), { completed: true });
  });

  test('O7 suggested creators: RPC rows map to display fields; empty list and RPC error surface', async () => {
    authUser = { id: USER_ID };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.rpc === 'get_suggested_creators_for_municipality') {
        return {
          data: [
            {
              user_id: OTHER_ID,
              display_name: '  Ada  ',
              username: 'ada',
              subtitle: '  Lisbon  ',
              avatar_url: ' https://img  ',
            },
            { user_id: LIST_ID, display_name: null, username: 'bob', subtitle: null, avatar_url: null },
          ],
          error: null,
        };
      }
      return { data: null, error: null };
    });
    const ok = await fetchSuggestedCreatorsForMunicipality('lisboa', 5);
    assert.equal(ok.error, undefined);
    assert.equal(ok.creators[0].name, 'Ada');
    assert.equal(ok.creators[0].subtitle, 'Lisbon');
    assert.equal(ok.creators[1].name, 'bob');
    assert.equal(ok.creators[1].subtitle, '@bob');

    supabase = makeSupabaseMock((ctx) => {
      if (ctx.rpc === 'get_suggested_creators_for_municipality') {
        return { data: null, error: { message: 'rpc_down' } };
      }
      return { data: null, error: null };
    });
    const fail = await fetchSuggestedCreatorsForMunicipality('');
    assert.deepEqual(fail, { creators: [], error: 'rpc_down' });

    supabase = makeSupabaseMock((ctx) => {
      if (ctx.rpc === 'get_suggested_creators_for_municipality') {
        return { data: [], error: null };
      }
      return { data: null, error: null };
    });
    assert.deepEqual(await fetchSuggestedCreatorsForMunicipality('lisboa'), { creators: [] });
  });

  test('stripe connect status + bundle price: unauthorized / stripe_not_configured', async () => {
    stripeClient = null;
    authUser = null;
    supabase = makeSupabaseMock(() => ({ data: null, error: null }));
    assert.deepEqual(await getMyStripeConnectStatus(), { error: 'unauthorized' });
    assert.deepEqual(await syncSubscriberListsBundlePrice({ monthlyAmountCents: 499 }), {
      error: 'stripe_not_configured',
    });
  });

  test('stripe connect status reads DB flags; bundle price gates connect + published lists', async () => {
    stripeClient = {
      accounts: {
        retrieve: async () => ({ charges_enabled: true, payouts_enabled: true }),
      },
    };
    authUser = { id: USER_ID };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'customers') {
        return {
          data: {
            stripe_connect_account_id: 'acct_123',
            stripe_connect_charges_enabled: true,
            stripe_connect_payouts_enabled: false,
          },
          error: null,
        };
      }
      if (ctx.table === 'lists') {
        return { data: [], error: null };
      }
      return { data: null, error: null };
    });
    const status = await getMyStripeConnectStatus();
    assert.equal(status.accountId, 'acct_123');
    assert.equal(status.chargesEnabled, true);
    assert.equal(status.payoutsEnabled, true);

    stripeClient = { prices: {} };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'customers') {
        return { data: { stripe_connect_account_id: null }, error: null };
      }
      return { data: [], error: null };
    });
    assert.deepEqual(await syncSubscriberListsBundlePrice({ monthlyAmountCents: 499 }), {
      error: 'connect_account_required',
    });

    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'customers') {
        return {
          data: {
            stripe_connect_account_id: 'acct_123',
            stripe_connect_charges_enabled: false,
          },
          error: null,
        };
      }
      return { data: [], error: null };
    });
    assert.deepEqual(await syncSubscriberListsBundlePrice({ monthlyAmountCents: 499 }), {
      error: 'connect_onboarding_incomplete',
    });

    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'customers') {
        return {
          data: {
            stripe_connect_account_id: 'acct_123',
            stripe_connect_charges_enabled: true,
          },
          error: null,
        };
      }
      if (ctx.table === 'lists') {
        return {
          data: [{ id: LIST_ID, published_at: null, visibility: 'public' }],
          error: null,
        };
      }
      return { data: [], error: null };
    });
    assert.deepEqual(await syncSubscriberListsBundlePrice({ monthlyAmountCents: 499 }), {
      error: 'paid_requires_public_published',
    });
    stripeClient = null;
  });

  test('creator subscribers + getOrCreateCustomer unauthorized/mismatch', async () => {
    authUser = null;
    supabase = makeSupabaseMock(() => ({ data: null, error: null }));
    assert.deepEqual(await getMyPaidListSubscribers(), { error: 'unauthorized', rows: [] });
    assert.equal(await getOrCreateCustomer({ userId: USER_ID, email: 'a@b.co' }), null);
    assert.equal(await getOrCreateCustomer({ userId: '', email: 'a@b.co' }), null);

    authUser = { id: USER_ID, email: 'a@b.co' };
    assert.equal(await getOrCreateCustomer({ userId: OTHER_ID, email: 'a@b.co' }), null);
  });

  test('must-try: empty restaurant, unauthorized upsert, too_many, AI dishes de-dupe curated tags', async () => {
    authUser = { id: USER_ID };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'restaurants') {
        return {
          data: {
            metadata: {
              review_consensus: {
                signature_dishes: ['Pastel de nata', { label: 'Bifana' }, 'bifana', 12],
              },
            },
          },
          error: null,
        };
      }
      return { data: [], error: null };
    });
    assert.deepEqual(await fetchRestaurantDishSuggestions(''), { suggestions: [], error: null });
    const sug = await fetchRestaurantDishSuggestions(RESTAURANT_ID);
    assert.equal(sug.error, null);
    assert.equal(sug.suggestions[0].label, 'Pastel de nata');
    assert.equal(sug.suggestions[0].source, 'dish_tag');
    const ai = sug.suggestions.filter((s) => s.source === 'ai_consensus');
    assert.equal(ai.length, 1);
    assert.equal(ai[0].label, 'Bifana');

    authUser = null;
    assert.deepEqual(await fetchUserMustTryDishTags(), { tags: [], error: null });
    assert.deepEqual(await fetchMyMustTryDraftForRestaurant(RESTAURANT_ID), { picks: [], error: null });
    assert.deepEqual(
      await upsertMustTryDishesForRestaurantLists({
        restaurantId: RESTAURANT_ID,
        listIds: [LIST_ID],
        picks: [],
      }),
      { error: 'unauthorized' }
    );

    authUser = { id: USER_ID };
    const tooMany = Array.from({ length: 11 }, (_, i) => ({ suggestionId: null, label: `d${i}` }));
    assert.deepEqual(
      await upsertMustTryDishesForRestaurantLists({
        restaurantId: RESTAURANT_ID,
        listIds: [LIST_ID],
        picks: tooMany,
      }),
      { error: 'too_many' }
    );
    assert.deepEqual(
      await upsertMustTryDishesForRestaurantLists({ restaurantId: '', listIds: [LIST_ID], picks: [] }),
      { error: 'invalid' }
    );

    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'list_items') {
        return {
          data: [
            {
              id: LIST_ID,
              list_id: LIST_ID,
              list_item_must_try_dishes: [
                {
                  tag_id: TAG_ID,
                  label: 'Pastel de nata',
                  sort_order: 0,
                  tags: {
                    id: TAG_ID,
                    slug: 'pastel-de-nata',
                    label: 'Pastel de nata',
                    category: 'dish',
                    sort_order: 1,
                  },
                },
              ],
            },
          ],
          error: null,
        };
      }
      if (ctx.table === 'list_item_must_try_dishes') {
        return { data: null, error: null };
      }
      return { data: [], error: null };
    });
    const myTags = await fetchUserMustTryDishTags();
    assert.equal(myTags.error, null);
    assert.equal(myTags.tags[0].id, TAG_ID);
    const draft = await fetchMyMustTryDraftForRestaurant(RESTAURANT_ID);
    assert.deepEqual(draft.picks, [{ suggestionId: TAG_ID, label: 'Pastel de nata' }]);
    assert.deepEqual(
      await upsertMustTryDishesForRestaurantLists({
        restaurantId: RESTAURANT_ID,
        listIds: [LIST_ID],
        picks: [],
      }),
      { error: null }
    );
    assert.deepEqual(
      await upsertMustTryDishesForRestaurantLists({
        restaurantId: RESTAURANT_ID,
        listIds: [LIST_ID],
        picks: [{ suggestionId: null, label: 'Bifana' }],
      }),
      { error: null }
    );
    const dishInsert = supabase.calls.find(
      (c) => c.table === 'list_item_must_try_dishes' && c.op === 'insert'
    );
    assert.equal(dishInsert.payload[0].label, 'Bifana');
    assert.equal(dishInsert.payload[0].tag_id, null);
  });

  test('discover GPS home sync: unauthorized', async () => {
    authUser = null;
    supabase = makeSupabaseMock(() => ({ data: null, error: null }));
    assert.deepEqual(await syncDiscoverHomeFromDevice(-9.14, 38.72), {
      ok: false,
      error: 'Unauthorized',
    });
    assert.deepEqual(await syncDiscoverHomeToFallbackMarket(), {
      ok: false,
      error: 'Unauthorized',
    });
    assert.deepEqual(await updateDiscoverHomeMarket(LIST_ID), {
      ok: false,
      error: 'Unauthorized',
    });
  });

  test('discover GPS home sync: persists locality from locality_for_point', async () => {
    authUser = { id: USER_ID };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.rpc === 'locality_for_point') {
        return {
          data: {
            id: TAG_ID,
            locality_slug: 'lisbon',
            locality_name: 'Lisbon',
            country_name: 'Portugal',
          },
          error: null,
        };
      }
      if (ctx.table === 'user_location_follows') return { data: [], error: null };
      if (ctx.table === 'users' && ctx.op === 'update') return { data: { id: USER_ID }, error: null };
      return { data: [], error: null };
    });
    const out = await syncDiscoverHomeFromDevice(-9.14, 38.72);
    assert.equal(out.ok, true);
    assert.equal(out.localityId, TAG_ID);
    assert.equal(out.localityName, 'Lisbon');
  });

  test('profile / account deletion / ensureUserRecord: unauthorized or mismatch', async () => {
    authUser = null;
    supabase = makeSupabaseMock(() => ({ data: null, error: null }));
    assert.deepEqual(await getMyProfile(), { profile: null, error: 'Unauthorized' });
    assert.deepEqual(await deleteAccount(), { success: false, error: 'User not authenticated' });
    assert.equal(await ensureUserRecord({ id: USER_ID, email: 'a@b.co' }), null);
    assert.equal(await ensureUserRecord({ email: 'a@b.co' }), null);

    authUser = { id: USER_ID, email: 'a@b.co' };
    assert.equal(await ensureUserRecord({ id: OTHER_ID, email: 'a@b.co' }), null);
  });

  test('cancel subscriber: stripe_not_configured before id checks', async () => {
    authUser = { id: USER_ID };
    assert.deepEqual(await cancelSubscriberListSubscription(LIST_ID), {
      error: 'stripe_not_configured',
    });
    assert.deepEqual(await cancelMyCreatorSubscription(LIST_ID), {
      error: 'stripe_not_configured',
    });
  });

  test('discover page: unauthorized; saved home locality loads market + empty feed', async () => {
    authUser = null;
    supabase = makeSupabaseMock(() => ({ data: null, error: null }));
    const unauth = await loadDiscoverPageData();
    assert.equal(unauth.error, 'unauthorized');
    assert.deepEqual(unauth.restaurants, []);
    assert.deepEqual(unauth.suggestedCreators, []);

    authUser = { id: USER_ID };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'users' && ctx.single === 'maybe') {
        return { data: { home_locality_id: TAG_ID }, error: null };
      }
      if (ctx.table === 'cities' && ctx.single === 'maybe') {
        return {
          data: {
            name: 'Chiado',
            parent_municipality_id: OTHER_ID,
            parent_municipality: { name: 'Lisboa' },
          },
          error: null,
        };
      }
      if (ctx.rpc === 'discover_lists_leaderboard') {
        return {
          data: {
            interaction_leaders: [{ list_id: LIST_ID }],
            follower_leaders: [],
          },
          error: null,
        };
      }
      if (ctx.rpc === 'get_suggested_creators_for_municipality') {
        return {
          data: [{ user_id: OTHER_ID, username: 'ada', display_name: 'Ada' }],
          error: null,
        };
      }
      if (ctx.rpc === 'restaurants_for_municipality') {
        return { data: [], error: null };
      }
      return { data: [], error: null };
    });
    const page = await loadDiscoverPageData();
    assert.equal(page.error, null);
    assert.equal(page.marketLabel, 'Chiado');
    assert.equal(page.homeLocalityId, TAG_ID);
    assert.equal(page.homeMunicipalityId, OTHER_ID);
    assert.equal(page.isFallbackMarket, false);
    assert.equal(page.suggestedCreators[0].username, 'ada');
    assert.equal(page.listsLeaderboard.interaction_leaders.length, 1);
    assert.deepEqual(page.restaurants, []);
  });

  test('discover GPS fallback: no markets; empty home locality skips restaurants RPC', async () => {
    authUser = { id: USER_ID };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.rpc === 'list_location_localities') {
        return { data: [], error: null };
      }
      return { data: null, error: null };
    });
    assert.deepEqual(await syncDiscoverHomeToFallbackMarket(), {
      ok: false,
      error: 'no_markets',
    });
    assert.deepEqual(await fetchRestaurantsForHomeLocality(''), {
      restaurants: [],
      error: 'missing_home_locality',
    });
  });

  test('discover GPS fallback: first active market writes home_locality_id', async () => {
    authUser = { id: USER_ID };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.rpc === 'list_location_localities') {
        return { data: [{ id: TAG_ID, name: 'Chiado' }], error: null };
      }
      if (ctx.table === 'user_location_follows') return { data: [], error: null };
      if (ctx.table === 'users' && ctx.op === 'update') return { data: { id: USER_ID }, error: null };
      return { data: [], error: null };
    });
    assert.deepEqual(await syncDiscoverHomeToFallbackMarket(), { ok: true });
    const homeWrite = supabase.calls.find((c) => c.table === 'users' && c.op === 'update');
    assert.equal(homeWrite?.payload?.home_locality_id, TAG_ID);
  });

  test('profile: invalid username, unique violation, update success; followers unauthorized', async () => {
    authUser = { id: USER_ID, email: 'a@b.co' };
    supabase = makeSupabaseMock(() => ({ data: { id: USER_ID }, error: null }));
    const invalid = await updateMyProfile({ username: 'AB' });
    assert.match(invalid.error, /3–30 characters/);

    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'users' && ctx.op === 'update') {
        return { data: null, error: { code: '23505', message: 'dup' } };
      }
      if (ctx.table === 'users' && ctx.single === 'maybe') {
        return { data: { id: USER_ID }, error: null };
      }
      return { data: null, error: null };
    });
    assert.deepEqual(await updateMyProfile({ username: 'ada_lovelace' }), { usernameTaken: true });

    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'users' && ctx.single === 'maybe') {
        return { data: { id: USER_ID }, error: null };
      }
      return { data: null, error: null };
    });
    assert.deepEqual(await updateMyProfile({ displayName: 'Ada', username: 'ada' }), { ok: true });

    authUser = null;
    assert.deepEqual(await getMyFollowers(), { rows: [], error: 'Unauthorized' });
    assert.deepEqual(await getMyFollowing(), { rows: [], error: 'Unauthorized' });
  });

  test('onboarding location: unauthorized and invalid ids skip the save RPC', async () => {
    authUser = null;
    supabase = makeSupabaseMock(() => ({ data: null, error: null }));
    assert.deepEqual(await saveOnboardingLocation({ localityId: TAG_ID }), {
      error: 'Unauthorized',
    });

    authUser = { id: USER_ID, email: 'a@b.co' };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'users' && ctx.single === 'maybe') {
        return { data: { id: USER_ID }, error: null };
      }
      return { data: [], error: null };
    });
    assert.deepEqual(await saveOnboardingLocation({ localityId: 'not-a-city' }), {
      error: 'invalid_location',
    });
    assert.deepEqual(await saveOnboardingLocation({ localityIds: [TAG_ID] }), {
      error: 'invalid_location',
    });
  });

  test('google maps import: missing list id, empty API body, commit forbidden / create fail / success', async () => {
    authUser = { id: USER_ID, email: 'a@b.co' };
    const prevFetch = globalThis.fetch;

    globalThis.fetch = async () => ({ ok: false, url: 'https://maps.app.goo.gl/x', text: async () => '' });
    try {
      assert.equal(
        (await previewGoogleMapsImport('https://maps.app.goo.gl/xyz')).error,
        'fetch_failed'
      );
    } finally {
      globalThis.fetch = prevFetch;
    }

    globalThis.fetch = async (url) => {
      if (String(url).includes('getlist')) {
        return { ok: true, url: String(url), text: async () => '' };
      }
      return { ok: true, url: 'https://www.google.com/maps/place/Lisbon', text: async () => '' };
    };
    try {
      assert.equal(
        (await previewGoogleMapsImport('https://maps.app.goo.gl/xyz')).error,
        'no_places_found'
      );
    } finally {
      globalThis.fetch = prevFetch;
    }

    const listIdInUrl = 'A'.repeat(24);
    globalThis.fetch = async (url) => {
      if (String(url).includes('getlist')) {
        return { ok: true, url: String(url), text: async () => 'short' };
      }
      return {
        ok: true,
        url: `https://www.google.com/maps/preview/place/x/data=!2s${listIdInUrl}`,
        text: async () => '',
      };
    };
    try {
      assert.equal(
        (await previewGoogleMapsImport('https://maps.app.goo.gl/xyz')).error,
        'no_places_found'
      );
    } finally {
      globalThis.fetch = prevFetch;
    }

    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'lists' && ctx.single === 'maybe') {
        return { data: { id: LIST_ID, user_id: OTHER_ID }, error: null };
      }
      return { data: null, error: null };
    });
    assert.equal(
      (await commitGoogleMapsImport({ listId: LIST_ID, restaurantIds: [RESTAURANT_ID] })).error,
      'forbidden'
    );

    supabase = makeSupabaseMock((ctx) => {
      if (ctx.rpc === 'create_user_list') {
        return { data: null, error: { message: 'rpc_down' } };
      }
      return { data: null, error: null };
    });
    assert.equal(
      (await commitGoogleMapsImport({ listName: 'Saved', restaurantIds: [RESTAURANT_ID] })).error,
      'list_create_failed'
    );

    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'lists' && ctx.single === 'maybe') {
        return { data: { id: LIST_ID, user_id: USER_ID }, error: null };
      }
      return { data: null, error: null };
    });
    const committed = await commitGoogleMapsImport({
      listId: LIST_ID,
      restaurantIds: [RESTAURANT_ID],
    });
    assert.deepEqual(committed, { error: null, listId: LIST_ID });

    const placeNode = [
      null,
      [null, null, '', null, 'Rua Augusta, Lisboa', [null, null, 38.71, -9.14]],
      'Time Out Market',
    ];
    const getlistJson = [[null, null, null, null, 'Saved spots'], placeNode];
    const listIdInMapsUrl = 'B'.repeat(24);
    globalThis.fetch = async (url) => {
      if (String(url).includes('getlist')) {
        return {
          ok: true,
          url: String(url),
          text: async () => `)]}'\n${JSON.stringify(getlistJson)}`,
        };
      }
      return {
        ok: true,
        url: `https://www.google.com/maps/preview/place/x/data=!2s${listIdInMapsUrl}`,
        text: async () => '',
      };
    };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'restaurants') {
        return {
          data: [
            {
              id: RESTAURANT_ID,
              name: 'Time Out Market',
              address: 'Rua Augusta, Lisboa',
              latitude: 38.71,
              longitude: -9.14,
            },
          ],
          error: null,
        };
      }
      return { data: [], error: null };
    });
    try {
      const preview = await previewGoogleMapsImport('https://maps.app.goo.gl/xyz');
      assert.equal(preview.error, null);
      assert.equal(preview.listTitle, 'Saved spots');
      assert.equal(preview.places[0].status, 'matched');
      assert.equal(preview.places[0].restaurantId, RESTAURANT_ID);
    } finally {
      globalThis.fetch = prevFetch;
    }
  });

  test('creator stats / my subscriptions / home locality / tag prefs', async () => {
    authUser = null;
    supabase = makeSupabaseMock(() => ({ data: null, error: null }));
    assert.equal((await getCreatorListStats()).error, 'unauthorized');
    assert.deepEqual(await getMyActiveSubscriptions(), { error: 'unauthorized', rows: [] });
    assert.equal((await fetchUserHomeLocalityId()).localityId, null);
    assert.deepEqual(await getUserRestaurantTagPreferences(), { tagIds: [], error: 'Unauthorized' });

    authUser = { id: USER_ID, email: 'a@b.co' };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'lists') return { data: [], error: null };
      if (ctx.table === 'list_subscriptions') return { data: [], error: null };
      if (ctx.table === 'list_snapshot_purchases') return { data: [], error: null };
      if (ctx.table === 'users' && ctx.single === 'maybe') {
        return { data: { home_locality_id: TAG_ID }, error: null };
      }
      if (ctx.table === 'user_restaurant_tag_preferences') {
        return { data: [{ tag_id: TAG_ID }, { tag_id: 'nope' }], error: null };
      }
      return { data: [], error: null };
    });
    assert.deepEqual(await getCreatorListStats(), {
      error: null,
      activeSubscribers: 0,
      snapshotPurchases: 0,
      allTimeRevenueNetCents: 0,
      currency: 'eur',
    });
    assert.deepEqual(await getMyActiveSubscriptions(), { error: null, rows: [] });
    assert.deepEqual(await fetchUserHomeLocalityId(), { localityId: TAG_ID, error: null });
    assert.deepEqual(await getUserRestaurantTagPreferences(), { tagIds: [TAG_ID] });
  });

  test('map bbox + follow-circle RPCs slim rows and collect uuids', async () => {
    authUser = { id: USER_ID };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.rpc === 'restaurants_in_bbox') {
        return {
          data: [{ id: RESTAURANT_ID, name: 'Spot', metadata: { hours_parsed: {} } }],
          error: null,
        };
      }
      if (ctx.rpc === 'circle_restaurants_for_viewer') {
        return {
          data: [
            { id: RESTAURANT_ID, is_fallback: true },
            { id: 'not-a-uuid', is_fallback: false },
          ],
          error: null,
        };
      }
      return { data: [], error: null };
    });
    const bbox = await fetchRestaurantsInBbox(-9.2, 38.7, -9.1, 38.8);
    assert.equal(bbox.error, undefined);
    assert.equal(bbox.restaurants[0].id, RESTAURANT_ID);
    const circle = await fetchCircleRestaurantIds();
    assert.deepEqual(circle.restaurantIds, [RESTAURANT_ID]);
    assert.equal(circle.isFallback, true);
  });

  test('locality catalog, map pins, and Lisboa roulette pool', async () => {
    authUser = { id: USER_ID };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.rpc === 'list_location_localities') {
        return { data: [{ id: TAG_ID, name: 'Chiado' }], error: null };
      }
      if (ctx.rpc === 'restaurants_in_bbox_pins') {
        if (ctx.args?.p_search === 'fail') {
          return { data: null, error: { message: 'pins_down' } };
        }
        return {
          data: [
            {
              id: RESTAURANT_ID,
              name: 'Spot',
              latitude: 38.72,
              longitude: -9.14,
            },
            { id: 'not-uuid', latitude: 38.72, longitude: -9.14 },
            { id: RESTAURANT_ID, latitude: 0, longitude: 0 },
          ],
          error: null,
        };
      }
      return { data: [], error: null };
    });
    const locs = await fetchLocationLocalities();
    assert.equal(locs.error, undefined);
    assert.equal(locs.locations[0].name, 'Chiado');

    const pins = await fetchRestaurantPinsInBbox(-9.2, 38.7, -9.1, 38.8);
    assert.equal(pins.restaurants[0].id, RESTAURANT_ID);
    assert.deepEqual(
      await fetchRestaurantPinsInBbox(-9.2, 38.7, -9.1, 38.8, null, 10, { search: 'fail' }),
      {
        restaurants: [],
        error: 'pins_down',
      }
    );

    const roulette = await fetchPublicLisboaRouletteRestaurantIds();
    assert.deepEqual(roulette.restaurantIds, [RESTAURANT_ID]);

    const named = await searchRestaurantsByName('Spot');
    assert.equal(named.restaurants.length, 0);
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.rpc === 'search_restaurants_by_name') {
        return {
          data: [{ id: RESTAURANT_ID, name: 'Spot', metadata: { hours_parsed: {} } }],
          error: null,
        };
      }
      if (ctx.table === 'tags') {
        return {
          data: [{ id: TAG_ID, slug: 'wine', label: 'Wine', category: 'drink', sort_order: 1 }],
          error: null,
        };
      }
      if (ctx.table === 'restaurants' && ctx.single === 'maybe') {
        return {
          data: {
            id: RESTAURANT_ID,
            name: 'Spot',
            address: 'Lisboa',
            phone: null,
            latitude: 38.72,
            longitude: -9.14,
            rating: 4.5,
            metadata: {},
            restaurant_images: [],
          },
          error: null,
        };
      }
      return { data: [], error: null };
    });
    const found = await searchRestaurantsByName('Spot');
    assert.equal(found.restaurants[0].id, RESTAURANT_ID);
    const catalog = await fetchRestaurantTagsCatalog();
    assert.equal(catalog.error, undefined);
    assert.ok(catalog.tags.length >= 1);
    const spot = await fetchMapSpotDetailById(RESTAURANT_ID);
    assert.equal(spot.row?.id, RESTAURANT_ID);
    assert.equal(spot.row?.name, 'Spot');
  });

  test('followers / following: empty set, then mapped profile rows', async () => {
    authUser = { id: USER_ID };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'user_follows') return { data: [], error: null };
      return { data: [], error: null };
    });
    assert.deepEqual(await getMyFollowers(), { rows: [] });
    assert.deepEqual(await getMyFollowing(), { rows: [] });

    adminUsersResult = {
      data: [{ id: OTHER_ID, display_name: 'Ada', username: 'ada', avatar_url: null }],
      error: null,
    };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'user_follows' && ctx.filter.following_id === USER_ID) {
        return { data: [{ follower_id: OTHER_ID, created_at: '2026-01-01' }], error: null };
      }
      if (ctx.table === 'user_follows' && ctx.filter.follower_id === USER_ID) {
        return { data: [{ following_id: OTHER_ID, created_at: '2026-01-02' }], error: null };
      }
      return { data: [], error: null };
    });
    try {
      const followers = await getMyFollowers();
      assert.equal(followers.rows[0].id, OTHER_ID);
      assert.equal(followers.rows[0].user.username, 'ada');
      const following = await getMyFollowing();
      assert.equal(following.rows[0].id, OTHER_ID);
      assert.equal(following.rows[0].user.display_name, 'Ada');
    } finally {
      adminUsersResult = { data: null, error: null };
    }
  });

  test('discover home market + onboarding complete / follows / tag prefs succeed', async () => {
    authUser = { id: USER_ID, email: 'a@b.co' };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.rpc === 'cities_for_onboarding_save') {
        return { data: [{ id: TAG_ID, active: true }], error: null };
      }
      if (ctx.table === 'users' && ctx.single === 'maybe') {
        return { data: { id: USER_ID }, error: null };
      }
      if (ctx.table === 'users' && ctx.op === 'update') {
        return { data: { id: USER_ID }, error: null };
      }
      if (ctx.table === 'user_location_follows') return { data: [], error: null };
      if (ctx.table === 'user_follows') return { data: [], error: null };
      if (ctx.table === 'user_restaurant_tag_preferences') return { data: [], error: null };
      return { data: [], error: null };
    });
    assert.deepEqual(await updateDiscoverHomeMarket(TAG_ID), { ok: true });
    assert.deepEqual(await completeOnboarding(), { ok: true });
    assert.deepEqual(await saveOnboardingFollows([OTHER_ID]), { ok: true });
    assert.deepEqual(await saveUserRestaurantTagPreferences([TAG_ID]), { ok: true });
  });

  test('cancel subscriber / own subscription: id, auth, ownership, and stripe success', async () => {
    stripeClient = {
      subscriptions: {
        retrieve: async () => ({ latest_invoice: null }),
        cancel: async () => ({}),
        update: async () => ({}),
      },
      refunds: { create: async () => ({}) },
    };
    authUser = { id: USER_ID, email: 'a@b.co' };
    try {
      assert.deepEqual(await cancelSubscriberListSubscription('not-a-uuid'), {
        error: 'invalid_id',
      });
      assert.deepEqual(await cancelMyCreatorSubscription('nope'), { error: 'invalid_id' });

      const prevUser = authUser;
      authUser = null;
      assert.deepEqual(await cancelSubscriberListSubscription(LIST_ID), { error: 'unauthorized' });
      assert.deepEqual(await cancelMyCreatorSubscription(LIST_ID), { error: 'unauthorized' });
      authUser = prevUser;

      supabase = makeSupabaseMock(() => ({ data: null, error: null }));
      assert.deepEqual(await cancelSubscriberListSubscription(LIST_ID), { error: 'not_found' });
      assert.deepEqual(await cancelMyCreatorSubscription(LIST_ID), { error: 'not_found' });

      supabase = makeSupabaseMock((ctx) => {
        if (ctx.table === 'list_subscriptions' && ctx.single === 'maybe') {
          return {
            data: {
              id: LIST_ID,
              list_id: LIST_ID,
              status: 'active',
              subscriber_user_id: OTHER_ID,
              stripe_subscription_id: 'sub_x',
              stripe_connect_account_id: 'acct_x',
            },
            error: null,
          };
        }
        if (ctx.table === 'lists' && ctx.single === 'maybe') {
          return { data: { user_id: OTHER_ID }, error: null };
        }
        return { data: null, error: null };
      });
      assert.deepEqual(await cancelSubscriberListSubscription(LIST_ID), { error: 'forbidden' });
      assert.deepEqual(await cancelMyCreatorSubscription(LIST_ID), { error: 'forbidden' });

      supabase = makeSupabaseMock((ctx) => {
        if (ctx.table === 'list_subscriptions' && ctx.single === 'maybe') {
          return {
            data: {
              id: LIST_ID,
              list_id: LIST_ID,
              status: 'active',
              subscriber_user_id: USER_ID,
              stripe_subscription_id: 'sub_x',
              stripe_connect_account_id: 'acct_x',
              current_period_end: '2026-10-01',
              lists: { name: 'Dinner' },
            },
            error: null,
          };
        }
        if (ctx.table === 'lists' && ctx.single === 'maybe') {
          return { data: { user_id: USER_ID }, error: null };
        }
        return { data: null, error: null };
      });
      assert.deepEqual(await cancelSubscriberListSubscription(LIST_ID), { error: null });
      assert.deepEqual(await cancelMyCreatorSubscription(LIST_ID, 'too_expensive'), {
        error: null,
        reason: 'too_expensive',
      });
    } finally {
      stripeClient = null;
    }
  });

  test('creator stats and my subscriptions enrich owned / subscribed lists', async () => {
    authUser = { id: USER_ID, email: 'a@b.co' };
    adminUsersResult = {
      data: [{ id: OTHER_ID, username: 'ada', display_name: 'Ada', avatar_url: null }],
      error: null,
    };
    supabase = makeSupabaseMock((ctx) => {
      if (ctx.table === 'lists') {
        return {
          data: [{ id: LIST_ID, name: 'Dinner', user_id: OTHER_ID }],
          error: null,
        };
      }
      if (ctx.table === 'list_subscriptions') {
        return {
          data: [
            {
              id: LIST_ID,
              list_id: LIST_ID,
              status: 'active',
              current_period_end: '2026-10-01',
              cancel_at_period_end: false,
              stripe_subscription_id: 'sub_x',
              stripe_connect_account_id: 'acct_x',
              created_at: '2026-08-01',
            },
          ],
          error: null,
        };
      }
      if (ctx.table === 'list_snapshot_purchases') {
        return {
          data: [{ id: RESTAURANT_ID, list_id: LIST_ID, amount_cents: 999, currency: 'eur' }],
          error: null,
        };
      }
      if (ctx.table === 'list_subscription_payments') {
        return { data: [{ amount_paid_cents: 499, currency: 'eur' }], error: null };
      }
      return { data: [], error: null };
    });
    try {
      const stats = await getCreatorListStats();
      assert.equal(stats.error, null);
      assert.equal(stats.activeSubscribers, 1);
      assert.equal(stats.snapshotPurchases, 1);
      assert.ok(stats.allTimeRevenueNetCents > 0);
      assert.equal(stats.currency, 'eur');

      const mine = await getMyActiveSubscriptions();
      assert.equal(mine.error, null);
      assert.equal(mine.rows.some((r) => r.purchase_kind === 'subscription' && r.list_name === 'Dinner'), true);
      assert.equal(mine.rows.some((r) => r.purchase_kind === 'snapshot'), true);
      const sub = mine.rows.find((r) => r.purchase_kind === 'subscription');
      assert.equal(sub.creator.username, 'ada');
    } finally {
      adminUsersResult = { data: null, error: null };
    }
  });
});
