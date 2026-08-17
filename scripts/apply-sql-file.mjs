#!/usr/bin/env node
/**
 * Apply one .sql file to dev or production over a direct Postgres connection.
 *
 * `supabase db push` is hardcoded to the dev ref and the logged-in CLI account
 * 403s on the production project, so migration-bearing work reaches prod only
 * through `pg` with POSTGRES_PASSWORD out of .env.production (see CLAUDE.md).
 *
 * Usage:
 *   node scripts/apply-sql-file.mjs supabase/migrations/foo.sql            # dev
 *   node scripts/apply-sql-file.mjs supabase/migrations/foo.sql --env production
 *
 * The file is sent as a single statement batch, so wrap it in begin/commit if
 * you want all-or-nothing.
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const TARGETS = {
  dev: { envFile: '.env.local', ref: 'jxknitagufcuyeozlazc' },
  production: { envFile: '.env.production', ref: 'hjknsbgtjzgjsfkkaktm' },
};

/** @param {string} envFile @returns {string} */
function readPassword(envFile) {
  const full = path.join(ROOT, envFile);
  if (!fs.existsSync(full)) throw new Error(`${envFile} not found`);
  const m = fs.readFileSync(full, 'utf8').match(/^POSTGRES_PASSWORD=(.*)$/m);
  if (!m) throw new Error(`POSTGRES_PASSWORD missing in ${envFile}`);
  return m[1].trim().replace(/^["']|["']$/g, '');
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const envIdx = args.indexOf('--env');
  const envName = envIdx >= 0 ? args[envIdx + 1] : 'dev';
  const target = TARGETS[envName];

  if (!file) throw new Error('usage: apply-sql-file.mjs <file.sql> [--env dev|production]');
  if (!target) throw new Error(`unknown --env ${envName} (expected dev or production)`);

  const sqlPath = path.isAbsolute(file) ? file : path.join(ROOT, file);
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = new pg.Client({
    connectionString: `postgresql://postgres:${encodeURIComponent(
      readPassword(target.envFile)
    )}@db.${target.ref}.supabase.co:5432/postgres`,
    ssl: { rejectUnauthorized: false },
  });

  console.log(`→ ${envName} (${target.ref}) ← ${path.relative(ROOT, sqlPath)}`);
  await client.connect();
  try {
    await client.query(sql);
    console.log(`OK   applied to ${envName}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`FAIL ${err.message}`);
  process.exit(1);
});
