#!/usr/bin/env node
/**
 * Post-deploy database contract check.
 *
 * Why this exists: `supabase/migrations/*.sql` is gitignored and `npm run
 * supabase:link` is pinned to the dev project ref, so nothing in this repo can
 * migrate production. The app ships to Vercel independently of the database, so
 * a feature can go fully live with its tables and RPCs missing. That happened to
 * Tonight: every night RPC was absent on production, PostgREST returned
 * PGRST202, and the error mapper collapsed it to the generic
 * "Something went wrong. Try again." — indistinguishable from a network blip.
 *
 * This asserts the shipped code's database contract actually exists on a target
 * project, using only the REST endpoint and the service key (no DB password).
 *
 * Usage:
 *   node scripts/check-db-contract.mjs                 # checks .env.local
 *   node scripts/check-db-contract.mjs --env production
 *   node scripts/check-db-contract.mjs --env both
 *
 * Exit code 1 if anything required is missing.
 */

import fs from 'node:fs';
import path from 'node:path';

/** Tables the Table feature stores its state in (service_role only — probed with the service key). */
const REQUIRED_TABLES = ['tables', 'table_places', 'table_guests', 'table_votes'];

/**
 * RPCs the app calls, with arguments that fail *before* any write so the probe
 * never mutates data. A function that exists rejects on its own validation; a
 * missing one returns PostgREST error PGRST202.
 */
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
const REQUIRED_RPCS = [
  // start_table raises not_authenticated for the service key (no auth.uid()), the rest
  // raise table_not_found on the zero uuid — every one of them before any INSERT.
  { name: 'start_table', args: { p_list_id: ZERO_UUID, p_restaurant_ids: [ZERO_UUID, ZERO_UUID, ZERO_UUID], p_title: 'contract-check', p_starts_at: null } },
  { name: 'get_table', args: { p_table_id: ZERO_UUID } },
  { name: 'get_table_decide', args: { p_table_id: ZERO_UUID } },
  { name: 'join_table', args: { p_table_id: ZERO_UUID, p_guest_key: 'contract-check', p_display_name: 'contract-check' } },
  { name: 'cast_table_vote', args: { p_table_id: ZERO_UUID, p_restaurant_id: ZERO_UUID, p_guest_key: 'contract-check', p_vote: 1 } },
  { name: 'add_table_place', args: { p_table_id: ZERO_UUID, p_restaurant_id: ZERO_UUID, p_guest_key: 'contract-check' } },
  { name: 'lock_table', args: { p_table_id: ZERO_UUID, p_lock_token: null, p_winner_restaurant_id: null } },
];

/** @param {string} file */
function readEnvFile(file) {
  if (!fs.existsSync(file)) return null;
  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter((l) => /^[A-Z0-9_]+=/.test(l))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, '')];
      })
  );
}

/**
 * @param {string} label
 * @param {string} file
 * @returns {Promise<boolean>} true when the contract holds
 */
async function checkTarget(label, file) {
  const env = readEnvFile(path.resolve(process.cwd(), file));
  if (!env) {
    console.error(`${label}: ${file} not found — skipped`);
    return true;
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(`${label}: missing NEXT_PUBLIC_SUPABASE_URL or service key in ${file} — skipped`);
    return true;
  }
  const ref = (url.match(/\/\/([a-z0-9]+)\./) || [])[1] || url;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  const tableResults = await Promise.all(
    REQUIRED_TABLES.map(async (table) => {
      const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=0`, { headers });
      return res.status === 200 ? null : `table ${table} (http ${res.status})`;
    })
  );

  const rpcResults = await Promise.all(
    REQUIRED_RPCS.map(async (rpc) => {
      const res = await fetch(`${url}/rest/v1/rpc/${rpc.name}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(rpc.args),
      });
      const body = await res.text();
      // PGRST202 = "no matches were found in the schema cache" -> function absent.
      return body.includes('PGRST202') ? `rpc ${rpc.name}()` : null;
    })
  );

  const missing = [...tableResults, ...rpcResults].filter(Boolean);

  if (missing.length) {
    console.error(`FAIL ${label} (${ref}) — ${missing.length} missing:`);
    missing.forEach((m) => console.error(`  - ${m}`));
    return false;
  }
  console.log(`OK   ${label} (${ref}) — ${REQUIRED_TABLES.length} tables, ${REQUIRED_RPCS.length} RPCs present`);
  return true;
}

const which = (process.argv.includes('--env') && process.argv[process.argv.indexOf('--env') + 1]) || 'local';

const TARGETS_BY_ENV = {
  both: [
    ['dev ', '.env.local'],
    ['prod', '.env.production'],
  ],
  production: [['prod', '.env.production']],
  local: [['dev ', '.env.local']],
};
const targets = TARGETS_BY_ENV[which] || TARGETS_BY_ENV.local;

// Sequential per target: interleaved output across projects is unreadable.
const results = [];
for (const [label, file] of targets) {
  results.push(await checkTarget(label, file)); // eslint-disable-line no-await-in-loop
}
const ok = results.every(Boolean);
if (!ok) {
  console.error('\nDatabase contract check failed. The deployed app calls RPCs that do not exist');
  console.error('on the target project — users will see "Something went wrong. Try again."');
  console.error('Apply the pending migrations to that project before shipping.');
  process.exit(1);
}
