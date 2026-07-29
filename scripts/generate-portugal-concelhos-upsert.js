/**
 * Generate migration: upsert all Portugal concelhos (geoBoundaries ADM2) with is_concelho=true.
 * Restaurants resolve to concelhos; CAOP freguesias are active localities for onboarding.
 * Run: node scripts/generate-portugal-concelhos-upsert.js
 *
 * Output targets frozen migration 20260611140000 (pre-international naming). Current schema
 * uses is_municipality / parent_municipality_id after 20260615120000_geography_international_naming.sql.
 * Do not regenerate over applied files unless you are rebuilding the full migration chain from scratch.
 *
 * TWICE STALE — if you ever do rebuild the chain, the emitted SQL needs two edits:
 *   1. `restaurants.municipality_id` was renamed to `restaurants.locality_id` in
 *      20260722126000. This script still emits the old name.
 *   2. `assign_restaurant_municipality` was dropped in 20260722121000 (no callers).
 *      This script still emits it.
 */
const fs = require('fs');
const path = require('path');
const { escSql, geomJsonLiteral, loadAdm2Concelhos } = require('./lib/portugal-geography.cjs');

const OUT = path.join(
  __dirname,
  '../supabase/migrations/20260611140000_portugal_concelhos_municipality_resolution.sql'
);

function main() {
  const { concelhos } = loadAdm2Concelhos({ skipLisbonPorto: false });

  const valueRows = concelhos
    .map(
      (c) =>
        `  ('${escSql(c.district)}', '${escSql(c.name)}', ${c.lat}, ${c.lng}, '${geomJsonLiteral(c.geom)}'::jsonb)`
    )
    .join(',\n');

  const sql = `-- Portugal: official concelhos (ADM2) for restaurant municipality_id resolution.
-- CSC parishes remain active for onboarding; restaurants resolve to is_concelho rows.
-- geoBoundaries gbOpen — https://www.geoboundaries.org/

ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS is_concelho boolean NOT NULL DEFAULT FALSE;

ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS concelho_city_id uuid REFERENCES public.cities (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS cities_is_concelho_idx ON public.cities (is_concelho)
WHERE
  is_concelho;

CREATE TEMP TABLE _pt_concelho_upsert ON COMMIT DROP AS
SELECT
  v.district_name,
  v.city_name,
  v.latitude,
  v.longitude,
  ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(v.geojson::text), 4326))) AS boundary
FROM (
  VALUES
${valueRows}
) AS v (district_name, city_name, latitude, longitude, geojson);

-- Promote existing CSC/locality rows that share a concelho name to the official boundary.
UPDATE
  public.cities c
SET
  is_concelho = TRUE,
  boundary = v.boundary,
  latitude = v.latitude,
  longitude = v.longitude,
  concelho_city_id = NULL,
  updated_at = now()
FROM
  _pt_concelho_upsert v
  INNER JOIN public.states s ON s.name = v.district_name
  INNER JOIN public.countries co ON co.id = s.country_id
    AND co.name = 'Portugal'
WHERE
  c.state_id = s.id
  AND c.name = v.city_name;

-- Insert concelhos that have no matching city row (inactive — not shown in onboarding).
INSERT INTO public.cities (state_id, name, active, latitude, longitude, boundary, is_concelho)
SELECT
  s.id,
  v.city_name,
  FALSE,
  v.latitude,
  v.longitude,
  v.boundary,
  TRUE
FROM
  _pt_concelho_upsert v
  INNER JOIN public.states s ON s.name = v.district_name
  INNER JOIN public.countries co ON co.id = s.country_id
    AND co.name = 'Portugal'
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      public.cities c
    WHERE
      c.state_id = s.id
      AND c.name = v.city_name);

-- Link CSC parishes to their parent concelho.
UPDATE
  public.cities p
SET
  concelho_city_id = sub.concelho_id,
  updated_at = now()
FROM (
  SELECT
    p2.id AS parish_id,
    (
      SELECT
        c.id
      FROM
        public.cities c
      WHERE
        c.is_concelho
        AND c.state_id = p2.state_id
        AND c.boundary IS NOT NULL
        AND ST_Contains(c.boundary, ST_SetSRID(ST_MakePoint(p2.longitude, p2.latitude), 4326))
      ORDER BY
        ST_Area(c.boundary::geography) ASC
      LIMIT 1) AS concelho_id
  FROM
    public.cities p2
    INNER JOIN public.states s ON s.id = p2.state_id
    INNER JOIN public.countries co ON co.id = s.country_id
      AND co.name = 'Portugal'
  WHERE
    NOT p2.is_concelho) sub
WHERE
  p.id = sub.parish_id
  AND sub.concelho_id IS NOT NULL;

-- Reassign restaurants to concelho polygons (full ADM2 coverage).
UPDATE
  public.restaurants r
SET
  municipality_id = m.concelho_id,
  updated_at = now()
FROM (
  SELECT
    r2.id AS restaurant_id,
    (
      SELECT
        c.id
      FROM
        public.cities c
        INNER JOIN public.states s ON s.id = c.state_id
        INNER JOIN public.countries co ON co.id = s.country_id
          AND co.name = 'Portugal'
      WHERE
        c.is_concelho
        AND c.boundary IS NOT NULL
        AND ST_Contains(c.boundary, r2.location::geometry)
      ORDER BY
        ST_Area(c.boundary::geography) ASC
      LIMIT 1) AS concelho_id
  FROM
    public.restaurants r2
  WHERE
    r2.location IS NOT NULL) m
WHERE
  r.id = m.restaurant_id
  AND m.concelho_id IS NOT NULL
  AND (r.municipality_id IS DISTINCT FROM m.concelho_id);

CREATE OR REPLACE FUNCTION public.concelho_id_for_city (p_city_id uuid)
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT
    CASE WHEN c.is_concelho THEN
      c.id
    ELSE
      COALESCE(c.concelho_city_id, c.id)
    END
  FROM
    public.cities c
  WHERE
    c.id = p_city_id;
$$;

COMMENT ON FUNCTION public.concelho_id_for_city (uuid) IS 'Maps onboarding locality (CSC parish) or concelho row to restaurants.municipality_id (concelho).';

REVOKE ALL ON FUNCTION public.concelho_id_for_city (uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.concelho_id_for_city (uuid) TO anon;

GRANT EXECUTE ON FUNCTION public.concelho_id_for_city (uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.concelho_for_point (
  lng double precision,
  lat double precision
)
  RETURNS TABLE (
    id uuid,
    municipality_name text,
    city_slug text,
    country_name text
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $fn$
  SELECT
    c.id,
    c.name AS municipality_name,
    public.wire_slug_from_text (c.name) AS city_slug,
    c0.name AS country_name
  FROM
    public.cities c
    INNER JOIN public.states s ON s.id = c.state_id
    INNER JOIN public.countries c0 ON c0.id = s.country_id
  WHERE
    c.is_concelho
    AND s.active
    AND c0.active
    AND c.boundary IS NOT NULL
    AND ST_Contains (c.boundary, ST_SetSRID (ST_MakePoint (lng, lat), 4326))
  ORDER BY
    ST_Area (c.boundary::geography) ASC
  LIMIT 1;
$fn$;

COMMENT ON FUNCTION public.concelho_for_point (double precision, double precision) IS 'Smallest containing concelho polygon; id is public.cities.id (is_concelho=true).';

CREATE OR REPLACE FUNCTION public.assign_restaurant_municipality (p_restaurant_id uuid)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $fn$
DECLARE
  v_loc geography;
  v_city uuid;
BEGIN
  SELECT
    r.location INTO v_loc
  FROM
    public.restaurants r
  WHERE
    r.id = p_restaurant_id;
  IF v_loc IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT
    c.id INTO v_city
  FROM
    public.cities c
    INNER JOIN public.states s ON s.id = c.state_id
    INNER JOIN public.countries co ON co.id = s.country_id
  WHERE
    co.name = 'Portugal'
    AND c.is_concelho
    AND c.boundary IS NOT NULL
    AND ST_Contains (c.boundary, v_loc::geometry)
  ORDER BY
    ST_Area (c.boundary::geography) ASC
  LIMIT 1;
  IF v_city IS NULL THEN
    RETURN NULL;
  END IF;
  UPDATE
    public.restaurants
  SET
    municipality_id = v_city,
    updated_at = now()
  WHERE
    id = p_restaurant_id;
  RETURN v_city;
END;
$fn$;

COMMENT ON FUNCTION public.assign_restaurant_municipality (uuid) IS 'Sets municipality_id to smallest containing concelho (is_concelho=true).';
`;

  fs.writeFileSync(OUT, sql, 'utf8');
  const stats = {};
  for (const c of concelhos) stats[c.district] = (stats[c.district] || 0) + 1;
  console.log('wrote', OUT);
  console.log('bytes', fs.statSync(OUT).size);
  console.log('concelhos', concelhos.length);
  console.log('per district', stats);
}

main();
