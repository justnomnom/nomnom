'use client';

import { useState, useEffect } from 'react';

import { paths } from 'src/routes/paths';

import { useAuthContext } from 'src/auth/hooks';
import { getMyProfile } from 'src/auth/actions/profile-actions';

/**
 * `/dashboard/u/:handle` when the signed-in user has a username; otherwise `null`
 * (profile nav falls back to `/dashboard/settings/profile/edit`).
 */
export function useMyDashboardPublicProfilePath() {
  const { user } = useAuthContext();
  const [myPublicProfilePath, setMyPublicProfilePath] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      setMyPublicProfilePath(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const { profile, error } = await getMyProfile();
      if (cancelled) return;
      const handle = !error && profile?.username ? String(profile.username).trim() : '';
      setMyPublicProfilePath(handle ? paths.dashboard.userPublic(handle) : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return myPublicProfilePath;
}
