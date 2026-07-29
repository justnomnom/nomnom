/**
 * Keeps `user_location_follows` aligned with the user's chosen localities (primary first).
 * Callers should sync follows before relying on them; onboarding updates `home_locality_id`
 * only after a successful sync.
 *
 * Delete-then-insert is restored from a snapshot if insert fails so we never leave an empty
 * follow set after a successful delete.
 */

/** @param {import('@supabase/supabase-js').SupabaseClient} supabase */
export async function syncUserLocalityFollows(supabase, userId, localityIds) {
  const { data: previous, error: readErr } = await supabase
    .from('user_location_follows')
    .select('user_id, locality_id, sort_order')
    .eq('user_id', userId);
  if (readErr) {
    console.error('[syncUserLocalityFollows] read', readErr);
    return { error: readErr.message };
  }

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
    if (previous?.length) {
      const { error: restoreErr } = await supabase.from('user_location_follows').insert(previous);
      if (restoreErr) {
        console.error('[syncUserLocalityFollows] restore', restoreErr);
      }
    }
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
