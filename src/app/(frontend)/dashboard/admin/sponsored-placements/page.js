import { notFound } from 'next/navigation';

import { isAdminUserId } from 'src/libs/auth/admin-allowlist';
import { supabaseAdminClient } from 'src/libs/supabase/supabase-admin';
import { getDefaultTranslation } from 'src/locales/default-translations';
import { getSupabaseAuthUser } from 'src/libs/supabase/supabase-server-client';

import { DynamicTitle } from 'src/components/dynamic-title';

import SponsoredPlacementsAdminView from 'src/sections/admin/sponsored-placements-admin-view';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.dashboard.admin.sponsored_placements.document_title'),
};

function buildCityOption(row) {
  const st = Array.isArray(row?.states) ? row.states[0] : row?.states;
  const co = Array.isArray(st?.countries) ? st.countries[0] : st?.countries;
  const name = row?.name != null ? String(row.name) : '';
  const state = st?.name != null ? String(st.name) : '';
  const country = co?.name != null ? String(co.name) : '';
  const parts = [name, state, country].filter(Boolean);
  return {
    id: row.id,
    name,
    label: parts.length ? parts.join(' · ') : name || row.id,
  };
}

function buildStateOption(row) {
  const co = Array.isArray(row?.countries) ? row.countries[0] : row?.countries;
  const name = row?.name != null ? String(row.name) : '';
  const country = co?.name != null ? String(co.name) : '';
  const parts = [name, country].filter(Boolean);
  return {
    id: row.id,
    name,
    label: parts.length ? parts.join(' · ') : name || row.id,
  };
}

function logSupabaseError(scope, err) {
  if (!err) return;
  const payload = {
    message: err?.message,
    code: err?.code,
    details: err?.details,
    hint: err?.hint,
  };
  if (!payload.message && !payload.code && typeof err === 'object') {
    try {
      payload.raw = JSON.parse(JSON.stringify(err));
    } catch {
      payload.raw = String(err);
    }
  }
  console.error(`[AdminSponsoredPlacementsPage] ${scope}`, payload);
}

/**
 * PostgREST embed `countries` from `states` often fails; attach country row for admin labels.
 * @param {Array<{ id: string, country_id?: string | null }>} stateRows
 */
async function attachCountriesToStates(stateRows) {
  const list = stateRows ?? [];
  const countryIds = [...new Set(list.map((s) => s.country_id).filter(Boolean))];
  if (!countryIds.length) {
    return { rows: list.map((s) => ({ ...s, countries: null })), error: null };
  }
  const { data: countries, error } = await supabaseAdminClient
    .from('countries')
    .select('id, name')
    .in('id', countryIds);
  if (error) {
    return { rows: list.map((s) => ({ ...s, countries: null })), error };
  }
  const countryById = new Map((countries ?? []).map((c) => [c.id, c]));
  const rows = list.map((s) => ({
    ...s,
    countries: s.country_id ? (countryById.get(s.country_id) ?? null) : null,
  }));
  return { rows, error: null };
}

/** All geography states for admin (not only `active` — RLS hides inactive from the app, but admins may still target them). */
async function loadStatesForSelect() {
  const statesRes = await supabaseAdminClient
    .from('states')
    .select('id, name, country_id')
    .order('name', { ascending: true })
    .limit(5000);

  if (statesRes.error) {
    return { data: [], error: statesRes.error };
  }

  const raw = statesRes.data ?? [];
  const { rows, error: mergeErr } = await attachCountriesToStates(raw);
  if (mergeErr) {
    logSupabaseError('state_countries_attach', mergeErr);
  }
  return { data: rows ?? raw.map((s) => ({ ...s, countries: null })), error: null };
}

/**
 * Nested embeds from sponsored_restaurant_placements → cities/restaurants can fail PostgREST
 * relationship resolution on some DBs; load related rows by id and merge (same shape as embeds).
 */
async function loadPlacementsWithRelatedRows() {
  const placementsRes = await supabaseAdminClient
    .from('sponsored_restaurant_placements')
    .select(
      `
      id,
      city_id,
      state_id,
      restaurant_id,
      active,
      valid_from,
      valid_until,
      pin_sort_order,
      inject_after_organic,
      updated_at
    `
    )
    .order('updated_at', { ascending: false });

  if (placementsRes.error) {
    logSupabaseError('placements', placementsRes.error);
    return [];
  }

  const placements = placementsRes.data ?? [];
  const cityIds = [...new Set(placements.map((r) => r.city_id).filter(Boolean))];
  const stateIds = [...new Set(placements.map((r) => r.state_id).filter(Boolean))];
  const restaurantIds = [...new Set(placements.map((r) => r.restaurant_id).filter(Boolean))];

  const [citiesRelRes, statesRelRes, restaurantsRelRes] = await Promise.all([
    cityIds.length
      ? supabaseAdminClient
          .from('cities')
          .select('id, name, states ( name, countries ( name ) )')
          .in('id', cityIds)
      : { data: [], error: null },
    stateIds.length
      ? supabaseAdminClient.from('states').select('id, name, country_id').in('id', stateIds)
      : { data: [], error: null },
    restaurantIds.length
      ? supabaseAdminClient.from('restaurants').select('id, name, address').in('id', restaurantIds)
      : { data: [], error: null },
  ]);

  if (citiesRelRes.error) {
    logSupabaseError('placements_related_cities', citiesRelRes.error);
  }
  if (statesRelRes.error) {
    logSupabaseError('placements_related_states', statesRelRes.error);
  }
  if (restaurantsRelRes.error) {
    logSupabaseError('placements_related_restaurants', restaurantsRelRes.error);
  }

  let placementStateRows = statesRelRes.data ?? [];
  if (placementStateRows.length && !statesRelRes.error) {
    const { rows: withCountries, error: mergeStErr } =
      await attachCountriesToStates(placementStateRows);
    if (mergeStErr) {
      logSupabaseError('placements_related_state_countries', mergeStErr);
    }
    placementStateRows = withCountries ?? placementStateRows;
  }

  const cityById = new Map((citiesRelRes.data ?? []).map((c) => [c.id, c]));
  const stateById = new Map(placementStateRows.map((s) => [s.id, s]));
  const restaurantById = new Map((restaurantsRelRes.data ?? []).map((r) => [r.id, r]));

  return placements.map((p) => ({
    ...p,
    cities: cityById.get(p.city_id) ?? null,
    states: stateById.get(p.state_id) ?? null,
    restaurants: restaurantById.get(p.restaurant_id) ?? null,
  }));
}

export default async function AdminSponsoredPlacementsPage() {
  const {
    data: { user },
  } = await getSupabaseAuthUser();

  if (!user?.id || !isAdminUserId(user.id)) {
    notFound();
  }

  const [initialRows, citiesRes, statesForSelect] = await Promise.all([
    loadPlacementsWithRelatedRows(),
    // Admins may target inactive cities (matches the states select behavior).
    supabaseAdminClient
      .from('cities')
      .select('id, name, states ( name, countries ( name ) )')
      .eq('is_municipality', true)
      .order('name', { ascending: true })
      .limit(5000),
    loadStatesForSelect(),
  ]);

  if (citiesRes.error) {
    logSupabaseError('cities', citiesRes.error);
  }
  if (statesForSelect.error) {
    logSupabaseError('states', statesForSelect.error);
  }

  const cityOptions = (citiesRes.data ?? []).map(buildCityOption);
  const stateOptions = (statesForSelect.data ?? []).map(buildStateOption);

  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.admin.sponsored_placements.document_title" />
      <SponsoredPlacementsAdminView
        initialRows={initialRows}
        cityOptions={cityOptions}
        stateOptions={stateOptions}
      />
    </>
  );
}
