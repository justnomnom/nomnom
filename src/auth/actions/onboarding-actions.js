'use server';

import { revalidatePath } from 'next/cache';

import { paths } from 'src/routes/paths';

import { generateDefaultUsername, displayNameFromAuthMetadata } from 'src/utils/default-username';

import { syncUserLocalityFollows } from 'src/auth/actions/location-follow-sync';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';

export async function getOnboardingStatus() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await getSupabaseAuthUser();
    if (authError || !user) {
      return { completed: false, error: 'unauthorized' };
    }
    const { data, error } = await supabase
      .from('users')
      .select('onboarding_completed_at')
      .eq('id', user.id)
      .maybeSingle();
    if (error) {
      console.error('[getOnboardingStatus]', error);
      return { completed: false, error: error.message };
    }
    return { completed: Boolean(data?.onboarding_completed_at) };
  } catch (e) {
    console.error('[getOnboardingStatus]', e);
    return { completed: false, error: e?.message };
  }
}

/** Ensures `public.users` exists (FK for prefs / follows) when the auth trigger did not run. */
async function ensurePublicUserRow(supabase, user) {
  const { data: row, error: selErr } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  if (selErr) {
    console.error('[ensurePublicUserRow] select', selErr);
    return selErr;
  }
  if (row) {
    return null;
  }
  const m = user.user_metadata ?? {};
  const parts = {
    firstName: m.first_name,
    lastName: m.last_name,
    fullName: m.full_name ?? m.name,
    displayName: m.display_name,
    userId: user.id,
  };
  let username = generateDefaultUsername(parts);
  let attempt = 0;
  /* eslint-disable no-await-in-loop -- sequential insert retries on username unique violation */
  while (attempt < 26) {
    const { error: insErr } = await supabase.from('users').insert({
      id: user.id,
      email: user.email ?? null,
      username,
      display_name: displayNameFromAuthMetadata(user),
      updated_at: new Date().toISOString(),
    });
    if (!insErr) {
      return null;
    }
    if (insErr.code !== '23505') {
      console.error('[ensurePublicUserRow] insert', insErr);
      return insErr;
    }
    // PK race with handle_new_user (or concurrent bootstrap) — row already exists.
    const { data: raced, error: raceErr } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
    if (raceErr) {
      console.error('[ensurePublicUserRow] race select', raceErr);
      return raceErr;
    }
    if (raced) {
      return null;
    }
    username =
      attempt >= 24
        ? `u${String(user.id).replace(/-/g, '').slice(0, 29)}`
        : generateDefaultUsername(parts);
    attempt += 1;
  }
  /* eslint-enable no-await-in-loop */
  console.error('[ensurePublicUserRow] insert exhausted username retries');
  return new Error('username_alloc_failed');
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Any canonical 8-4-4-4-12 hex id (cities may use UUID variants outside RFC v1–v5). */
const CITY_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveUserRestaurantTagPreferences(tagIds) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await getSupabaseAuthUser();
  if (authError || !user) {
    return { error: 'Unauthorized' };
  }
  const bootstrapErr = await ensurePublicUserRow(supabase, user);
  if (bootstrapErr) {
    return { error: 'tag_prefs_save_failed' };
  }

  const raw = Array.isArray(tagIds) ? tagIds : [];
  const deduped = [
    ...new Set(
      raw
        .map((id) => (id != null ? String(id).trim().toLowerCase() : ''))
        .filter((id) => UUID_RE.test(id))
    ),
  ];

  const { data: previous, error: readErr } = await supabase
    .from('user_restaurant_tag_preferences')
    .select('user_id, tag_id')
    .eq('user_id', user.id);
  if (readErr) {
    console.error('[saveUserRestaurantTagPreferences] read', readErr);
    return { error: 'tag_prefs_save_failed' };
  }

  const { error: delErr } = await supabase
    .from('user_restaurant_tag_preferences')
    .delete()
    .eq('user_id', user.id);
  if (delErr) {
    console.error('[saveUserRestaurantTagPreferences] delete', delErr);
    return { error: 'tag_prefs_save_failed' };
  }

  if (deduped.length === 0) {
    revalidatePath(paths.dashboard.settingsPreferences);
    return { ok: true };
  }

  const rows = deduped.map((tag_id) => ({ user_id: user.id, tag_id }));
  const { error: insErr } = await supabase.from('user_restaurant_tag_preferences').insert(rows);
  if (insErr) {
    console.error('[saveUserRestaurantTagPreferences] insert', insErr);
    if (previous?.length) {
      const { error: restoreErr } = await supabase
        .from('user_restaurant_tag_preferences')
        .insert(previous);
      if (restoreErr) {
        console.error('[saveUserRestaurantTagPreferences] restore', restoreErr);
      }
    }
    return { error: 'tag_prefs_save_failed' };
  }

  revalidatePath(paths.dashboard.settingsPreferences);
  return { ok: true };
}

export async function getUserRestaurantTagPreferences() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await getSupabaseAuthUser();
  if (authError || !user) {
    return { tagIds: [], error: 'Unauthorized' };
  }
  const { data, error } = await supabase
    .from('user_restaurant_tag_preferences')
    .select('tag_id')
    .eq('user_id', user.id);
  if (error) {
    console.error('[getUserRestaurantTagPreferences]', error);
    return { tagIds: [], error: error.message };
  }
  const tagIds = (data ?? [])
    .map((r) => (r.tag_id != null ? String(r.tag_id).trim().toLowerCase() : ''))
    .filter((id) => UUID_RE.test(id));
  return { tagIds };
}

/**
 * Save onboarding home market (locality `cities.id` UUIDs) and optional GPS follow rows.
 *
 * @param {{
 *   localityIds?: string[],
 *   localityId?: string,
 *   locationPermissionGranted?: boolean,
 * }} input
 */
export async function saveOnboardingLocation(input) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await getSupabaseAuthUser();
  if (authError || !user) {
    return { error: 'Unauthorized' };
  }

  // Ensure public.users row exists — the signup trigger may not have run yet
  // (race condition or transient failure). Without this row the insert into
  // user_location_follows (FK → public.users.id) fails with a 23503 violation.
  const bootstrapErr = await ensurePublicUserRow(supabase, user);
  if (bootstrapErr) {
    return { error: 'save_failed' };
  }

  const normUuid = (raw) =>
    String(raw ?? '')
      .trim()
      .toLowerCase();

  let mids = [];
  let rawIds = input?.localityIds;
  if (!Array.isArray(rawIds) && rawIds != null) {
    rawIds = [rawIds];
  }
  if (Array.isArray(rawIds) && rawIds.length > 0) {
    const seen = new Set();
    mids = rawIds.reduce((acc, raw) => {
      const id = normUuid(raw);
      if (!CITY_ID_RE.test(id) || seen.has(id)) {
        return acc;
      }
      seen.add(id);
      acc.push(id);
      return acc;
    }, []);
  } else if (input?.localityId != null) {
    const id = normUuid(input.localityId);
    if (CITY_ID_RE.test(id)) {
      mids = [id];
    }
  }
  if (mids.length === 0) {
    return { error: 'invalid_location' };
  }

  const { data: mrows, error: mErr } = await supabase.rpc('cities_for_onboarding_save', {
    p_ids: mids,
  });
  if (
    mErr ||
    !Array.isArray(mrows) ||
    mrows.length !== mids.length ||
    mrows.some((r) => !r?.active)
  ) {
    if (mErr) {
      console.error('[saveOnboardingLocation] cities_for_onboarding_save', mErr);
    } else {
      console.warn('[saveOnboardingLocation] cities_for_onboarding_save mismatch', {
        requested: mids.length,
        got: mrows?.length ?? 0,
      });
    }
    return { error: 'invalid_location' };
  }
  const orderedRows = mrows;
  const dbIds = orderedRows.map((r) => r.id);
  const primary = orderedRows[0];

  // Follows first so a failed sync never leaves home_locality_id set with empty follows.
  const followResult = await syncUserLocalityFollows(supabase, user.id, dbIds);
  if (followResult.error) {
    return {
      error: followResult.error === 'invalid_location' ? 'invalid_location' : 'save_failed',
    };
  }

  const { error } = await supabase
    .from('users')
    .update({
      home_locality_id: primary.id,
      location_permission_granted: Boolean(input?.locationPermissionGranted),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);
  if (error) {
    console.error('[saveOnboardingLocation] users', error);
    return { error: error.message };
  }

  return { ok: true };
}

export async function saveOnboardingFollows(followingUserIds) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await getSupabaseAuthUser();
  if (authError || !user) {
    return { error: 'Unauthorized' };
  }
  const followsBootstrapErr = await ensurePublicUserRow(supabase, user);
  if (followsBootstrapErr) {
    console.error('[saveOnboardingFollows] ensurePublicUserRow', followsBootstrapErr);
    return { error: 'save_failed' };
  }
  const raw = Array.isArray(followingUserIds) ? followingUserIds : [];
  const ids = [...new Set(raw.map(String).filter((id) => UUID_RE.test(id) && id !== user.id))];

  const { data: previous, error: readErr } = await supabase
    .from('user_follows')
    .select('follower_id, following_id')
    .eq('follower_id', user.id);
  if (readErr) {
    return { error: readErr.message };
  }

  const { error: delErr } = await supabase.from('user_follows').delete().eq('follower_id', user.id);
  if (delErr) {
    return { error: delErr.message };
  }
  if (ids.length === 0) {
    return { ok: true };
  }
  const rows = ids.map((following_id) => ({
    follower_id: user.id,
    following_id,
  }));
  const { error: insErr } = await supabase.from('user_follows').insert(rows);
  if (insErr) {
    if (previous?.length) {
      const { error: restoreErr } = await supabase.from('user_follows').insert(previous);
      if (restoreErr) {
        console.error('[saveOnboardingFollows] restore', restoreErr);
      }
    }
    return { error: insErr.message };
  }
  return { ok: true };
}

export async function completeOnboarding() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await getSupabaseAuthUser();
  if (authError || !user) {
    return { error: 'Unauthorized' };
  }
  const bootstrapErr = await ensurePublicUserRow(supabase, user);
  if (bootstrapErr) {
    console.error('[completeOnboarding] ensure user', bootstrapErr);
    return { error: 'save_failed' };
  }
  const { error } = await supabase
    .from('users')
    .update({
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);
  if (error) {
    return { error: error.message };
  }
  revalidatePath(paths.onboarding, 'layout');
  revalidatePath(paths.dashboard.root, 'layout');
  return { ok: true };
}
