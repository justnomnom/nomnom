/**
 * Authed notification read/delete route handlers: JSON/target gates and scoped writes.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const NOTE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

/** @type {{ id: string } | null} */
let authUser = { id: USER_ID };
/** @type {object | null} */
let mutateError = null;
/** @type {unknown[]} */
const steps = [];

function mutateChain() {
  const query = {
    update(patch) {
      steps.push(['update', patch]);
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
    is(col, val) {
      steps.push(['is', col, val]);
      return query;
    },
    not(col, op, val) {
      steps.push(['not', col, op, val]);
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

const { POST: readPost } = await import('../../app/(frontend)/api/notifications/read/route.js');
const { POST: deletePost } = await import('../../app/(frontend)/api/notifications/delete/route.js');

/**
 * @param {object | null} body
 */
function req(body) {
  return {
    json: async () => {
      if (body === null) throw new SyntaxError('bad json');
      return body;
    },
  };
}

describe('POST /api/notifications/read and /delete', { concurrency: false }, () => {
  beforeEach(() => {
    authUser = { id: USER_ID };
    mutateError = null;
    steps.length = 0;
  });

  test('read without session → 401', async () => {
    authUser = null;
    const res = await readPost(req({ all: true }));
    assert.equal(res.status, 401);
  });

  test('delete invalid JSON → 400', async () => {
    const res = await deletePost(req(null));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'invalid_json');
  });

  test('read missing target → 400', async () => {
    const res = await readPost(req({}));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'missing_target');
  });

  test('read all unread rows for the caller', async () => {
    const res = await readPost(req({ all: true }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.deepEqual(
      steps.filter((s) => s[0] === 'eq' || s[0] === 'is'),
      [
        ['eq', 'user_id', USER_ID],
        ['is', 'read_at', null],
      ]
    );
  });

  test('delete one id is scoped to the caller', async () => {
    const res = await deletePost(req({ id: NOTE_ID }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.ok(steps.some((s) => s[0] === 'delete'));
    assert.deepEqual(
      steps.filter((s) => s[0] === 'eq'),
      [
        ['eq', 'user_id', USER_ID],
        ['eq', 'id', NOTE_ID],
      ]
    );
  });

  test('read query failure → 500 update_failed', async () => {
    mutateError = { message: 'boom' };
    const res = await readPost(req({ id: NOTE_ID }));
    assert.equal(res.status, 500);
    assert.equal((await res.json()).error, 'update_failed');
  });
});
