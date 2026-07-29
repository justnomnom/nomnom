/**
 * Insert CAOP2025 freguesias as active locality rows (idempotent — skips existing names).
 * Run: node scripts/generate-portugal-caop-localities-gap-fill.js
 */
const fs = require('fs');
const path = require('path');
const { ensureAdm3Cache, escSql, loadAllCaopLocalities } = require('./lib/portugal-geography.cjs');

const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');
const BATCH_PREFIX = '2026061817';
const BATCH_START = 100;
const BATCH_STEP = 100;
const LOCALITIES_PER_MIGRATION = 50;
const BATCH_GLOB_PREFIX = `${BATCH_PREFIX}`;

function slugDistrict(name) {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function buildMigrationSql(batchRows, batchMeta) {
  const valueRows = batchRows
    .map(
      (row) =>
        `  ('${escSql(row.district)}', '${escSql(row.name)}', ${row.municipalityName ? `'${escSql(row.municipalityName)}'` : 'NULL'}, ${row.lat}, ${row.lng}, ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($gj$\n${JSON.stringify(row.geom)}\n$gj$::text), 4326))))`
    )
    .join(',\n');

  return `-- Portugal: CAOP2025 freguesias as onboarding localities (batch ${batchMeta.index}/${batchMeta.total}).
-- Districts in this batch: ${batchMeta.districts.join(', ')} (${batchRows.length} localities).
-- Regenerated via scripts/generate-portugal-caop-localities-gap-fill.js

CREATE TEMP TABLE _pt_caop_locality_gap ON COMMIT DROP AS
SELECT * FROM (VALUES
${valueRows}
) AS t (district, locality_name, municipality_name, latitude, longitude, boundary);

INSERT INTO public.cities (state_id, name, active, latitude, longitude, boundary, is_municipality, parent_municipality_id)
SELECT
  s.id,
  v.locality_name,
  TRUE,
  v.latitude,
  v.longitude,
  v.boundary,
  FALSE,
  mun.id
FROM
  _pt_caop_locality_gap v
  INNER JOIN public.states s ON s.name = v.district
  INNER JOIN public.countries co ON co.id = s.country_id
    AND co.name = 'Portugal'
  LEFT JOIN public.cities mun ON mun.state_id = s.id
    AND mun.is_municipality = TRUE
    AND mun.name = v.municipality_name
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      public.cities c
    WHERE
      c.state_id = s.id
      AND c.name = v.locality_name
      AND c.is_municipality = FALSE);
`;
}

function removeOldBatchMigrations() {
  for (const name of fs.readdirSync(MIGRATIONS_DIR)) {
    if (
      name.startsWith(BATCH_GLOB_PREFIX) &&
      name.includes('_portugal_caop_localities_gap_fill') &&
      name.endsWith('.sql')
    ) {
      fs.unlinkSync(path.join(MIGRATIONS_DIR, name));
    }
  }
}

function chunkRows(rows) {
  const batches = [];
  for (let i = 0; i < rows.length; i += LOCALITIES_PER_MIGRATION) {
    batches.push(rows.slice(i, i + LOCALITIES_PER_MIGRATION));
  }
  return batches;
}

async function main() {
  await ensureAdm3Cache();

  const rows = loadAllCaopLocalities();
  rows.sort((a, b) => a.district.localeCompare(b.district) || a.name.localeCompare(b.name));

  const withoutMunicipality = rows.filter((row) => !row.municipalityName);
  for (const row of withoutMunicipality) {
    console.warn(`No parent municipality: ${row.name} (${row.district})`);
  }

  removeOldBatchMigrations();

  const batches = chunkRows(rows);
  const written = [];

  batches.forEach((batchRows, idx) => {
    const ts = String(BATCH_START + idx * BATCH_STEP).padStart(4, '0');
    const districts = [...new Set(batchRows.map((row) => row.district))];
    const slug = districts.length === 1 ? slugDistrict(districts[0]) : `part${idx + 1}`;
    const outPath = path.join(
      MIGRATIONS_DIR,
      `${BATCH_PREFIX}${ts}_portugal_caop_localities_gap_fill_${slug}.sql`
    );
    const sql = buildMigrationSql(batchRows, {
      index: idx + 1,
      total: batches.length,
      districts,
    });
    fs.writeFileSync(outPath, sql);
    written.push({ outPath, count: batchRows.length, districts });
  });

  for (const w of written) {
    console.log(`Wrote ${w.outPath} (${w.count} localities: ${w.districts.join(', ')})`);
  }
  console.log(
    `Total: ${rows.length} CAOP localities in ${written.length} batches (${withoutMunicipality.length} without parent municipality)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
