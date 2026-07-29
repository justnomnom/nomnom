'use server';

import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';

const VALID_TYPES = new Set(['list', 'creator']);

/**
 * Mute or unmute list-update notifications from a specific list or creator.
 * @param {'list'|'creator'} targetType
 * @param {string} targetId
 * @param {boolean} muted
 */
export async function setNotificationMute(targetType, targetId, muted) {
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) return { error: 'unauthorized' };
  if (!VALID_TYPES.has(targetType) || !targetId) return { error: 'invalid' };

  const supabase = await createSupabaseServerClient();

  if (muted) {
    const { error } = await supabase
      .from('notification_mutes')
      .insert({ user_id: user.id, target_type: targetType, target_id: targetId });
    // Ignore duplicate (already muted).
    if (error && error.code !== '23505') return { error: error.message };
    return { ok: true };
  }

  const { error } = await supabase
    .from('notification_mutes')
    .delete()
    .eq('user_id', user.id)
    .eq('target_type', targetType)
    .eq('target_id', targetId);
  if (error) return { error: error.message };
  return { ok: true };
}
