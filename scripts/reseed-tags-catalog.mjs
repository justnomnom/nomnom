#!/usr/bin/env node
/**
 * Re-seed the controlled restaurant tag catalog (`tags` table).
 *
 * Usage:
 *   node scripts/reseed-tags-catalog.mjs
 *   npm run tags:reseed
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SQL_PATH = path.join(ROOT, 'docs', 'db', 'reseed-tags-catalog.sql');

/** @returns {{ connectionString: string }} */
function buildDbConfig() {
  const envFile = process.env.ENV_FILE || '.env.local';
  const envPath = path.isAbsolute(envFile) ? envFile : path.join(ROOT, envFile);
  const txt = fs.readFileSync(envPath, 'utf8');
  const match = txt.match(/^POSTGRES_PASSWORD=(.*)$/m);
  if (!match) throw new Error(`POSTGRES_PASSWORD missing in ${envFile}`);
  const pwd = encodeURIComponent(match[1].trim());
  const ref = process.env.SUPABASE_PROJECT_REF || 'jxknitagufcuyeozlazc';
  const poolerHost = process.env.SUPABASE_POOLER_HOST;
  if (poolerHost) {
    return {
      connectionString: `postgresql://postgres.${ref}:${pwd}@${poolerHost}:6543/postgres`,
    };
  }
  return {
    connectionString: `postgresql://postgres:${pwd}@db.${ref}.supabase.co:5432/postgres`,
  };
}

async function main() {
  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  const client = new pg.Client({
    ...buildDbConfig(),
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(sql);
    const { rows } = await client.query(
      `SELECT category, COUNT(*)::int AS n FROM public.tags GROUP BY category ORDER BY category`
    );
    const total = rows.reduce((sum, r) => sum + r.n, 0);
    console.log(`Seeded tag catalog (${total} tags).`);
    for (const row of rows) {
      console.log(`  ${row.category}: ${row.n}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
