'use server';

import { revalidatePath } from 'next/cache';

import { paths } from 'src/routes/paths';

import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';

// ----------------------------------------------------------------------

const MAX_BODY_LEN = 2000;
const REVIEW_MEDIA_BUCKET = 'restaurant_review_media';
const MAX_MEDIA_ITEMS = 6;

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const VIDEO_EXT = new Set(['mp4', 'webm']);

/** Half-star steps between 1 and 5 inclusive. */
function normalizeReviewRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const snapped = Math.round(n * 2) / 2;
  if (snapped < 1 || snapped > 5) return null;
  return snapped;
}

function extFromFilename(filename) {
  const m = /\.([a-z0-9]+)$/i.exec(filename || '');
  return m ? m[1].toLowerCase() : '';
}

/**
 * @param {string} path
 * @param {string} userId
 * @param {string} restaurantId
 * @returns {{ ext: string } | null}
 */
function validateReviewMediaPath(path, userId, restaurantId) {
  if (typeof path !== 'string' || !path) return null;
  const parts = path.split('/');
  if (parts.length !== 3) return null;
  const [a, b, file] = parts;
  if (a !== userId || b !== restaurantId) return null;
  if (!file || file.includes('..') || file.includes('\\')) return null;
  const ext = extFromFilename(file);
  if (!ext) return null;
  return { ext };
}

/**
 * @param {unknown} media
 * @param {string} userId
 * @param {string} restaurantId
 * @returns {{ media: { kind: string, path: string }[] } | { errorKey: string }}
 */
function normalizeReviewMediaInput(media, userId, restaurantId) {
  if (media == null) {
    return { media: [] };
  }
  if (!Array.isArray(media)) {
    return { errorKey: 'invalid_media' };
  }
  if (media.length > MAX_MEDIA_ITEMS) {
    return { errorKey: 'media_too_many' };
  }
  const reduced = media.reduce(
    (acc, item) => {
      if (acc.errorKey) {
        return acc;
      }
      if (!item || typeof item !== 'object') {
        return { ...acc, errorKey: 'invalid_media' };
      }
      const kind = item.kind === 'image' || item.kind === 'video' ? item.kind : null;
      const path = typeof item.path === 'string' ? item.path.trim() : '';
      if (!kind || !path) {
        return { ...acc, errorKey: 'invalid_media' };
      }
      const check = validateReviewMediaPath(path, userId, restaurantId);
      if (!check) {
        return { ...acc, errorKey: 'invalid_media' };
      }
      if (kind === 'image' && !IMAGE_EXT.has(check.ext)) {
        return { ...acc, errorKey: 'invalid_media' };
      }
      if (kind === 'video' && !VIDEO_EXT.has(check.ext)) {
        return { ...acc, errorKey: 'invalid_media' };
      }
      if (acc.seenPaths.has(path)) {
        return { ...acc, errorKey: 'invalid_media' };
      }
      acc.seenPaths.add(path);
      acc.media.push({ kind, path });
      return acc;
    },
    { media: [], seenPaths: new Set(), errorKey: null }
  );
  if (reduced.errorKey) {
    return { errorKey: reduced.errorKey };
  }
  return { media: reduced.media };
}

/**
 * @param {unknown} media
 * @returns {string[]}
 */
function pathsFromMediaField(media) {
  if (!media || !Array.isArray(media)) {
    return [];
  }
  return media.map((x) => (typeof x?.path === 'string' ? x.path : null)).filter(Boolean);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string[]} objectPaths
 */
async function removeReviewStoragePaths(supabase, objectPaths) {
  const list = [...new Set(objectPaths)].filter(Boolean);
  if (!list.length) return;
  const { error } = await supabase.storage.from(REVIEW_MEDIA_BUCKET).remove(list);
  if (error) {
    console.error('[removeReviewStoragePaths]', error.message);
  }
}

/**
 * @param {string} restaurantId
 * @returns {Promise<{ reviews: object[], error: string | null }>}
 */
export async function fetchRestaurantReviews(restaurantId) {
  if (!restaurantId || typeof restaurantId !== 'string') {
    return { reviews: [], error: null };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('restaurant_reviews')
    .select(
      `
      id,
      restaurant_id,
      user_id,
      rating,
      body,
      media,
      author_display_name,
      author_username,
      author_avatar_url,
      created_at,
      updated_at
    `
    )
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (error) return { reviews: [], error: error.message };
  return { reviews: data ?? [], error: null };
}

/**
 * @param {{ restaurantId: string, rating: number, body: string, media?: unknown }} input
 * @returns {Promise<{ error: string | null, errorKey?: string }>}
 */
export async function upsertRestaurantReview({ restaurantId, rating, body, media: mediaInput }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) return { errorKey: 'unauthorized', error: 'unauthorized' };

  if (!restaurantId || typeof restaurantId !== 'string') {
    return { errorKey: 'invalid_restaurant', error: 'invalid_restaurant' };
  }

  const r = normalizeReviewRating(rating);
  if (r == null) {
    return { errorKey: 'invalid_rating', error: 'invalid_rating' };
  }

  const trimmed = typeof body === 'string' ? body.trim() : '';
  if (trimmed.length > MAX_BODY_LEN) {
    return { errorKey: 'body_too_long', error: 'body_too_long' };
  }

  const normalized = normalizeReviewMediaInput(mediaInput, user.id, restaurantId);
  if ('errorKey' in normalized) {
    return { errorKey: normalized.errorKey, error: normalized.errorKey };
  }
  const nextMedia = normalized.media;

  const [{ data: existing, error: exErr }, { data: profile, error: pErr }] = await Promise.all([
    supabase
      .from('restaurant_reviews')
      .select('media')
      .eq('restaurant_id', restaurantId)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('users')
      .select('display_name, username, avatar_url')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  if (exErr) return { error: exErr.message };

  const oldPaths = pathsFromMediaField(existing?.media);
  const nextPaths = new Set(nextMedia.map((m) => m.path));
  const toRemove = oldPaths.filter((p) => !nextPaths.has(p));
  await removeReviewStoragePaths(supabase, toRemove);

  if (pErr) return { error: pErr.message };

  const row = {
    restaurant_id: restaurantId,
    user_id: user.id,
    rating: r,
    body: trimmed || null,
    media: nextMedia,
    author_display_name: profile?.display_name ?? null,
    author_username: profile?.username ?? null,
    author_avatar_url: profile?.avatar_url ?? null,
  };

  const { error } = await supabase.from('restaurant_reviews').upsert(row, {
    onConflict: 'restaurant_id,user_id',
  });

  if (error) return { error: error.message };

  revalidatePath(paths.dashboard.restaurant(restaurantId));
  revalidatePath(paths.dashboard.lists);
  return { error: null };
}

/**
 * @param {{ restaurantId: string }} input
 * @returns {Promise<{ error: string | null, errorKey?: string }>}
 */
export async function deleteRestaurantReview({ restaurantId }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user?.id) return { errorKey: 'unauthorized', error: 'unauthorized' };

  const rid =
    restaurantId != null && String(restaurantId).trim() !== '' ? String(restaurantId).trim() : null;
  if (!rid) {
    return { errorKey: 'invalid_restaurant', error: 'invalid_restaurant' };
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc('delete_my_restaurant_review', {
    p_restaurant_id: rid,
  });

  if (rpcError) {
    const msg = rpcError.message || '';
    if (/not authorized/i.test(msg)) {
      return { errorKey: 'unauthorized', error: 'unauthorized' };
    }
    return { error: rpcError.message };
  }

  let payload = null;
  if (rpcData && typeof rpcData === 'object' && !Array.isArray(rpcData)) {
    payload = rpcData;
  } else if (typeof rpcData === 'string') {
    try {
      payload = JSON.parse(rpcData);
    } catch {
      payload = null;
    }
  }

  if (!payload?.deleted) {
    return { errorKey: 'nothing_to_delete', error: 'nothing_to_delete' };
  }

  const mediaPaths = pathsFromMediaField(payload.media);
  await removeReviewStoragePaths(supabase, mediaPaths);

  revalidatePath(paths.dashboard.restaurant(rid));
  revalidatePath(paths.dashboard.lists);
  return { error: null };
}
