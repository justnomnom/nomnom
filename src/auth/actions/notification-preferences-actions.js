'use server';

import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';

const DEFAULTS = {
  list_updates_in_app: true,
  list_updates_push: true,
  list_updates_email: false,
};

/**
 * Read the current user's notification preferences. Missing row → defaults (all on).
 */
export async function getMyNotificationPreferences() {
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) return { ...DEFAULTS, error: 'unauthorized' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('list_updates_in_app, list_updates_push, list_updates_email')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return { ...DEFAULTS, error: error.message };
  return {
    list_updates_in_app: data?.list_updates_in_app ?? DEFAULTS.list_updates_in_app,
    list_updates_push: data?.list_updates_push ?? DEFAULTS.list_updates_push,
    list_updates_email: data?.list_updates_email ?? DEFAULTS.list_updates_email,
    error: null,
  };
}

/**
 * Upsert the current user's notification preferences.
 * @param {{ list_updates_in_app?: boolean, list_updates_push?: boolean }} patch
 */
export async function updateMyNotificationPreferences(patch) {
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) return { error: 'unauthorized' };

  const supabase = await createSupabaseServerClient();
  const row = { user_id: user.id, updated_at: new Date().toISOString() };
  if (typeof patch?.list_updates_in_app === 'boolean') {
    row.list_updates_in_app = patch.list_updates_in_app;
  }
  if (typeof patch?.list_updates_push === 'boolean') {
    row.list_updates_push = patch.list_updates_push;
  }
  if (typeof patch?.list_updates_email === 'boolean') {
    row.list_updates_email = patch.list_updates_email;
  }

  const { error } = await supabase
    .from('notification_preferences')
    .upsert(row, { onConflict: 'user_id' });
  if (error) return { error: error.message };
  return { error: null };
}
