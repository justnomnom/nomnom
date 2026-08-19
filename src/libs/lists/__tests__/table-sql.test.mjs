/**
 * Table SQL migration contracts — parses the merge file plus
 * 20260819220000_table_vote_requires_name.sql (no live DB).
 *
 * The migration file is gitignored (see CLAUDE.md "Two databases"), so this suite is the
 * only thing in the repo that pins the shape the shipped server actions depend on.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';

import { mapTableError } from '../table-payload.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const MERGE_PATH = 'supabase/migrations/20260817120000_tables_merge.sql';
const NAME_GATE_PATH = 'supabase/migrations/20260819220000_table_vote_requires_name.sql';
const MIGRATION = [
  fs.readFileSync(path.join(ROOT, MERGE_PATH), 'utf8'),
  fs.readFileSync(path.join(ROOT, NAME_GATE_PATH), 'utf8'),
].join('\n');

/** Body of the latest `create or replace function public.<name>` block. */
function fn(name) {
  const needle = `create or replace function public.${name}(`;
  const start = MIGRATION.lastIndexOf(needle);
  assert.notEqual(start, -1, `missing function ${name}`);
  const end = MIGRATION.indexOf('create or replace function public.', start + 1);
  return MIGRATION.slice(start, end === -1 ? undefined : end);
}

describe('tables merge SQL migration', () => {
  test('drops every Night / Decide object — hard cut, no backfill', () => {
    for (const table of [
      'night_guests',
      'night_places',
      'nights',
      'list_decide_votes',
      'list_decide_sessions',
    ]) {
      assert.match(MIGRATION, new RegExp(`drop table if exists public\\.${table} cascade`));
    }
    for (const rpc of [
      'add_night_place',
      'cast_night_vote',
      'create_night',
      'get_night',
      'get_night_decide',
      'join_night',
      'cast_list_decide_vote',
      'create_list_decide_session',
      'get_list_decide_session',
      'lock_list_decide_session',
    ]) {
      assert.match(MIGRATION, new RegExp(`drop function if exists public\\.${rpc}\\(`));
    }
  });

  test('one tables row owns shortlist, guests, votes, status and winner', () => {
    assert.match(MIGRATION, /create table public\.tables \(/);
    assert.match(MIGRATION, /create table public\.table_places \(/);
    assert.match(MIGRATION, /create table public\.table_guests \(/);
    assert.match(MIGRATION, /create table public\.table_votes \(/);
    assert.match(MIGRATION, /check \(status in \('open', 'locked'\)\)/);
    assert.match(MIGRATION, /vote smallint not null check \(vote in \(-1, 1\)\)/);
    assert.match(MIGRATION, /primary key \(table_id, guest_key, restaurant_id\)/);
    // allowed_restaurant_ids is gone: table_places IS the allowed set.
    assert.doesNotMatch(MIGRATION, /allowed_restaurant_ids uuid\[]/);
  });

  test('naming yourself is the gate: votes and add-place require a display_name', () => {
    assert.match(MIGRATION, /display_name text,/);
    assert.match(
      MIGRATION,
      /check \(display_name is null or char_length\(btrim\(display_name\)\) between 1 and 80\)/
    );
    const cast = fn('cast_table_vote');
    assert.match(cast, /RAISE EXCEPTION 'not_joined'/);
    assert.doesNotMatch(cast, /PERFORM public\._table_touch_guest/);
    const add = fn('add_table_place');
    assert.match(add, /RAISE EXCEPTION 'not_joined'/);
    assert.doesNotMatch(add, /PERFORM public\._table_touch_guest/);
  });

  test('lock_token avoids gen_random_bytes (pgcrypto is not on search_path)', () => {
    assert.doesNotMatch(MIGRATION, /gen_random_bytes/);
    assert.match(MIGRATION, /replace\(gen_random_uuid\(\)::text \|\| gen_random_uuid\(\)::text, '-', ''\)/);
  });

  test('every table is service_role only — clients go through the RPCs', () => {
    for (const table of ['tables', 'table_places', 'table_guests', 'table_votes']) {
      assert.match(MIGRATION, new RegExp(`alter table public\\.${table} enable row level security`));
      assert.match(MIGRATION, new RegExp(`revoke all on public\\.${table} from anon, authenticated`));
      assert.match(MIGRATION, new RegExp(`grant all on public\\.${table} to service_role`));
    }
  });

  test('start_table: owner + public list, 3–200 real restaurants, settles the prior open one', () => {
    const start = fn('start_table');
    assert.match(start, /RAISE EXCEPTION 'not_authenticated'/);
    assert.match(start, /RAISE EXCEPTION 'only_owner_can_decide'/);
    assert.match(start, /RAISE EXCEPTION 'list_not_public'/);
    assert.match(start, /cardinality\(v_ids\) < 3/);
    assert.match(start, /RAISE EXCEPTION 'need_at_least_three_places'/);
    assert.match(start, /cardinality\(v_ids\) > 200/);
    assert.match(start, /RAISE EXCEPTION 'too_many_places'/);
    assert.match(start, /FROM public\.restaurants r WHERE r\.id = want\.id/);
    assert.match(start, /RAISE EXCEPTION 'invalid_restaurant_id'/);
    // Shortlist is any catalog restaurant, not just list_items.
    assert.doesNotMatch(start, /restaurant_not_on_list/);
    assert.match(start, /INSERT INTO public\.tables \(list_id, created_by, title, starts_at, lock_token\)/);
    assert.match(start, /SET status = 'locked', updated_at = now\(\)\s*WHERE list_id = p_list_id AND status = 'open'/);
  });

  test('cast_table_vote: table_places is the allowed set, and the table must be open', () => {
    const cast = fn('cast_table_vote');
    assert.match(cast, /RAISE EXCEPTION 'invalid_voter_key'/);
    assert.match(cast, /p_vote NOT IN \(-1, 1\)/);
    assert.match(cast, /RAISE EXCEPTION 'table_not_found'/);
    assert.match(cast, /v_tbl\.status <> 'open'/);
    assert.match(cast, /RAISE EXCEPTION 'session_locked'/);
    assert.match(cast, /FROM public\.table_places\s*\n\s*WHERE table_id = p_table_id AND restaurant_id = p_restaurant_id/);
    assert.match(cast, /RAISE EXCEPTION 'restaurant_not_allowed'/);
    assert.match(cast, /v_recent >= 60/);
    assert.match(cast, /RAISE EXCEPTION 'rate_limited'/);
    // Re-voting the same place updates rather than duplicating.
    assert.match(cast, /ON CONFLICT \(table_id, guest_key, restaurant_id\)\s*\n\s*DO UPDATE SET/);
  });

  test('add_table_place: re-adding is a no-op success and skips the caps', () => {
    const add = fn('add_table_place');
    assert.match(add, /RAISE EXCEPTION 'session_locked'/);
    assert.match(add, /v_total >= 200/);
    assert.match(add, /RAISE EXCEPTION 'too_many_places'/);
    // The start_table batch shares tables.created_at, so it must not trip the limiter.
    assert.match(add, /added_at > v_tbl\.created_at/);
    assert.match(add, /v_recent >= 20/);
    assert.match(add, /RAISE EXCEPTION 'rate_limited'/);
    assert.match(add, /ON CONFLICT \(table_id, restaurant_id\) DO NOTHING/);
  });

  test('lock_table: owner by auth, or whoever holds the lock token', () => {
    const lock = fn('lock_table');
    assert.match(lock, /RAISE EXCEPTION 'table_not_found'/);
    assert.match(lock, /RAISE EXCEPTION 'not_authorized_to_lock'/);
  });

  test('payload keeps the decide slice, and the poll trims the immutable header', () => {
    const payload = fn('_table_payload');
    assert.match(payload, /'title', v_tbl\.title/);
    assert.match(payload, /'starts_at', v_tbl\.starts_at/);
    assert.match(payload, /'decide', jsonb_build_object\(/);
    assert.match(payload, /'session_id', v_tbl\.id/);
    assert.match(payload, /'tallies', v_tallies/);
    assert.match(payload, /'guest_count', coalesce\(jsonb_array_length\(v_guests\), 0\)/);
    assert.match(payload, /'photo'/);
    // Named guests first so the "+N" anonymous tail renders last.
    assert.match(payload, /ORDER BY \(tg\.display_name IS NULL\), tg\.joined_at, tg\.guest_key/);

    const slim = fn('get_table_decide');
    for (const key of ['guest_count', 'guests', 'places', 'decide']) {
      assert.match(slim, new RegExp(`'${key}', v_full -> '${key}'`));
    }
    assert.doesNotMatch(slim, /'title'/);
  });

  test('internal helpers are revoked; the seven client RPCs are granted', () => {
    assert.match(MIGRATION, /revoke all on function public\._table_payload\(uuid\) from public/);
    assert.match(MIGRATION, /revoke all on function public\._table_touch_guest\(uuid, text\) from public/);
    for (const signature of [
      'start_table\\(uuid, uuid\\[\\], text, timestamptz\\)',
      'get_table\\(uuid\\)',
      'get_table_decide\\(uuid\\)',
      'join_table\\(uuid, text, text\\)',
      'cast_table_vote\\(uuid, uuid, text, smallint\\)',
      'add_table_place\\(uuid, uuid, text\\)',
      'lock_table\\(uuid, text, uuid\\)',
    ]) {
      assert.match(
        MIGRATION,
        new RegExp(
          `grant execute on function public\\.${signature} to anon, authenticated, service_role`
        )
      );
    }
  });

  test('every RAISE code the RPCs throw is mapped by mapTableError', () => {
    const raised = [...MIGRATION.matchAll(/RAISE EXCEPTION '([a-z_]+)'/g)].map((m) => m[1]);
    assert.ok(raised.length >= 10, `expected RAISE codes, got ${raised.length}`);
    for (const code of new Set(raised)) {
      const mapped = mapTableError(code);
      // A code that maps to itself is fine; what must not happen is falling into
      // `unknown`, which the UI shows as "Something went wrong".
      assert.notEqual(mapped, 'unknown', `unmapped RPC error code: ${code}`);
    }
  });

  test('the schema doc points at the merge and the name-gate follow-up', () => {
    const doc = fs.readFileSync(path.join(ROOT, 'docs/db/tables-schema.sql'), 'utf8');
    assert.match(doc, new RegExp(MERGE_PATH.replace(/[/.]/g, '\\$&')));
    assert.match(doc, new RegExp(NAME_GATE_PATH.replace(/[/.]/g, '\\$&')));
  });

  test('the data wipe truncates the Table tables and no longer names the old ones', () => {
    const wipe = fs.readFileSync(path.join(ROOT, 'docs/db/empty-all-application-data.sql'), 'utf8');
    for (const table of ['tables', 'table_places', 'table_guests', 'table_votes']) {
      assert.match(wipe, new RegExp(`public\\.${table},`));
    }
    assert.doesNotMatch(wipe, /public\.nights|public\.night_|public\.list_decide_/);
  });
});
