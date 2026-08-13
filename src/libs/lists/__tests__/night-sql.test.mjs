/**
 * Tonight Night SQL migration contracts — parses
 * supabase/migrations/20260813180000_nights_tonight.sql (no live DB).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';

import { mapDecideError } from '../list-decide-payload.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const MIGRATION = fs.readFileSync(
  path.join(ROOT, 'supabase/migrations/20260813180000_nights_tonight.sql'),
  'utf8'
);

describe('nights tonight SQL migration', () => {
  test('allowed_restaurant_ids column + NULL semantics documented', () => {
    assert.match(MIGRATION, /ADD COLUMN IF NOT EXISTS allowed_restaurant_ids uuid\[]/);
    assert.match(MIGRATION, /NULL  = all list places/);
    assert.match(MIGRATION, /Empty array is invalid/);
  });

  test('create_list_decide_session skips Night-linked open sessions', () => {
    const createFn = MIGRATION.slice(
      MIGRATION.indexOf('FUNCTION public.create_list_decide_session'),
      MIGRATION.indexOf('FUNCTION public.cast_list_decide_vote')
    );
    assert.match(createFn, /NOT EXISTS \(\s*SELECT 1 FROM public\.nights n WHERE n\.decide_session_id = s\.id/);
    assert.match(createFn, /allowed_restaurant_ids\)\s*VALUES \(p_list_id, v_uid, v_token, 'open', NULL\)/);
  });

  test('create_night closes only prior Night-linked opens and sets allowlist', () => {
    const createNight = MIGRATION.slice(MIGRATION.indexOf('FUNCTION public.create_night'));
    assert.match(
      createNight,
      /EXISTS \(\s*SELECT 1 FROM public\.nights n WHERE n\.decide_session_id = s\.id/
    );
    assert.match(createNight, /allowed_restaurant_ids\s*\)\s*VALUES \(p_list_id, v_uid, v_token, 'open', v_ids\)/);
    assert.match(createNight, /cardinality\(p_restaurant_ids\) > 5/);
    assert.match(createNight, /need_at_least_three_places/);
    assert.match(createNight, /too_many_places/);
  });

  test('cast enforces allowlist when set; list cast stays free of night_guests', () => {
    const castFn = MIGRATION.slice(
      MIGRATION.indexOf('FUNCTION public.cast_list_decide_vote'),
      MIGRATION.indexOf('FUNCTION public.lock_list_decide_session')
    );
    assert.match(castFn, /restaurant_not_allowed/);
    assert.doesNotMatch(castFn, /night_guests/);
  });

  test('cast_night_vote enforces join gate then delegates to list cast', () => {
    const nightCast = MIGRATION.slice(MIGRATION.indexOf('FUNCTION public.cast_night_vote'));
    assert.match(nightCast, /not_joined/);
    assert.match(nightCast, /RETURN public\.cast_list_decide_vote\(/);
  });

  test('get_night embeds decide; get_night_decide is slim poll', () => {
    assert.match(MIGRATION, /'decide', v_decide/);
    assert.match(MIGRATION, /FUNCTION public\.get_night_decide/);
    assert.match(MIGRATION, /'photo'/);
    const slim = MIGRATION.slice(MIGRATION.indexOf('FUNCTION public.get_night_decide'));
    assert.match(slim, /guest_count/);
    assert.doesNotMatch(slim.slice(0, 1200), /v_places/);
  });

  test('night tables are service_role only', () => {
    for (const table of ['nights', 'night_places', 'night_guests']) {
      assert.match(
        MIGRATION,
        new RegExp(`REVOKE ALL ON TABLE public\\.${table} FROM anon, authenticated`)
      );
      assert.match(MIGRATION, new RegExp(`GRANT ALL ON TABLE public\\.${table} TO service_role`));
    }
  });

  test('Night RAISE codes map through mapDecideError', () => {
    const codes = [
      'restaurant_not_allowed',
      'night_not_found',
      'not_joined',
      'invalid_display_name',
      'too_many_places',
      'invalid_restaurant_id',
    ];
    for (const code of codes) {
      assert.equal(mapDecideError(code), code);
      assert.match(MIGRATION, new RegExp(`RAISE EXCEPTION '${code}'`));
    }
  });

  test('grants: create_night authenticated; guest RPCs anon+authenticated', () => {
    assert.match(
      MIGRATION,
      /GRANT EXECUTE ON FUNCTION public\.create_night\(uuid, uuid\[], text, timestamptz\) TO authenticated/
    );
    assert.doesNotMatch(
      MIGRATION,
      /GRANT EXECUTE ON FUNCTION public\.create_night\(uuid, uuid\[], text, timestamptz\) TO anon/
    );
    assert.match(
      MIGRATION,
      /GRANT EXECUTE ON FUNCTION public\.get_night\(uuid\) TO anon, authenticated, service_role/
    );
    assert.match(
      MIGRATION,
      /GRANT EXECUTE ON FUNCTION public\.cast_night_vote\(uuid, uuid, text, smallint\) TO anon, authenticated, service_role/
    );
  });
});
