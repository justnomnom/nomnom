/**
 * fetchPublicProfileByUsername with a mocked Supabase client.
 * Covers viewer_following on the payload (replaces a second follow round-trip).
 */
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';

/** @type {object | null} */
let authUser = { id: OTHER_USER_ID };
/** @type {object | null} */
let supabase = null;

mock.module('src/libs/supabase/supabase-admin.js', {
  exports: {
    supabaseAdminClient: {
      from() {
        return this;
      },
    },
  },
});

mock.module('src/libs/supabase/supabase-server-client.js', {
  exports: {
    createSupabaseServerClient: async () => supabase,
    getSupabaseAuthUser: async () => ({ data: { user: authUser }, error: null }),
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

const { fetchPublicProfileByUsername } = await import('../actions/members-profile-actions.js');

/**
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
      not() {
        return api;
      },
      order() {
        return api;
      },
      limit() {
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

function profileRow(overrides = {}) {
  return {
    id: USER_ID,
    username: 'ada',
    display_name: 'Ada',
    avatar_url: null,
    bio: '',
    creator_payout_ready: false,
    ...overrides,
  };
}

test('fetchPublicProfileByUsername: blank handle → invalid', async () => {
  supabase = makeSupabaseMock(() => ({ data: null, error: null }));
  const out = await fetchPublicProfileByUsername('  ');
  assert.equal(out.error, 'invalid');
  assert.equal(out.profile, null);
});

test('fetchPublicProfileByUsername: unknown handle → not_found', async () => {
  authUser = { id: OTHER_USER_ID };
  supabase = makeSupabaseMock((ctx) => {
    if (ctx.kind === 'rpc' && ctx.rpc === 'public_user_profile_by_username') {
      return { data: [], error: null };
    }
    return { data: null, error: null };
  });
  const out = await fetchPublicProfileByUsername('ghost-user-unknown');
  assert.equal(out.error, 'not_found');
  assert.equal(out.profile, null);
});

test('fetchPublicProfileByUsername: signed-in stranger gets viewer_following true', async () => {
  authUser = { id: OTHER_USER_ID };
  supabase = makeSupabaseMock((ctx) => {
    if (ctx.kind === 'rpc' && ctx.rpc === 'public_user_profile_by_username') {
      return { data: [profileRow()], error: null };
    }
    if (ctx.kind === 'rpc' && ctx.rpc === 'public_lists_for_profile') {
      return { data: [{ id: 'list-1', name: 'Dinner', item_count: 2 }], error: null };
    }
    if (ctx.kind === 'rpc' && ctx.rpc === 'public_profile_activity') {
      return { data: [], error: null };
    }
    if (ctx.table === 'user_follows' && ctx.single === 'maybe') {
      assert.equal(ctx.filter.follower_id, OTHER_USER_ID);
      assert.equal(ctx.filter.following_id, USER_ID);
      return { data: { follower_id: OTHER_USER_ID }, error: null };
    }
    if (ctx.table === 'lists' && ctx.single === 'maybe') {
      return { data: null, error: null };
    }
    return { data: [], error: null };
  });

  const out = await fetchPublicProfileByUsername('ada-follow-yes');
  assert.equal(out.error, null);
  assert.equal(out.profile.viewer_following, true);
  assert.equal(out.lists.length, 1);
  assert.ok(supabase.calls.some((c) => c.table === 'user_follows'));
});

test('fetchPublicProfileByUsername: owner does not query user_follows', async () => {
  authUser = { id: USER_ID };
  supabase = makeSupabaseMock((ctx) => {
    if (ctx.kind === 'rpc' && ctx.rpc === 'public_user_profile_by_username') {
      return { data: profileRow(), error: null };
    }
    if (ctx.kind === 'rpc' && ctx.rpc === 'public_profile_activity') {
      return { data: [], error: null };
    }
    if (ctx.table === 'lists' && ctx.op === 'select' && !ctx.single) {
      return {
        data: [
          {
            id: 'list-owned',
            name: 'Mine',
            description: null,
            cover_image_url: null,
            visibility: 'private',
            published_at: null,
            updated_at: '2026-01-01T00:00:00Z',
            slug: 'mine',
            list_items: [{ count: 0 }],
          },
        ],
        error: null,
      };
    }
    if (ctx.table === 'lists' && ctx.single === 'maybe') {
      return { data: null, error: null };
    }
    return { data: [], error: null };
  });

  const out = await fetchPublicProfileByUsername('ada-owner-self');
  assert.equal(out.error, null);
  assert.equal(out.profile.viewer_following, false);
  assert.equal(out.lists[0].item_count, 0);
  assert.equal(
    supabase.calls.some((c) => c.table === 'user_follows'),
    false
  );
});
