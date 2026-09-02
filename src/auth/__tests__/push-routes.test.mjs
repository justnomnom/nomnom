/**
 * Authed Web Push subscribe/unsubscribe: JSON gates plus scoped upsert/delete.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';

const USER_ID = '11111111-1111-4111-8111-111111111111';

/** @type {{ id: string } | null} */
let authUser = { id: USER_ID };
/** @type {object | null} */
let mutateError = null;
/** @type {unknown[]} */
const steps = [];

function mutateChain() {
  const query = {
    upsert(row, opts) {
      steps.push(['upsert', row, opts]);
      return query;
    },
    delete() {
      steps.push(['delete']);
      return query;
    },
    eq(col, val) {
      steps.push(['eq', col, val]);
      return query;
    },
    then(resolve, reject) {
      return Promise.resolve({ error: mutateError }).then(resolve, reject);
    },
  };
  return {
    from(table) {
      steps.push(['from', table]);
      return query;
    },
  };
}

mock.module('src/libs/supabase/supabase-server-client.js', {
  exports: {
    getSupabaseAuthUser: async () => ({ data: { user: authUser }, error: null }),
    createSupabaseServerClient: async () => mutateChain(),
  },
});

const { POST: subscribePost } = await import('../../app/(frontend)/api/push/subscribe/route.js');
const { POST: unsubscribePost } = await import('../../app/(frontend)/api/push/unsubscribe/route.js');

/**
 * @param {object | null} body
 * @param {string} [userAgent]
 */
function req(body, userAgent = 'NomNomTest/1.0') {
  return {
    headers: new Headers({ 'user-agent': userAgent }),
    json: async () => {
      if (body === null) throw new SyntaxError('bad json');
      return body;
    },
  };
}

const validSub = {
  endpoint: 'https://push.example/sub',
  keys: { p256dh: 'p', auth: 'a' },
};

describe('POST /api/push/subscribe and /unsubscribe', { concurrency: false }, () => {
  beforeEach(() => {
    authUser = { id: USER_ID };
    mutateError = null;
    steps.length = 0;
  });

  test('subscribe without session → 401', async () => {
    authUser = null;
    const res = await subscribePost(req(validSub));
    assert.equal(res.status, 401);
  });

  test('subscribe invalid JSON → 400', async () => {
    const res = await subscribePost(req(null));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'invalid_json');
  });

  test('subscribe missing keys → 400 invalid_subscription', async () => {
    const res = await subscribePost(req({ endpoint: 'https://x' }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'invalid_subscription');
  });

  test('subscribe upserts on endpoint conflict', async () => {
    const res = await subscribePost(req(validSub));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    const upsert = steps.find((s) => s[0] === 'upsert');
    assert.equal(upsert[1].user_id, USER_ID);
    assert.equal(upsert[1].endpoint, validSub.endpoint);
    assert.deepEqual(upsert[2], { onConflict: 'endpoint' });
  });

  test('unsubscribe missing endpoint → 400', async () => {
    const res = await unsubscribePost(req({}));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'missing_endpoint');
  });

  test('unsubscribe deletes the caller\'s endpoint only', async () => {
    const res = await unsubscribePost(req({ endpoint: validSub.endpoint }));
    assert.equal(res.status, 200);
    assert.ok(steps.some((s) => s[0] === 'delete'));
    assert.deepEqual(
      steps.filter((s) => s[0] === 'eq'),
      [
        ['eq', 'user_id', USER_ID],
        ['eq', 'endpoint', validSub.endpoint],
      ]
    );
  });

  test('subscribe persist failure → 500', async () => {
    mutateError = { message: 'boom' };
    const res = await subscribePost(req(validSub));
    assert.equal(res.status, 500);
    assert.equal((await res.json()).error, 'persist_failed');
  });
});
