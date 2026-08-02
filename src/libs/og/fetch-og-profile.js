/**
 * Lean public-profile read for the share card and the profile page's `generateMetadata`.
 *
 * Deliberately not `fetchPublicProfileByUsername()`: that resolves the viewer, the full
 * activity feed and owner-only list branches, and lives in a `'use server'` module that
 * drags Stripe and notifications in with it. This needs six fields and runs for crawlers
 * that never carry cookies, so it reads the two public RPCs through an anonymous client —
 * same data the page shows, a fraction of the work.
 *
 * Plain JS on purpose: `src/app/(frontend)/u/[username]/page.js` imports it, and importing
 * `.ts` from ESLint-strict JS is a known snag here (see `src/libs/site-url.js`).
 */

import { createClient } from '@supabase/supabase-js';

import { SUPABASE_API } from 'src/config-global';

// ----------------------------------------------------------------------

/**
 * @typedef {object} OgProfile
 * @property {string} displayName
 * @property {string} handle
 * @property {string | null} avatarUrl
 * @property {string} bio
 * @property {number} followerCount
 * @property {number} listCount
 * @property {number} spotCount
 */

/**
 * @param {unknown} value
 * @returns {number} a non-negative integer; 0 for anything unparseable.
 */
function toCount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * @param {unknown} username handle with or without a leading `@`.
 * @returns {Promise<OgProfile | null>} `null` when the handle is unknown, blank, or Supabase is unconfigured.
 */
export async function fetchOgProfile(username) {
  const handle = typeof username === 'string' ? username.trim().replace(/^@/, '') : '';
  if (!handle || !SUPABASE_API.url || !SUPABASE_API.key) return null;

  const supabase = createClient(SUPABASE_API.url, SUPABASE_API.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc('public_user_profile_by_username', {
    p_username: handle,
  });
  if (error) return null;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) return null;

  // Counts are a bonus, not the point of the card — a failure here still renders.
  let listCount = 0;
  let spotCount = 0;
  const { data: lists, error: listsError } = await supabase.rpc('public_lists_for_profile', {
    p_owner_user_id: row.id,
  });
  if (!listsError && Array.isArray(lists)) {
    listCount = lists.length;
    // `item_count` predates `20260423100000_dashboard_following_lists_item_count` on some
    // RPCs, so a missing column reads as 0 spots rather than NaN.
    spotCount = lists.reduce((sum, list) => sum + toCount(list?.item_count), 0);
  }

  return {
    displayName: typeof row.display_name === 'string' ? row.display_name : '',
    handle: typeof row.username === 'string' ? row.username : handle,
    avatarUrl: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    bio: typeof row.bio === 'string' ? row.bio : '',
    followerCount: toCount(row.follower_count),
    listCount,
    spotCount,
  };
}
