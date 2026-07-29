# Geography database seed (copy-paste or @ this file)

**Use in Chat:** type `@` → **Files** → choose `.cursor/prompts/geography-database-seed.md`, then add your details under “Input” below.

---

## Input (fill in for your request)

- **Country:** <!-- e.g. Portugal -->
- **State / region / province:** <!-- e.g. all districts; or Lisbon + Porto only -->
- **Cities or municipalities:** <!-- e.g. all CAOP freguesias -->

---

## Instructions for the agent

You are working in **nomnom**. Seed geography with boundaries using the same patterns as the Portugal work in this repo.

### Schema (current — international naming)

Applied in **`20260615120000_geography_international_naming.sql`** (+ FK rename **`20260615130000_geography_international_naming_fk.sql`**).

- **`countries`:** `name`, `active`, `boundary`, lat/lng.
- **`states`:** `country_id`, `name`, `active`, `boundary`, lat/lng (district / region).
- **`cities`:** `state_id`, `name`, `active`, `boundary`, lat/lng, plus hierarchy flags:
  - **`is_municipality`** — official municipality (geoBoundaries ADM2); used for restaurant location resolution.
  - **`parent_municipality_id`** — locality rows point at their parent municipality (`cities.id`).
- **`restaurants.municipality_id`** → municipality row (`is_municipality = true`, `active = true`). The `20260722126000` rename to `locality_id` conflated this with the locality tier and was reverted in `20260724120000`; `20260724121000` made municipality rows active so `cities_read_active` stops hiding them.
- **`users.home_locality_id`** → locality row (`is_municipality = false`, `active = true`).
- **`user_location_follows.locality_id`** — user follows localities for feed scope.

> The three columns above all reference `cities` but **not the same tier**. Always filter on
> `is_municipality`; the column names no longer distinguish them.
- Slugs: **`public.wire_slug_from_text(name)`** = **`src/utils/wire-slug.js`**.
- RPCs: **`list_location_localities`**, **`municipality_for_point`**, **`locality_for_point`**, **`municipality_id_for_city`**, **`sponsor_placement_matches_home`**, **`assign_restaurant_municipality`**, **`nearest_municipality_in_state`**, **`restaurants_for_municipality`**, **`restaurants_in_bbox`** (param **`p_home_locality_id`**).

### Portugal model (reference implementation)

| Role | `is_municipality` | `active` | Used for |
|------|-------------------|----------|----------|
| CAOP freguesia / locality | `false` | `true` | Onboarding (`list_location_localities`) |
| Official municipality (concelho) | `true` | `false` | Restaurants, discover, `municipality_id_for_city` |

**Hierarchy:** `countries` → `states` (20 districts) → `cities` (localities + municipalities).

**Data sources:**

1. **CAOP2025** — OGC API `https://ogcapi.dgterritorio.gov.pt/collections/freguesias/items` (continental freguesias). Cached in `scripts/.cache/pt-adm3.json` via `scripts/lib/portugal-caop.cjs`. CC-BY 4.0, attribute DGT.
2. **geoBoundaries** — ADM1 districts, ADM2 concelhos; ADM3 for Azores/Madeira only (CAOP OGC is continental). Cache: `scripts/.cache/pt-adm{1,2,3}.json`.

**Generators** (`npm run geo:pt:*`):

```bash
# CAOP freguesias as locality rows (batched migrations)
npm run geo:pt:caop-localities

# CAOP boundaries on active locality rows (batched migrations)
npm run geo:pt:adm3

# CAOP freguesia count / district coverage
npm run geo:pt:audit

# geoBoundaries ADM2 concelhos (historical seed)
npm run geo:pt:adm2
npm run geo:pt:concelhos
```

**Cutover:** `20260618180000_portugal_deactivate_csc_localities.sql` deactivates legacy CSC parish rows and remaps `users.home_locality_id` to CAOP successors. CSC generators and `country-state-city` dependency removed.

**Runtime:** `fetchLocationLocalities` (`src/auth/actions/location-actions.js`) reads Postgres via **`list_location_localities`** — not external APIs.

### Workflow

1. Fetch CAOP freguesias into `scripts/.cache/pt-adm3.json` (`ensureAdm3Cache()`).
2. Merge Azores/Madeira from geoBoundaries ADM3 when needed.
3. Map features to rows; ADM1 → `states.name`; ADM2 → municipality `cities` with `is_municipality = true`.
4. Localities: `is_municipality = false`, `active = true`; `parent_municipality_id` from CAOP `municipio`; `boundary` from CAOP geometry.
5. New migration under `supabase/migrations/`:
   - Prefer idempotent **`INSERT ... WHERE NOT EXISTS`** for gap-fills.
   - Batch large geometry migrations (~50–80 rows per file) for Supabase pooler limits.
   - **`ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(...), 4326)))`**; large JSON → dollar-quotes.

### Repo references

- `src/auth/actions/location-actions.js`
- `scripts/lib/portugal-geography.cjs` — CAOP + geoBoundaries helpers
- `scripts/lib/portugal-caop.cjs` — CAOP OGC fetch
- `scripts/lib/portugal-adm2-name-fixes.cjs` — geoBoundaries ADM2 shapeName → Portuguese spelling
- `scripts/generate-portugal-caop-localities-gap-fill.js`
- `scripts/generate-portugal-adm3-parish-boundaries-gap-fill.js`
- `scripts/audit-portugal-adm3.mjs`
- `supabase/migrations/20260618170100`–`20260618175300` — CAOP locality batches
- `supabase/migrations/20260618150100`–`20260618151600` — CAOP boundary batches
- `supabase/migrations/20260618180000_portugal_deactivate_csc_localities.sql`

Execute: run generators → review SQL → `supabase db push` → `npm run supabase:types`.
