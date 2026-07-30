#!/usr/bin/env node
/**
 * Apply generated SQL batch files via direct Postgres connection (faster than per-batch CLI).
 *
 * Usage:
 *   node scripts/apply-sql-batches.mjs .tmp/reseed-cont-3
 *   node scripts/apply-sql-batches.mjs .tmp/reseed-cont-3 --start 42
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

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

/** @param {string} dir @param {number} startBatch */
async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error('Usage: node scripts/apply-sql-batches.mjs <batch-dir> [--start N]');
    process.exit(1);
  }
  const startIdx = process.argv.indexOf('--start');
  const startBatch = startIdx >= 0 ? Number.parseInt(process.argv[startIdx + 1], 10) : 1;

  const files = fs
    .readdirSync(dir)
    .filter((f) => /^batch-\d+\.sql$/.test(f))
    .sort()
    .map((f) => path.join(dir, f))
    .filter((_, i) => i + 1 >= startBatch);

  const client = new pg.Client({
    ...buildDbConfig(),
    ssl: { rejectUnauthorized: false },
    statement_timeout: 0,
    query_timeout: 0,
  });

  await client.connect();
  process.stderr.write(`connected; applying ${files.length} batches from ${dir} (start ${startBatch})\n`);

  try {
    for (const file of files) {
      const sql = fs.readFileSync(file, 'utf8');
      const started = Date.now();
      process.stderr.write(`applying ${path.basename(file)} (${sql.length} bytes)...\n`);
      await client.query(sql);
      process.stderr.write(`  ok in ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
    }
    console.log(`Applied ${files.length} batches.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
