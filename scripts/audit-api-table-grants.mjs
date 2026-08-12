#!/usr/bin/env node
/**
 * Live audit: every GRANT in docs/db/api-table-grants.sql must exist for
 * anon / authenticated / service_role (full privilege set, not SELECT-only).
 * Also fails if a new public table is missing from that file (except the allowlist).
 *
 * Usage:
 *   npm run db:audit-grants
 *   ENV_FILE=.env.production SUPABASE_PROJECT_REF=… SUPABASE_POOLER_HOST=… npm run db:audit-grants
 *   npm run db:apply-grants   # apply the SQL, then re-audit
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { fileURLToPath } from 'node:url';

import {
  LIVE_API_TABLE_GRANTS_SQL,
  LIVE_PUBLIC_TABLES_SQL,
  buildLiveGrantMap,
  diffLiveApiTableGrants,
  findMissingCriticalAuthenticatedSelectGrants,
  findMissingCriticalAuthenticatedWriteGrants,
  findMissingCriticalServiceRoleWriteGrants,
  findUngrantedPublicTables,
  parseApiTableGrantSql,
} from '../src/libs/db/api-table-grants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SQL_PATH = path.join(ROOT, 'docs', 'db', 'api-table-grants.sql');

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
  const apply = process.argv.includes('--apply');
  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  const expected = parseApiTableGrantSql(sql);

  const client = new pg.Client({
    ...buildDbConfig(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    if (apply) {
      await client.query(sql);
      console.log(`Applied ${SQL_PATH}`);
    }

    const [{ rows: liveRows }, { rows: tableRows }] = await Promise.all([
      client.query(LIVE_API_TABLE_GRANTS_SQL),
      client.query(LIVE_PUBLIC_TABLES_SQL),
    ]);

    const liveMap = buildLiveGrantMap(liveRows);
    const { missingPrivileges, forbiddenPrivileges } = diffLiveApiTableGrants(expected, liveRows);
    const missingCriticalWrites = findMissingCriticalAuthenticatedWriteGrants(liveMap);
    const missingCriticalSelects = findMissingCriticalAuthenticatedSelectGrants(liveMap);
    const missingServiceRoleWrites = findMissingCriticalServiceRoleWriteGrants(liveMap);
    const ungranted = findUngrantedPublicTables(
      tableRows.map((r) => r.table_name),
      expected
    );

    if (missingPrivileges.length) {
      console.error('Missing API table grants (vs docs/db/api-table-grants.sql):');
      for (const row of missingPrivileges) {
        console.error(`  ${row.table} → ${row.role}: missing ${row.privilege}`);
      }
    }
    if (forbiddenPrivileges.length) {
      console.error('Forbidden API table grants (money-path / service-role-only rules):');
      for (const row of forbiddenPrivileges) {
        console.error(`  ${row.table} → ${row.role}: unexpected ${row.privilege}`);
      }
    }
    if (missingCriticalWrites.length) {
      console.error('Critical authenticated write grants missing:');
      for (const row of missingCriticalWrites) {
        console.error(`  ${row.table} → ${row.role}: missing ${row.privilege}`);
      }
    }
    if (missingCriticalSelects.length) {
      console.error('Critical authenticated SELECT grants missing (Lists hub / paywall):');
      for (const row of missingCriticalSelects) {
        console.error(`  ${row.table} → ${row.role}: missing ${row.privilege}`);
      }
    }
    if (missingServiceRoleWrites.length) {
      console.error('Critical service_role write grants missing (Stripe webhooks):');
      for (const row of missingServiceRoleWrites) {
        console.error(`  ${row.table} → ${row.role}: missing ${row.privilege}`);
      }
    }
    if (ungranted.length) {
      console.error('Public tables not listed in docs/db/api-table-grants.sql:');
      for (const table of ungranted) {
        console.error(`  ${table}`);
      }
      console.error('Add GRANT lines for each (see docs/db/api-table-grants.sql header).');
    }

    if (
      missingPrivileges.length ||
      forbiddenPrivileges.length ||
      missingCriticalWrites.length ||
      missingCriticalSelects.length ||
      missingServiceRoleWrites.length ||
      ungranted.length
    ) {
      process.exitCode = 1;
      return;
    }

    console.log(
      `API table grants OK (${expected.size} tables; business-rule privilege set for anon/authenticated/service_role).`
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
