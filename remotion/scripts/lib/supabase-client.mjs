// Shared Supabase access for the content-machine scripts.
// Same env contract as fetch-restaurant-props.mjs: .env.local / .env at repo root,
// service-role key, no session persistence.

import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REMOTION_ROOT = join(__dirname, '..', '..');
export const REPO_ROOT = join(REMOTION_ROOT, '..');

let client = null;

/** Supabase service-role client, created once per process. */
export function getSupabase() {
  if (client) return client;

  for (const f of ['.env.local', '.env']) {
    const p = join(REPO_ROOT, f);
    if (existsSync(p)) loadEnv({ path: p });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY). Checked .env.local and .env at repo root.'
    );
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

/** Split ids into request-sized chunks. */
export function chunk(items, size = 100) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * `select ... where <column> in (...)` across chunked ids, paging past the
 * PostgREST row cap so counts are never silently truncated.
 */
export async function selectIn(table, select, column, ids, { chunkSize = 100, pageSize = 1000 } = {}) {
  const sb = getSupabase();
  const rows = [];
  for (const ids_ of chunk(ids, chunkSize)) {
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await sb
        .from(table)
        .select(select)
        .in(column, ids_)
        .range(from, from + pageSize - 1);
      if (error) throw new Error(`${table}: ${error.message}`);
      rows.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
    }
  }
  return rows;
}
