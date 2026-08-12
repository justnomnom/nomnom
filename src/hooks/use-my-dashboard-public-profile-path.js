'use client';

import { paths } from 'src/routes/paths';

import { useMyProfile } from 'src/api/my-profile';

/**
 * `/dashboard/u/:handle` when the signed-in user has a username; otherwise `null`
 * (profile nav falls back to `/dashboard/settings/profile/edit`).
 */
export function useMyDashboardPublicProfilePath() {
  const { profile } = useMyProfile();
  const handle = profile?.username ? String(profile.username).trim() : '';
  return handle ? paths.dashboard.userPublic(handle) : null;
}
