/**
 * Generate migration: Portugal districts + concelhos (geoBoundaries ADM1/ADM2).
 * Skips Lisbon + Porto city rows (CAOP parish-level seed in 2026061817* migrations).
 * Run: node scripts/generate-portugal-full-seed.js
 */
const fs = require('fs');
const path = require('path');
const {
  SKIP_DISTRICTS,
  escSql,
  geomJsonLiteral,
  geomToSql,
  loadAdm2Concelhos,
} = require('./lib/portugal-geography.cjs');

const OUT = path.join(__dirname, '../supabase/migrations/20260611125000_portugal_all_districts_geoboundaries.sql');

function main() {
  const { districts, concelhos: cities } = loadAdm2Concelhos({ skipLisbonPorto: true });
  const newStates = districts.filter((d) => !SKIP_DISTRICTS.has(d.name));

  const stateBoundaryUpdates = newStates
    .map(
      (s) => `UPDATE public.states s
SET
  boundary = ${geomToSql(s.geom)},
  latitude = ${s.centroid[1]},
  longitude = ${s.centroid[0]},
  updated_at = now()
FROM
  public.countries co
WHERE
  s.country_id = co.id
  AND co.name = 'Portugal'
  AND s.name = '${escSql(s.name)}';`
    )
    .join('\n\n');

  const stateInserts = newStates
    .map((s) => `  ('${escSql(s.name)}', ${s.centroid[1]}, ${s.centroid[0]})`)
    .join(',\n');

  const cityValueRows = cities
    .map(
      (c) =>
        `  ('${escSql(c.district)}', '${escSql(c.name)}', ${c.lat}, ${c.lng}, '${geomJsonLiteral(c.geom)}'::jsonb)`
    )
    .join(',\n');

  const sql = `-- Portugal: all districts + concelhos (geoBoundaries gbOpen ADM1/ADM2 simplified).
-- https://www.geoboundaries.org/ — attribution required.
-- Lisbon + Porto cities unchanged (CAOP parish-level in 2026061817* migrations).
-- Onboarding locations = public.cities (no municipality rows).

INSERT INTO public.states (country_id, name, active, latitude, longitude)
SELECT
  co.id,
  v.state_name,
  TRUE,
  v.latitude,
  v.longitude
FROM
  public.countries co
  INNER JOIN (
    VALUES
${stateInserts}
  ) AS v (state_name, latitude, longitude) ON TRUE
WHERE
  co.name = 'Portugal'
  AND NOT EXISTS (
    SELECT
      1
    FROM
      public.states s
    WHERE
      s.country_id = co.id
      AND s.name = v.state_name);

${stateBoundaryUpdates}

INSERT INTO public.cities (state_id, name, active, latitude, longitude, boundary)
SELECT
  s.id,
  v.city_name,
  TRUE,
  v.latitude,
  v.longitude,
  ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(v.geojson::text), 4326)))
FROM
  public.states s
  INNER JOIN public.countries co ON co.id = s.country_id
  INNER JOIN (
    VALUES
${cityValueRows}
  ) AS v (district_name, city_name, latitude, longitude, geojson) ON v.district_name = s.name
WHERE
  co.name = 'Portugal'
  AND s.name NOT IN ('Lisbon', 'Porto')
  AND NOT EXISTS (
    SELECT
      1
    FROM
      public.cities c
    WHERE
      c.state_id = s.id
      AND c.name = v.city_name);
`;

  fs.writeFileSync(OUT, sql, 'utf8');
  const stats = {};
  for (const c of cities) stats[c.district] = (stats[c.district] || 0) + 1;
  console.log('wrote', OUT);
  console.log('bytes', fs.statSync(OUT).size);
  console.log('new states', newStates.length);
  console.log('cities', cities.length);
  console.log('per district', stats);
}

main();
