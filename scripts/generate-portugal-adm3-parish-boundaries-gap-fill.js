/**
 * CAOP2025 ADM3 parish boundaries for active locality rows (batched migrations for remote push).
 * Run: node scripts/generate-portugal-adm3-parish-boundaries-gap-fill.js [--fresh]
 */
const fs = require('fs');
const path = require('path');
const { ensureAdm3Cache, escSql, loadAllCaopLocalities, ADM3_CACHE } = require('./lib/portugal-geography.cjs');

const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');
const BATCH_PREFIX = '2026061815';
const BATCH_START = 100;
const BATCH_STEP = 100;
/** Keep each migration small enough for Supabase pooler (monolithic ~68MB timed out). */
const PARISHES_PER_MIGRATION = 80;
const LEGACY_MONOLITH = path.join(MIGRATIONS_DIR, '20260618150000_portugal_parish_adm3_caop2025.sql');
const BATCH_GLOB_PREFIX = `${BATCH_PREFIX}`;

function slugDistrict(name) {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function buildMigrationSql(batchMatches, batchMeta) {
  const valueRows = batchMatches
    .map(
      (m) =>
        `  ('${escSql(m.district)}', '${escSql(m.parishName)}', ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($gj$\n${JSON.stringify(m.geom)}\n$gj$::text), 4326))))`
    )
    .join(',\n');

  return `-- Portugal: parish (ADM3) boundaries from CAOP2025 (batch ${batchMeta.index}/${batchMeta.total}).
-- CAOP2025 continental — https://www.dgterritorio.gov.pt/ (CC-BY 4.0, attribute DGT).
-- Azores/Madeira from geoBoundaries gbOpen PRT/ADM3 (CAOP OGC is continental only).
-- Districts in this batch: ${batchMeta.districts.join(', ')} (${batchMatches.length} parishes).
-- Regenerated via scripts/generate-portugal-adm3-parish-boundaries-gap-fill.js

CREATE TEMP TABLE _pt_freguesia_adm3_caop ON COMMIT DROP AS
SELECT * FROM (VALUES
${valueRows}
) AS t (district, parish_name, boundary);

UPDATE
  public.cities c
SET
  boundary = f.boundary,
  updated_at = now()
FROM
  public.states s
  INNER JOIN public.countries co ON co.id = s.country_id
  INNER JOIN _pt_freguesia_adm3_caop f ON f.district = s.name
WHERE
  c.state_id = s.id
  AND f.parish_name = c.name
  AND co.name = 'Portugal'
  AND c.active = TRUE
  AND c.is_municipality = FALSE;
`;
}

function removeOldBatchMigrations() {
  for (const name of fs.readdirSync(MIGRATIONS_DIR)) {
    if (
      name.startsWith(BATCH_GLOB_PREFIX) &&
      name.includes('_portugal_parish_adm3_caop2025') &&
      name.endsWith('.sql')
    ) {
      fs.unlinkSync(path.join(MIGRATIONS_DIR, name));
    }
  }
  if (fs.existsSync(LEGACY_MONOLITH)) {
    fs.unlinkSync(LEGACY_MONOLITH);
  }
}

function chunkMatches(matches) {
  const batches = [];
  for (let i = 0; i < matches.length; i += PARISHES_PER_MIGRATION) {
    batches.push(matches.slice(i, i + PARISHES_PER_MIGRATION));
  }
  return batches;
}

async function main() {
  const fresh = process.argv.includes('--fresh');
  if (fresh && fs.existsSync(ADM3_CACHE)) {
    fs.unlinkSync(ADM3_CACHE);
    console.error(`Removed stale cache ${ADM3_CACHE}`);
  }
  await ensureAdm3Cache();

  const rows = loadAllCaopLocalities().map((r) => ({
    district: r.district,
    parishName: r.name,
    geom: r.geom,
  }));
  const matches = rows.filter((r) => r.geom);

  matches.sort(
    (a, b) => a.district.localeCompare(b.district) || a.parishName.localeCompare(b.parishName)
  );

  removeOldBatchMigrations();

  const batches = chunkMatches(matches);
  const written = [];

  batches.forEach((batchMatches, idx) => {
    const ts = String(BATCH_START + idx * BATCH_STEP).padStart(4, '0');
    const districts = [...new Set(batchMatches.map((m) => m.district))];
    const slug = districts.length === 1 ? slugDistrict(districts[0]) : `part${idx + 1}`;
    const outPath = path.join(
      MIGRATIONS_DIR,
      `${BATCH_PREFIX}${ts}_portugal_parish_adm3_caop2025_${slug}.sql`
    );
    const sql = buildMigrationSql(batchMatches, {
      index: idx + 1,
      total: batches.length,
      districts,
    });
    fs.writeFileSync(outPath, sql);
    written.push({ outPath, count: batchMatches.length, districts });
  });

  for (const w of written) {
    console.log(`Wrote ${w.outPath} (${w.count} parishes: ${w.districts.join(', ')})`);
  }
  console.log(
    `Total: ${matches.length} parishes in ${written.length} batches`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
