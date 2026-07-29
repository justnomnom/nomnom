'use server';

import { assertAdminUser } from 'src/auth/actions/admin-guard';
import { supabaseAdminClient } from 'src/libs/supabase/supabase-admin';

// ----------------------------------------------------------------------

/**
 * @param {string[]} ids
 * @param {number} size
 * @returns {string[][]}
 */
function chunkIds(ids, size) {
  const out = [];
  for (let i = 0; i < ids.length; i += size) {
    out.push(ids.slice(i, i + size));
  }
  return out;
}

/**
 * `restaurants.municipality_id` is an FK to MUNICIPALITY rows
 * (`cities.is_municipality = true`) — despite the name, not the same tier as
 * `users.home_locality_id` / `user_location_follows.locality_id`, which are
 * `is_municipality = false`. `cities` holds both tiers; always filter on the
 * discriminator. (Renamed from `municipality_id` in 20260722126000.)
 *
 * @param {string} stateId
 * @returns {Promise<string[]>}
 */
async function cityIdsForState(stateId) {
  const { data: cities, error } = await supabaseAdminClient
    .from('cities')
    .select('id')
    .eq('state_id', stateId)
    .eq('is_municipality', true)
    .limit(5000);
  if (error) {
    console.error('[cityIdsForState]', error);
    return [];
  }
  return (cities ?? []).map((c) => c.id).filter(Boolean);
}

/**
 * @param {string[]} cityIds
 * @param {string} q
 * @param {number} lim
 * @returns {Promise<Array<{ id: string, name: string, address: string | null }>>}
 */
async function restaurantsInCities(cityIds, q, lim) {
  const unique = [...new Set(cityIds)].filter(Boolean);
  if (!unique.length) return [];

  const raw = String(q ?? '')
    .trim()
    .slice(0, 120);
  const search = raw.replace(/[%_]/g, ' ').trim();
  // Over-fetch per chunk so name-ordered matches that live only in later
  // chunks aren't crowded out by earlier chunks filling their per-chunk cap.
  const limitPerChunk = Math.min(Math.max(lim * 2, 1), 200);

  const chunks = chunkIds(unique, 60);
  const rows = [];

  await Promise.all(
    chunks.map(async (ids) => {
      let req = supabaseAdminClient
        .from('restaurants')
        .select('id, name, address')
        .in('municipality_id', ids)
        .order('name', { ascending: true })
        .limit(limitPerChunk);

      if (search.length >= 1) {
        req = req.ilike('name', `%${search}%`);
      }

      const { data, error } = await req;
      if (error) {
        console.error('[restaurantsInCities]', error);
        return;
      }
      rows.push(...(data ?? []));
    })
  );

  const byId = new Map(rows.map((r) => [r.id, r]));
  const merged = [...byId.values()].sort((a, b) =>
    String(a.name ?? '').localeCompare(String(b.name ?? ''))
  );
  return merged.slice(0, lim);
}

/**
 * @param {{ scope: 'city' | 'state', geographyId: string, query: string, limit?: number }} params
 * @returns {Promise<{ restaurants: Array<{ id: string, name: string, address: string | null }>, error?: string }>}
 */
export async function searchAdminRestaurantsForSelectAction(params) {
  try {
    await assertAdminUser();
  } catch {
    return { restaurants: [], error: 'forbidden' };
  }

  const scope = params?.scope === 'state' ? 'state' : 'city';
  const gid = String(params?.geographyId ?? '').trim();
  const query = params?.query ?? '';
  const lim = Math.min(Math.max(Number(params?.limit) || 40, 1), 80);

  if (!gid) {
    return { restaurants: [], error: null };
  }

  const cityIds = scope === 'state' ? await cityIdsForState(gid) : [gid];

  const restaurants = await restaurantsInCities(cityIds, query, lim);
  return { restaurants, error: null };
}
