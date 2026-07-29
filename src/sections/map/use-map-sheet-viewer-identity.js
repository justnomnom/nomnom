'use client';

import { useMemo, useState, useEffect } from 'react';

import { mapSheetViewerIdentityFromUser } from 'src/sections/map/map-spot-sheet-helpers';

/**
 * Map sheet “You” ring: prefer `users` row (canonical profile photo) over auth `user_metadata`
 * (OAuth-only fields), which is not updated when the user changes their avatar in settings.
 *
 * @param {import('@supabase/supabase-js').User | null | undefined} user
 * @param {import('@supabase/supabase-js').SupabaseClient | null | undefined} supabase
 * @returns {{ avatarUrl: string | null, displayName: string | null, username: string | null }}
 */
export function useMapSheetViewerIdentity(user, supabase) {
  const base = useMemo(() => mapSheetViewerIdentityFromUser(user), [user]);
  const [dbProfile, setDbProfile] = useState(
    /** @type {{ avatar_url: string | null, display_name: string | null, username: string | null } | null} */ (
      null
    )
  );

  useEffect(() => {
    if (!user?.id || !supabase) {
      setDbProfile(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('users')
        .select('avatar_url, display_name, username')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setDbProfile(null);
        return;
      }
      setDbProfile(
        data
          ? {
              avatar_url: data.avatar_url ?? null,
              display_name: data.display_name ?? null,
              username: data.username ?? null,
            }
          : null
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, supabase]);

  return useMemo(() => {
    const pick = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
    const dbAvatar = dbProfile ? pick(dbProfile.avatar_url) : null;
    const dbDisplay = dbProfile ? pick(dbProfile.display_name) : null;
    const dbUsername = dbProfile ? pick(dbProfile.username) : null;
    return {
      avatarUrl: dbAvatar || base.avatarUrl,
      displayName: dbDisplay || base.displayName,
      username: dbUsername,
    };
  }, [base, dbProfile]);
}
