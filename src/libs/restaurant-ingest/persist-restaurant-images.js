/**
 * Persist scraped restaurant photos into Supabase Storage.
 *
 * Google Maps photo URLs (`lh3.googleusercontent.com/gps-cs-s/…`) are signed,
 * short-lived CDN links: they return 403 once Google rotates/expires them, which
 * blanks every surface that renders them (map list, detail gallery). Storing the
 * raw URL is therefore a time bomb. At ingest time the URLs are still live, so we
 * download the bytes and re-host them in our own public bucket — the resulting
 * `…/storage/v1/object/public/restaurant_images/…` URLs are permanent and already
 * covered by `REMOTE_IMAGE_REMOTE_PATTERNS`.
 */

import { createHash } from 'crypto';

export const RESTAURANT_IMAGES_BUCKET = 'restaurant_images';

/** Per-image download budget. Slow/huge sources are skipped rather than stalling ingest. */
const DEFAULT_PER_IMAGE_TIMEOUT_MS = 15_000;
/** Reject anything larger than this — Google thumbnails are well under 1 MB. */
const DEFAULT_MAX_BYTES = 15 * 1024 * 1024;
/** Download in small batches so a 25-photo place doesn't open 25 sockets at once. */
const CONCURRENCY = 6;

/** @type {Record<string, string>} */
const EXT_BY_CONTENT_TYPE = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

/** @param {string} contentType */
function extFromContentType(contentType) {
  const base = (contentType || '').split(';')[0].trim().toLowerCase();
  return EXT_BY_CONTENT_TYPE[base] || 'jpg';
}

/** Folder names come from `external_place_id` — keep them to storage-safe characters. */
function sanitizeFolder(folder) {
  const cleaned = String(folder ?? '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 200);
  return cleaned || 'unknown';
}

/**
 * Stable hash of scraped source photo URLs (order-independent). Stored on the
 * restaurant row so re-ingest can skip re-downloading when Google’s set is unchanged.
 * @param {Array<unknown>} urls
 * @returns {string}
 */
export function hashSourcePhotoUrls(urls) {
  const unique = [
    ...new Set(
      (Array.isArray(urls) ? urls : [])
        .filter((u) => typeof u === 'string' && u.trim())
        .map((u) => u.trim())
    ),
  ].sort();
  return createHash('sha1').update(JSON.stringify(unique)).digest('hex');
}

/**
 * Download one image and upload it to the bucket.
 * @returns {Promise<string | null>} public URL, or null when the source can't be captured
 */
async function downloadAndUpload(admin, folder, index, src, { logger, maxBytes }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_PER_IMAGE_TIMEOUT_MS);
  try {
    const res = await fetch(src, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (NomNom restaurant ingest)' },
    });
    if (!res.ok) {
      logger.error?.('[restaurant-images] source fetch failed', { status: res.status, src });
      return null;
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('image/')) {
      logger.error?.('[restaurant-images] non-image content-type', { contentType, src });
      return null;
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > maxBytes) {
      logger.error?.('[restaurant-images] rejected by size', { bytes: bytes.length, src });
      return null;
    }
    const path = `${folder}/${index}.${extFromContentType(contentType)}`;
    const { error: upErr } = await admin.storage
      .from(RESTAURANT_IMAGES_BUCKET)
      .upload(path, bytes, { contentType, upsert: true });
    if (upErr) {
      logger.error?.('[restaurant-images] upload failed', { path, error: upErr.message });
      return null;
    }
    const { data: pub } = admin.storage.from(RESTAURANT_IMAGES_BUCKET).getPublicUrl(path);
    return pub?.publicUrl || null;
  } catch (e) {
    logger.error?.('[restaurant-images] persist threw', { src, error: String(e) });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Re-host a set of source image URLs into Storage.
 *
 * Best-effort: when a download fails the original URL is kept as the mapped value,
 * so the caller never ends up with *fewer* photos than the raw scrape provided —
 * this change can only improve on today's behavior, never regress it.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} folder — stable key for this restaurant (use `external_place_id`)
 * @param {Array<unknown>} urls
 * @param {{ logger?: { error?: Function }, maxBytes?: number }} [opts]
 * @returns {Promise<Map<string, string>>} original URL → persisted (or original) URL
 */
export async function persistRestaurantImageUrls(admin, folder, urls, opts = {}) {
  const logger = opts.logger || console;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  /** @type {Map<string, string>} */
  const mapping = new Map();

  const unique = [
    ...new Set(
      (Array.isArray(urls) ? urls : [])
        .filter((u) => typeof u === 'string' && u.trim())
        .map((u) => u.trim())
    ),
  ];
  if (unique.length === 0) return mapping;

  const safeFolder = sanitizeFolder(folder);

  // Clear any blobs we persisted for this restaurant on a prior ingest so the
  // folder mirrors the current photo set instead of accumulating orphans.
  try {
    const { data: existing, error } = await admin.storage
      .from(RESTAURANT_IMAGES_BUCKET)
      .list(safeFolder, { limit: 1000 });
    if (!error && Array.isArray(existing) && existing.length > 0) {
      await admin.storage
        .from(RESTAURANT_IMAGES_BUCKET)
        .remove(existing.map((f) => `${safeFolder}/${f.name}`));
    }
  } catch (e) {
    logger.error?.('[restaurant-images] folder cleanup failed', {
      folder: safeFolder,
      error: String(e),
    });
  }

  for (let start = 0; start < unique.length; start += CONCURRENCY) {
    const batch = unique.slice(start, start + CONCURRENCY);
    // eslint-disable-next-line no-await-in-loop
    const results = await Promise.all(
      batch.map((src, i) =>
        downloadAndUpload(admin, safeFolder, start + i, src, { logger, maxBytes })
      )
    );
    results.forEach((persisted, i) => {
      const src = batch[i];
      mapping.set(src, persisted ?? src);
    });
  }

  return mapping;
}
