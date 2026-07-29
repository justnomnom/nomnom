'use server';

import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';

/**
 * Curated creators from `suggested_creators` + `get_suggested_creators_for_municipality` RPC.
 * Use for onboarding and Discover "suggested" modules.
 *
 * @param {string | null | undefined} municipalitySlug - Wire slug from parent municipality name. Empty = global pool only.
 * @param {number} [limit=20]
 * @returns {Promise<{ creators: Array<{ userId: string, name: string, subtitle: string, avatar: string }>, error?: string }>}
 */
export async function fetchSuggestedCreatorsForMunicipality(municipalitySlug, limit = 20) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await getSupabaseAuthUser();

    const { data, error } = await supabase.rpc('get_suggested_creators_for_municipality', {
      p_municipality_slug: municipalitySlug ?? '',
      p_exclude_user_id: user?.id ?? null,
      p_limit: limit,
    });

    if (error) {
      console.error('[fetchSuggestedCreatorsForMunicipality]', error);
      return { creators: [], error: error.message };
    }

    const creators = (data ?? []).map((row) => ({
      userId: row.user_id,
      name: row.display_name?.trim() || row.username || 'Creator',
      subtitle: row.subtitle?.trim() || `@${row.username}`,
      avatar: row.avatar_url?.trim() || '',
    }));

    return { creators };
  } catch (e) {
    console.error('[fetchSuggestedCreatorsForMunicipality]', e);
    return { creators: [], error: e?.message };
  }
}
