/**
 * Generates supabase/migrations/20260615120000_geography_international_naming.sql
 * from the latest applied geography RPC bodies.
 *
 * HISTORICAL — do not re-run against the current database. It reads live RPC bodies and
 * rewrites concelho/* names forward, but those bodies have since moved on: 20260722126000
 * renamed restaurants.municipality_id to locality_id. Re-running now would emit a migration
 * that reverses that rename and clashes with the frozen 20260615120000 output.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

/** @param {string} sql */
function internationalizeSql(sql) {
  return (
    sql
      .replace(/\bconcelho_for_point\b/g, 'municipality_for_point')
      .replace(/\bparish_for_point\b/g, 'locality_for_point')
      .replace(/\blist_location_parishes\b/g, 'list_location_localities')
      .replace(/\blist_location_municipalities\b/g, 'list_location_localities')
      .replace(/\bconcelho_id_for_city\b/g, 'municipality_id_for_city')
      .replace(/\bnearest_concelho_in_state\b/g, 'nearest_municipality_in_state')
      .replace(/\bresolve_concelho_for_point\b/g, 'resolve_municipality_for_point')
      .replace(/\bis_concelho\b/g, 'is_municipality')
      .replace(/\bconcelho_city_id\b/g, 'parent_municipality_id')
      .replace(/\bp_municipality_id\b/g, 'p_home_locality_id')
      .replace(/home_parish_id/g, 'home_locality_id')
      .replace(/parish UUID/g, 'locality UUID')
      .replace(/parishes for/g, 'localities for')
      .replace(/Active parishes/g, 'Active localities')
      .replace(/Parish rows/g, 'Locality rows')
      .replace(/parish \(cities\.id\)/gi, 'locality (cities.id)')
      .replace(/concelho via/g, 'municipality via')
      .replace(/concelho rows/g, 'municipality rows')
      .replace(/concelho polygon/g, 'municipality polygon')
      .replace(/concelho\)/g, 'municipality)')
      .replace(/concelho\./g, 'municipality.')
      .replace(/concelho /g, 'municipality ')
      .replace(/concelho,/g, 'municipality,')
  );
}

/** @param {string} file @param {RegExp} start @param {RegExp} end */
function extractBetween(file, start, end) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const si = text.search(start);
  if (si < 0) throw new Error(`start not found in ${file}`);
  const rest = text.slice(si);
  const em = rest.search(end);
  if (em < 0) throw new Error(`end not found in ${file}`);
  return rest.slice(0, em).trim();
}

const header = `-- International geography naming (locality / municipality).
-- Non-production: replaces parish/concelho column and RPC names.
-- restaurants.municipality_id unchanged (FK to municipality city rows).

-- ---------------------------------------------------------------------------
-- Columns & indexes
-- ---------------------------------------------------------------------------

ALTER TABLE public.cities
  RENAME COLUMN is_concelho TO is_municipality;

ALTER TABLE public.cities
  RENAME COLUMN concelho_city_id TO parent_municipality_id;

ALTER INDEX IF EXISTS cities_is_concelho_idx
  RENAME TO cities_is_municipality_idx;

ALTER TABLE public.users
  RENAME COLUMN home_parish_id TO home_locality_id;

ALTER INDEX IF EXISTS idx_users_home_parish_id
  RENAME TO idx_users_home_locality_id;

COMMENT ON COLUMN public.users.home_locality_id IS
  'Home locality (cities.id where is_municipality = false and active = true).';

ALTER TABLE public.user_location_follows
  RENAME COLUMN parish_id TO locality_id;

COMMENT ON COLUMN public.user_location_follows.locality_id IS
  'Locality cities.id; primary row mirrors users.home_locality_id (sort_order 0).';

-- ---------------------------------------------------------------------------
-- Drop RPCs that change parameter names (Postgres cannot rename params in-place)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.restaurants_in_bbox (
  double precision,
  double precision,
  double precision,
  double precision,
  uuid,
  int,
  text[],
  boolean,
  text,
  double precision,
  text,
  double precision,
  double precision
);

DROP FUNCTION IF EXISTS public.restaurants_for_municipality (
  uuid,
  int,
  text[],
  boolean,
  text,
  double precision,
  text,
  text
);

-- ---------------------------------------------------------------------------
-- Helpers & RPCs (new names; old names dropped at end)
-- ---------------------------------------------------------------------------

`;

const helpers = internationalizeSql(
  extractBetween(
    'supabase/migrations/20260611211505_portugal_parish_concelho_link_fix.sql',
    /CREATE OR REPLACE FUNCTION public\.nearest_concelho_in_state/,
    /-- ---------------------------------------------------------------------------\n-- Link remaining/
  )
);

const resolveMunicipality = internationalizeSql(
  extractBetween(
    'supabase/migrations/20260612120000_portugal_geography_coherence_fix.sql',
    /CREATE OR REPLACE FUNCTION public\.resolve_concelho_for_point/,
    /COMMENT ON FUNCTION public\.resolve_concelho_for_point/
  ) +
    extractBetween(
      'supabase/migrations/20260612120000_portugal_geography_coherence_fix.sql',
      /COMMENT ON FUNCTION public\.resolve_concelho_for_point/,
      /-- ---------------------------------------------------------------------------\n-- 4\) parish_for_point/
    )
);

const municipalityIdForCity = internationalizeSql(
  extractBetween(
    'supabase/migrations/20260611211505_portugal_parish_concelho_link_fix.sql',
    /CREATE OR REPLACE FUNCTION public\.concelho_id_for_city/,
    /CREATE OR REPLACE FUNCTION public\.municipality_for_point/
  )
);

const municipalityForPoint = internationalizeSql(
  extractBetween(
    'supabase/migrations/20260611211505_portugal_parish_concelho_link_fix.sql',
    /CREATE OR REPLACE FUNCTION public\.municipality_for_point/,
    /COMMENT ON FUNCTION public\.municipality_for_point/
  ) +
    extractBetween(
      'supabase/migrations/20260611211505_portugal_parish_concelho_link_fix.sql',
      /COMMENT ON FUNCTION public\.municipality_for_point \(double precision, double precision\)/,
      /CREATE OR REPLACE FUNCTION public\.assign_restaurant_municipality/
    )
);

const localityForPoint = internationalizeSql(
  extractBetween(
    'supabase/migrations/20260612120000_portugal_geography_coherence_fix.sql',
    /CREATE OR REPLACE FUNCTION public\.parish_for_point/,
    /-- ---------------------------------------------------------------------------\n-- 5\) Backfill/
  )
).replace(/public\.parish_for_point/g, 'public.locality_for_point');

const sponsorPlacement = internationalizeSql(
  extractBetween(
    'supabase/migrations/20260613120000_sponsor_placement_and_parish_lists.sql',
    /CREATE OR REPLACE FUNCTION public\.sponsor_placement_matches_home/,
    /REVOKE ALL ON FUNCTION public\.sponsor_placement_matches_home/
  ) +
    extractBetween(
      'supabase/migrations/20260613120000_sponsor_placement_and_parish_lists.sql',
      /REVOKE ALL ON FUNCTION public\.sponsor_placement_matches_home/,
      /CREATE OR REPLACE FUNCTION public\.list_location_municipalities/
    )
);

const listLocalities = internationalizeSql(
  extractBetween(
    'supabase/migrations/20260613120000_sponsor_placement_and_parish_lists.sql',
    /CREATE OR REPLACE FUNCTION public\.list_location_municipalities/,
    /CREATE OR REPLACE FUNCTION public\.cities_for_onboarding_save/
  )
);

const citiesForOnboarding = internationalizeSql(
  extractBetween(
    'supabase/migrations/20260613120000_sponsor_placement_and_parish_lists.sql',
    /CREATE OR REPLACE FUNCTION public\.cities_for_onboarding_save/,
    /REVOKE ALL ON FUNCTION public\.cities_for_onboarding_save/
  ) +
    extractBetween(
      'supabase/migrations/20260613120000_sponsor_placement_and_parish_lists.sql',
      /REVOKE ALL ON FUNCTION public\.cities_for_onboarding_save/,
      /CREATE OR REPLACE FUNCTION public\.restaurants_in_bbox/
    )
);

const assignRestaurant = internationalizeSql(
  extractBetween(
    'supabase/migrations/20260611211505_portugal_parish_concelho_link_fix.sql',
    /CREATE OR REPLACE FUNCTION public\.assign_restaurant_municipality/,
    /COMMENT ON FUNCTION public\.assign_restaurant_municipality/
  ) +
    extractBetween(
      'supabase/migrations/20260611211505_portugal_parish_concelho_link_fix.sql',
      /COMMENT ON FUNCTION public\.assign_restaurant_municipality/,
      /$/
    )
);

const restaurantsInBbox = internationalizeSql(
  extractBetween(
    'supabase/migrations/20260613120000_sponsor_placement_and_parish_lists.sql',
    /CREATE OR REPLACE FUNCTION public\.restaurants_in_bbox/,
    /REVOKE ALL ON FUNCTION public\.restaurants_in_bbox/
  ) +
    extractBetween(
      'supabase/migrations/20260613120000_sponsor_placement_and_parish_lists.sql',
      /REVOKE ALL ON FUNCTION public\.restaurants_in_bbox/,
      /CREATE OR REPLACE FUNCTION public\.restaurants_for_municipality/
    )
);

const restaurantsForMunicipality = internationalizeSql(
  extractBetween(
    'supabase/migrations/20260613120000_sponsor_placement_and_parish_lists.sql',
    /CREATE OR REPLACE FUNCTION public\.restaurants_for_municipality/,
    /REVOKE ALL ON FUNCTION public\.restaurants_for_municipality/
  ) +
    extractBetween(
      'supabase/migrations/20260613120000_sponsor_placement_and_parish_lists.sql',
      /REVOKE ALL ON FUNCTION public\.restaurants_for_municipality/,
      /COMMENT ON FUNCTION public\.restaurants_for_municipality/
    ) +
    extractBetween(
      'supabase/migrations/20260613120000_sponsor_placement_and_parish_lists.sql',
      /COMMENT ON FUNCTION public\.restaurants_for_municipality/,
      /$/
    )
);

const drops = `
-- ---------------------------------------------------------------------------
-- Retire Portugal-specific RPC names
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.concelho_for_point (double precision, double precision);
DROP FUNCTION IF EXISTS public.parish_for_point (double precision, double precision);
DROP FUNCTION IF EXISTS public.list_location_parishes ();
DROP FUNCTION IF EXISTS public.concelho_id_for_city (uuid);
DROP FUNCTION IF EXISTS public.nearest_concelho_in_state (double precision, double precision, uuid);
DROP FUNCTION IF EXISTS public.resolve_concelho_for_point (double precision, double precision, uuid);
`;

const out = [
  header,
  helpers,
  resolveMunicipality,
  municipalityIdForCity,
  municipalityForPoint,
  localityForPoint,
  sponsorPlacement,
  listLocalities,
  citiesForOnboarding,
  assignRestaurant,
  restaurantsInBbox,
  restaurantsForMunicipality,
  drops,
]
  .join('\n\n')
  .replace(/\n{3,}/g, '\n\n');

const outPath = path.join(
  root,
  'supabase/migrations/20260615120000_geography_international_naming.sql'
);
fs.writeFileSync(outPath, `${out}\n`);
console.log(`Wrote ${outPath} (${out.length} bytes)`);
