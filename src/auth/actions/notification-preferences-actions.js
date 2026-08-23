'use server';

import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';
import {
  NOTIFICATION_PREF_DEFAULTS,
  mergeNotificationPreferences,
  buildNotificationPreferenceUpsert,
} from 'src/libs/notifications/notification-preference-helpers';

/**
 * Read the current user's notification preferences. Missing row → defaults.
 */
export async function getMyNotificationPreferences() {
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) return { ...NOTIFICATION_PREF_DEFAULTS, error: 'unauthorized' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('list_updates_in_app, list_updates_push, list_updates_email')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return { ...NOTIFICATION_PREF_DEFAULTS, error: error.message };
  return { ...mergeNotificationPreferences(data), error: null };
}

/**
 * Upsert the current user's notification preferences.
 * @param {{ list_updates_in_app?: boolean, list_updates_push?: boolean, list_updates_email?: boolean }} patch
 */
export async function updateMyNotificationPreferences(patch) {
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) return { error: 'unauthorized' };

  const row = buildNotificationPreferenceUpsert(user.id, patch);
  if (!row) return { error: null };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('notification_preferences')
    .upsert(row, { onConflict: 'user_id' });
  if (error) return { error: error.message };
  return { error: null };
}
