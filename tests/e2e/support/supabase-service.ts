import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { loadE2EEnv } from '../load-env';

let _admin: SupabaseClient | null = null;

/**
 * Service-role Supabase client for E2E DB assertions only (Node / test workers).
 */
export function getServiceRoleClient(): SupabaseClient {
  if (_admin) return _admin;
  loadE2EEnv();
  const url = process.env.E2E_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.E2E_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  if (!url || !key) {
    throw new Error(
      'Missing E2E_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and E2E_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)'
    );
  }
  _admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _admin;
}

/**
 * Any restaurant id for deep-link smoke tests (signed-in restaurant detail page).
 */
export async function getAnyRestaurantId(): Promise<string | null> {
  const admin = getServiceRoleClient();
  const { data, error } = await admin.from('restaurants').select('id').limit(1);
  if (error) throw error;
  return data?.[0]?.id ?? null;
}

/**
 * Any municipality city id (`cities.is_municipality = true`) — required (NOT NULL) when seeding a
 * `restaurants` row. Returns null when the DB has no municipality cities or restaurants to borrow
 * one from (caller then skips).
 */
export async function getAnyMunicipalityId(): Promise<string | null> {
  const admin = getServiceRoleClient();
  const { data, error } = await admin
    .from('cities')
    .select('id')
    .eq('is_municipality', true)
    .limit(1);
  if (error) throw error;
  if (data?.[0]?.id) return data[0].id as string;
  const { data: r, error: rErr } = await admin
    .from('restaurants')
    .select('municipality_id')
    .not('municipality_id', 'is', null)
    .limit(1);
  if (rErr) throw rErr;
  return (r?.[0]?.municipality_id as string | undefined) ?? null;
}

/**
 * Any list id (e.g. for `/lists/:id` or dashboard list detail).
 */
export async function getAnyListId(): Promise<string | null> {
  const admin = getServiceRoleClient();
  const { data, error } = await admin.from('lists').select('id').limit(1);
  if (error) throw error;
  return data?.[0]?.id ?? null;
}

/**
 * A list id the given app user can open on `/dashboard/lists/:id/manage` (owner or active collaborator).
 */
export async function getAnyListIdForAppUser(userId: string): Promise<string | null> {
  const admin = getServiceRoleClient();
  const { data: owned, error: ownedErr } = await admin.from('lists').select('id').eq('user_id', userId).limit(1);
  if (ownedErr) throw ownedErr;
  if (owned?.[0]?.id) return owned[0].id;

  const { data: collab, error: collabErr } = await admin
    .from('list_members')
    .select('list_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1);
  if (collabErr) throw collabErr;
  return collab?.[0]?.list_id ?? null;
}

/**
 * Lookup auth email from `public.users.username` (lowercase handle, no @).
 * Used when E2E signs in with a username in the UI but Supabase still needs the real email.
 */
export async function getEmailByUsername(username: string): Promise<string | null> {
  const admin = getServiceRoleClient();
  const handle = (username ?? '').trim().replace(/^@/, '').toLowerCase();
  if (!handle) return null;

  const { data, error } = await admin.from('users').select('email').eq('username', handle).maybeSingle();
  if (error) throw error;
  const email = data?.email;
  return typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;
}

/**
 * Find a search token that the Discover/map name typeahead will actually return rows for.
 *
 * Mirrors the UI exactly: it calls the same `search_restaurants_by_name` RPC with the same
 * Portugal-mainland+islands bbox that `searchRestaurantsByName` uses, so a returned token is
 * guaranteed to surface at least one restaurant suggestion in the browser. Returns `null` only
 * when the seeded DB has no matchable restaurant names (the typeahead spec then skips).
 */
export async function findTypeaheadQueryToken(): Promise<string | null> {
  const admin = getServiceRoleClient();
  const { data, error } = await admin
    .from('restaurants')
    .select('name')
    .not('name', 'is', null)
    .limit(60);
  if (error || !data) return null;

  // Same default scope as `searchRestaurantsByName` (Portugal mainland + islands).
  const bbox = { west: -31.3, south: 32.6, east: -6.2, north: 42.2 };
  for (const row of data) {
    const name = String((row as { name?: unknown })?.name ?? '').trim();
    if (name.length < 4) continue;
    // Prefer the longest word (>= 4 chars) as a distinctive, likely-unique token.
    const token =
      name
        .split(/\s+/)
        .filter((w) => w.length >= 4)
        .sort((a, b) => b.length - a.length)[0] ?? name;
    const q = token.slice(0, 16);
    const { data: hits, error: rpcErr } = await admin.rpc('search_restaurants_by_name', {
      p_query: q,
      p_limit: 5,
      p_west: bbox.west,
      p_south: bbox.south,
      p_east: bbox.east,
      p_north: bbox.north,
    });
    if (!rpcErr && Array.isArray(hits) && hits.length > 0) return q;
  }
  return null;
}

/**
 * A municipality city (`cities.is_municipality = true`) that has at least one restaurant and a
 * name unique among municipalities — so the admin sponsored-placements form can pick it by name
 * from the city autocomplete unambiguously, and the server restaurant search returns options.
 * Returns null when the DB has no suitable data (spec skips).
 */
export async function findMunicipalityCityWithRestaurant(): Promise<{
  cityId: string;
  cityName: string;
} | null> {
  const admin = getServiceRoleClient();

  // Distinct municipality ids that actually have restaurants attached.
  const { data: rests, error: restErr } = await admin
    .from('restaurants')
    .select('municipality_id')
    .not('municipality_id', 'is', null)
    .limit(500);
  if (restErr) throw restErr;

  const candidateIds = [...new Set((rests ?? []).map((r) => r.municipality_id).filter(Boolean))];
  if (!candidateIds.length) return null;

  const { data: cities, error: cityErr } = await admin
    .from('cities')
    .select('id, name')
    .eq('is_municipality', true)
    .in('id', candidateIds);
  if (cityErr) throw cityErr;

  const named = (cities ?? []).filter((c) => typeof c.name === 'string' && c.name.trim());
  let fallback: { cityId: string; cityName: string } | null = null;

  for (const c of named) {
    const name = String(c.name).trim();
    if (!fallback) fallback = { cityId: c.id as string, cityName: name };
    const { count, error } = await admin
      .from('cities')
      .select('id', { count: 'exact', head: true })
      .eq('is_municipality', true)
      .eq('name', name);
    if (error) throw error;
    if (count === 1) return { cityId: c.id as string, cityName: name };
  }

  // No name proved unique — fall back to the first candidate (rare; accepts minor ambiguity).
  return fallback;
}

export async function getUserIdByEmail(email: string): Promise<string | null> {
  const override = process.env.E2E_TEST_USER_ID?.trim();
  if (override) return override;

  const admin = getServiceRoleClient();
  const normalized = email.trim().toLowerCase();
  const { data, error } = await admin.from('users').select('id').eq('email', normalized).maybeSingle();
  if (error) throw error;
  if (data?.id) return data.id;

  const { data: page, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) throw listErr;
  const u = page.users.find((x) => x.email?.toLowerCase() === normalized);
  return u?.id ?? null;
}
