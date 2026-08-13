/**
 * Share → Decide SQL migration contracts (RPC exceptions, grants, ranking).
 * Parses supabase/migrations/20260813140000_list_decide.sql — no live DB.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';

import { mapDecideError } from '../list-decide-payload.js';
import { pickDecideWinnerId, rankDecideTallies } from '../list-decide-tally.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const MIGRATION = fs.readFileSync(
  path.join(ROOT, 'supabase/migrations/20260813140000_list_decide.sql'),
  'utf8'
);

const SQL_EXCEPTION_TO_APP = {
  not_authenticated: 'unauthorized',
  only_owner_can_decide: 'only_owner',
  list_not_public: 'list_not_public',
  need_at_least_three_places: 'need_three_places',
  session_not_found: 'session_not_found',
  session_locked: 'session_locked',
  restaurant_not_on_list: 'restaurant_not_on_list',
  invalid_voter_key: 'invalid_voter_key',
  invalid_vote: 'invalid_vote',
  rate_limited: 'rate_limited',
  not_authorized_to_lock: 'not_authorized_to_lock',
};

function lookup(bundle, key) {
  const value = key.split('.').reduce(
    (acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined),
    bundle
  );
  return typeof value === 'string' ? value : undefined;
}

describe('list-decide SQL migration', () => {
  test('every RAISE EXCEPTION code maps to an app error with en/pt copy', () => {
    const raised = [...MIGRATION.matchAll(/RAISE EXCEPTION '([a-z_]+)'/g)].map((m) => m[1]);
    const unique = [...new Set(raised)].sort();
    assert.deepEqual(unique, [...Object.keys(SQL_EXCEPTION_TO_APP)].sort());

    const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/langs/en.json'), 'utf8'));
    const pt = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/langs/pt.json'), 'utf8'));

    for (const sqlCode of unique) {
      const appCode = SQL_EXCEPTION_TO_APP[sqlCode];
      assert.equal(mapDecideError(sqlCode), appCode, sqlCode);
      assert.equal(mapDecideError(`ERROR: ${sqlCode}`), appCode);
      const i18nKey = `pages.lists.decide_error_${appCode}`;
      assert.ok(lookup(en, i18nKey)?.trim(), `missing en ${i18nKey}`);
      assert.ok(lookup(pt, i18nKey)?.trim(), `missing pt ${i18nKey}`);
    }
  });

  test('voter-key and vote checks match the JS client (8–128, ±1)', () => {
    assert.match(
      MIGRATION,
      /char_length\(p_voter_key\) < 8 OR char_length\(p_voter_key\) > 128/
    );
    assert.match(MIGRATION, /p_vote NOT IN \(-1, 1\)/);
    assert.match(MIGRATION, /CHECK \(vote IN \(-1, 1\)\)/);
    assert.doesNotMatch(MIGRATION, /btrim\(p_voter_key\)/);
  });

  test('create/get/cast/lock are SECURITY DEFINER with a pinned search_path', () => {
    const fns = [
      'create_list_decide_session',
      'get_list_decide_session',
      'cast_list_decide_vote',
      'lock_list_decide_session',
    ];
    for (const name of fns) {
      const idx = MIGRATION.indexOf(`FUNCTION public.${name}`);
      assert.ok(idx >= 0, name);
      const body = MIGRATION.slice(idx, idx + 500);
      assert.match(body, /SECURITY DEFINER/);
      assert.match(body, /SET search_path TO 'public', 'pg_temp'/);
    }
    assert.doesNotMatch(MIGRATION, /v_token :=.*gen_random_bytes/);
  });

  test('create closes prior open sessions and mints a uuid lock_token', () => {
    assert.match(
      MIGRATION,
      /SET status = 'locked', updated_at = now\(\)\s+WHERE list_id = p_list_id AND status = 'open'/
    );
    assert.match(
      MIGRATION,
      /v_token := replace\(gen_random_uuid\(\)::text \|\| gen_random_uuid\(\)::text, '-', ''\)/
    );
    assert.match(MIGRATION, /need_at_least_three_places/);
  });

  test('get returns NULL (not an exception) for missing or private sessions', () => {
    const getFn = MIGRATION.slice(
      MIGRATION.indexOf('FUNCTION public.get_list_decide_session'),
      MIGRATION.indexOf('FUNCTION public.cast_list_decide_vote')
    );
    assert.match(getFn, /IF NOT FOUND THEN\s+RETURN NULL;/);
    assert.match(getFn, /IF v_vis IS NULL THEN\s+RETURN NULL;/);
    assert.match(getFn, /v_vis <> 'public'/);
    assert.doesNotMatch(getFn, /RAISE EXCEPTION/);
  });

  test('cast upserts on (session, voter, restaurant) and rate-limits at 60/min', () => {
    assert.match(MIGRATION, /ON CONFLICT \(session_id, voter_key, restaurant_id\)/);
    assert.match(MIGRATION, /v_recent >= 60/);
    assert.match(MIGRATION, /interval '1 minute'/);
  });

  test('lock is idempotent when already locked and uses FOR UPDATE', () => {
    const lockFn = MIGRATION.slice(MIGRATION.indexOf('FUNCTION public.lock_list_decide_session'));
    assert.match(lockFn, /FOR UPDATE/);
    assert.match(lockFn, /IF v_row\.status = 'locked' THEN\s+RETURN public\.get_list_decide_session/);
    assert.match(
      lockFn,
      /ORDER BY sum\(vote\) DESC, count\(\*\) FILTER \(WHERE vote = 1\) DESC, restaurant_id/
    );
  });

  test('SQL winner ORDER BY matches pickDecideWinnerId (net, then up, then id)', () => {
    const tallies = {
      a: { up: 2, down: 1, net: 1 },
      b: { up: 3, down: 2, net: 1 },
      c: { up: 0, down: 0, net: 0 },
    };
    const ranked = rankDecideTallies(tallies, ['c', 'a', 'b']);
    assert.deepEqual(
      ranked.map((r) => r.restaurantId),
      ['b', 'a', 'c']
    );
    assert.equal(pickDecideWinnerId(tallies, ['c', 'a', 'b']), 'b');
  });

  test('tables FK to public.users and restaurants; no anon/authenticated table grants', () => {
    assert.match(MIGRATION, /created_by uuid NOT NULL REFERENCES public\.users\(id\) ON DELETE CASCADE/);
    assert.match(MIGRATION, /user_id uuid REFERENCES public\.users\(id\) ON DELETE SET NULL/);
    assert.match(
      MIGRATION,
      /winner_restaurant_id uuid REFERENCES public\.restaurants\(id\) ON DELETE SET NULL/
    );
    assert.match(MIGRATION, /REVOKE ALL ON TABLE public\.list_decide_sessions FROM anon, authenticated/);
    assert.match(MIGRATION, /REVOKE ALL ON TABLE public\.list_decide_votes FROM anon, authenticated/);
    assert.doesNotMatch(
      MIGRATION,
      /GRANT SELECT ON TABLE public\.list_decide_(sessions|votes) TO anon/
    );
  });

  test('EXECUTE: create is authenticated-only; guests can get/cast/lock', () => {
    assert.match(MIGRATION, /REVOKE ALL ON FUNCTION public\.create_list_decide_session\(uuid\) FROM PUBLIC/);
    assert.match(
      MIGRATION,
      /GRANT EXECUTE ON FUNCTION public\.create_list_decide_session\(uuid\) TO authenticated/
    );
    assert.doesNotMatch(
      MIGRATION,
      /GRANT EXECUTE ON FUNCTION public\.create_list_decide_session\(uuid\) TO anon/
    );
    assert.match(
      MIGRATION,
      /GRANT EXECUTE ON FUNCTION public\.get_list_decide_session\(uuid\) TO anon, authenticated, service_role/
    );
    assert.match(
      MIGRATION,
      /GRANT EXECUTE ON FUNCTION public\.cast_list_decide_vote\(uuid, uuid, text, smallint\) TO anon, authenticated, service_role/
    );
    assert.match(
      MIGRATION,
      /GRANT EXECUTE ON FUNCTION public\.lock_list_decide_session\(uuid, text, uuid\) TO anon, authenticated, service_role/
    );
  });
});
