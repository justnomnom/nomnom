#!/usr/bin/env node
/**
 * Re-seed Portugal geography after a full data wipe (countries → states → municipalities → localities).
 * Downloads geoBoundaries + CAOP caches when missing, writes SQL batches to .tmp/reseed/,
 * optionally applies them via Supabase MCP execute_sql (agent) or manual psql.
 *
 * Usage:
 *   node scripts/reseed-portugal-geography.mjs
 *   node scripts/reseed-portugal-geography.mjs --apply-linked
 *   node scripts/reseed-portugal-geography.mjs --localities-only --skip-localities 180 --batch-size 20
 *
 * npm run geo:pt:reseed
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { config as loadEnv } from 'dotenv';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DEFAULT_OUT_DIR = path.join(ROOT, '.tmp', 'reseed');
const DEFAULT_LOCALITIES_PER_BATCH = 60;

/** @param {string} flag @param {number} fallback */
function readIntFlag(flag, fallback) {
  const eq = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (eq) return Number.parseInt(eq.split('=')[1], 10);
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1]) return Number.parseInt(process.argv[idx + 1], 10);
  return fallback;
}

loadEnv({ path: path.join(ROOT, '.env.local') });
loadEnv({ path: path.join(ROOT, '.env') });

const require = createRequire(import.meta.url);
const {
  ADM1_CACHE,
  ADM2_CACHE,
  ensureAdm3Cache,
  escSql,
  geomJsonLiteral,
  geomToSql,
  loadAdm1Districts,
  loadAdm2Concelhos,
  loadAllCaopLocalities,
} = require('./lib/portugal-geography.cjs');

/** @param {string} iso @param {string} level @param {string} outPath */
async function ensureGeoBoundariesCache(iso, level, outPath) {
  if (fs.existsSync(outPath)) {
    process.stderr.write(`cache hit ${path.basename(outPath)}\n`);
    return;
  }
  const metaUrl = `https://www.geoboundaries.org/api/current/gbOpen/${iso}/${level}/`;
  process.stderr.write(`fetching ${metaUrl}\n`);
  const metaRes = await fetch(metaUrl);
  if (!metaRes.ok) throw new Error(`geoBoundaries meta ${level} failed: ${metaRes.status}`);
  const meta = await metaRes.json();
  const gjRes = await fetch(meta.gjDownloadURL);
  if (!gjRes.ok) throw new Error(`geoBoundaries ${level} GeoJSON failed: ${gjRes.status}`);
  const gj = await gjRes.json();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(gj));
  process.stderr.write(`wrote ${outPath} (${gj.features?.length ?? 0} features)\n`);
}

/** @returns {string} */
function buildFoundationSql() {
  const districts = loadAdm1Districts();
  const stateValues = districts
    .map((d) => `  ('${escSql(d.name)}', ${d.centroid[1]}, ${d.centroid[0]}, ${geomToSql(d.geom)})`)
    .join(',\n');

  return `-- Portugal foundation: country + districts (geoBoundaries ADM1)
INSERT INTO public.countries (name, active, latitude, longitude)
SELECT 'Portugal', TRUE, 39.5, -8.0
WHERE NOT EXISTS (SELECT 1 FROM public.countries WHERE name = 'Portugal');

INSERT INTO public.states (country_id, name, active, latitude, longitude, boundary)
SELECT
  co.id,
  v.state_name,
  TRUE,
  v.latitude,
  v.longitude,
  v.boundary
FROM
  public.countries co
  INNER JOIN (
    VALUES
${stateValues}
  ) AS v (state_name, latitude, longitude, boundary) ON TRUE
WHERE
  co.name = 'Portugal'
  AND NOT EXISTS (
    SELECT 1 FROM public.states s WHERE s.country_id = co.id AND s.name = v.state_name);
`;
}

/** @returns {string} */
function buildMunicipalitiesSql() {
  const { concelhos } = loadAdm2Concelhos({ skipLisbonPorto: false });
  const valueRows = concelhos
    .map(
      (c) =>
        `  ('${escSql(c.district)}', '${escSql(c.name)}', ${c.lat}, ${c.lng}, '${geomJsonLiteral(c.geom)}'::jsonb)`
    )
    .join(',\n');

  return `-- Portugal municipalities (geoBoundaries ADM2 concelhos)
INSERT INTO public.cities (state_id, name, active, latitude, longitude, boundary, is_municipality)
SELECT
  s.id,
  v.city_name,
  FALSE,
  v.latitude,
  v.longitude,
  ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(v.geojson::text), 4326))),
  TRUE
FROM
  public.states s
  INNER JOIN public.countries co ON co.id = s.country_id
  INNER JOIN (
    VALUES
${valueRows}
  ) AS v (district_name, city_name, latitude, longitude, geojson) ON v.district_name = s.name
WHERE
  co.name = 'Portugal'
  AND NOT EXISTS (
    SELECT 1 FROM public.cities c
    WHERE c.state_id = s.id AND c.name = v.city_name AND c.is_municipality = TRUE);
`;
}

/**
 * @param {object[]} batchRows
 * @param {{ index: number, total: number }} meta
 * @returns {string}
 */
function buildLocalitiesBatchSql(batchRows, meta) {
  const valueRows = batchRows
    .map(
      (row) =>
        `  ('${escSql(row.district)}', '${escSql(row.name)}', ${row.municipalityName ? `'${escSql(row.municipalityName)}'` : 'NULL'}, ${row.lat}, ${row.lng}, ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($gj$\n${JSON.stringify(row.geom)}\n$gj$::text), 4326))))`
    )
    .join(',\n');

  return `-- Portugal CAOP localities batch ${meta.index}/${meta.total} (${batchRows.length} rows)
CREATE TEMP TABLE _pt_caop_locality_reseed ON COMMIT DROP AS
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
  _pt_caop_locality_reseed v
  INNER JOIN public.states s ON s.name = v.district
  INNER JOIN public.countries co ON co.id = s.country_id AND co.name = 'Portugal'
  LEFT JOIN public.cities mun ON mun.state_id = s.id
    AND mun.is_municipality = TRUE
    AND mun.name = v.municipality_name
WHERE
  NOT EXISTS (
    SELECT 1 FROM public.cities c
    WHERE c.state_id = s.id AND c.name = v.locality_name AND c.is_municipality = FALSE);
`;
}

/** @param {string[]} files */
async function applyBatchesViaManagementApi(files) {
  const projectRef = process.env.SUPABASE_PROJECT_REF || 'jxknitagufcuyeozlazc';
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.error('Set SUPABASE_ACCESS_TOKEN to use --apply (or apply .tmp/reseed/*.sql via Supabase SQL editor).');
    process.exit(1);
  }
  for (const file of files) {
    const sql = fs.readFileSync(file, 'utf8');
    process.stderr.write(`applying ${path.basename(file)} (${sql.length} bytes)...\n`);
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`apply failed ${path.basename(file)}: ${res.status} ${body}`);
    }
  }
}

/** @param {string[]} files @param {{ startBatch?: number, retries?: number }} opts */
function applyBatchesViaLinkedCli(files, opts = {}) {
  const startBatch = opts.startBatch ?? 1;
  const retries = opts.retries ?? 3;

  for (let i = 0; i < files.length; i += 1) {
    const batchNum = i + 1;
    if (batchNum < startBatch) continue;

    const file = files[i];
    let lastError = null;

    for (let attempt = 1; attempt <= retries; attempt += 1) {
      process.stderr.write(
        `applying ${path.basename(file)} via supabase db query --linked (attempt ${attempt}/${retries})...\n`
      );
      const result = spawnSync(
        'npx',
        ['supabase', 'db', 'query', '--linked', '--yes', '-f', file],
        { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' }
      );
      if (result.status === 0) {
        lastError = null;
        break;
      }
      lastError = new Error(`exit ${result.status}`);
      if (attempt < retries) {
        process.stderr.write(`retrying ${path.basename(file)} after transient failure...\n`);
      }
    }

    if (lastError) {
      throw new Error(`apply failed ${path.basename(file)} (${lastError.message})`);
    }
  }
}

async function main() {
  const apply = process.argv.includes('--apply');
  const applyLinked = process.argv.includes('--apply-linked');
  const localitiesOnly = process.argv.includes('--localities-only');
  const skipLocalities = readIntFlag('--skip-localities', 0);
  const localitiesPerBatch = readIntFlag('--batch-size', DEFAULT_LOCALITIES_PER_BATCH);
  const outDirArg = process.argv.find((a) => a.startsWith('--out-dir='));
  const outDir = outDirArg ? outDirArg.split('=')[1] : DEFAULT_OUT_DIR;
  const startBatch = readIntFlag('--start-batch', 1);

  fs.mkdirSync(outDir, { recursive: true });

  await ensureGeoBoundariesCache('PRT', 'ADM1', ADM1_CACHE);
  await ensureGeoBoundariesCache('PRT', 'ADM2', ADM2_CACHE);
  await ensureAdm3Cache();

  const localityRows = loadAllCaopLocalities();
  localityRows.sort((a, b) => a.district.localeCompare(b.district) || a.name.localeCompare(b.name));

  const withoutMunicipality = localityRows.filter((r) => !r.municipalityName);
  if (withoutMunicipality.length) {
    process.stderr.write(`warning: ${withoutMunicipality.length} localities without parent municipality\n`);
  }

  const remainingLocalities = localityRows.slice(skipLocalities);
  const batches = localitiesOnly ? [] : [buildFoundationSql(), buildMunicipalitiesSql()];

  const localityBatches = [];
  for (let i = 0; i < remainingLocalities.length; i += localitiesPerBatch) {
    localityBatches.push(remainingLocalities.slice(i, i + localitiesPerBatch));
  }
  localityBatches.forEach((rows, idx) => {
    batches.push(
      buildLocalitiesBatchSql(rows, { index: idx + 1, total: localityBatches.length })
    );
  });

  const files = batches.map((sql, idx) => {
    const file = path.join(outDir, `batch-${String(idx + 1).padStart(3, '0')}.sql`);
    fs.writeFileSync(file, sql, 'utf8');
    return file;
  });

  console.log(`Wrote ${files.length} SQL batches to ${outDir}`);
  if (localitiesOnly) {
    console.log(`  ${localityBatches.length} locality batches (${remainingLocalities.length} localities, skip ${skipLocalities}, size ${localitiesPerBatch})`);
  } else {
    console.log(`  foundation + municipalities + ${localityBatches.length} locality batches (${localityRows.length} localities)`);
  }

  if (apply) {
    await applyBatchesViaManagementApi(files);
    console.log('Applied all batches.');
  } else if (applyLinked) {
    applyBatchesViaLinkedCli(files, { startBatch });
    console.log('Applied all batches via linked Supabase CLI.');
  } else {
    console.log('Apply with: node scripts/reseed-portugal-geography.mjs --apply-linked');
    console.log('Or run each batch SQL file in Supabase SQL editor / MCP execute_sql.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
