/**
 * Keeps `user_location_follows` aligned with the user's chosen localities (primary first).
 * Discover GPS/fallback sync and onboarding both call this after setting `home_locality_id`.
 */

/** @param {import('@supabase/supabase-js').SupabaseClient} supabase */
export async function syncUserLocalityFollows(supabase, userId, localityIds) {
  const { error: delErr } = await supabase
    .from('user_location_follows')
    .delete()
    .eq('user_id', userId);
  if (delErr) {
    console.error('[syncUserLocalityFollows] delete', delErr);
    return { error: delErr.message };
  }

  if (!localityIds?.length) {
    return { ok: true };
  }

  const rows = localityIds.map((localityId, i) => ({
    user_id: userId,
    locality_id: localityId,
    sort_order: i,
  }));
  const { error: insErr } = await supabase.from('user_location_follows').insert(rows);
  if (insErr) {
    console.error('[syncUserLocalityFollows] insert', insErr);
    if (insErr.code === '23503') {
      return { error: 'invalid_location' };
    }
    return { error: insErr.message };
  }

  return { ok: true };
}

/** @param {import('@supabase/supabase-js').SupabaseClient} supabase */
export async function syncUserPrimaryLocalityFollow(supabase, userId, localityId) {
  return syncUserLocalityFollows(supabase, userId, [localityId]);
}
