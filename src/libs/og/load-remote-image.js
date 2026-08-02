/**
 * Inline a remote image as a data URI for the `next/og` share cards.
 *
 * Satori will happily take a URL, but it fetches the bytes itself and *throws* when that
 * fails — which turns one dead avatar into a 500 for the whole card, and a crawler that
 * gets a 500 caches the absence long after the fix. Fetching here means a broken, slow or
 * oversized image degrades to the monogram fallback instead.
 */

// ----------------------------------------------------------------------

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TIMEOUT_MS = 2500;

/**
 * HTTPS only, so a stored `avatar_url` can never make the renderer issue a plaintext request.
 *
 * @param {unknown} url
 * @returns {Promise<string | null>} a `data:` URI, or `null` when the image is missing,
 *   oversized, slow, not an image, or not served over HTTPS.
 */
export async function loadRemoteImage(url) {
  if (typeof url !== 'string' || !/^https:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) return null;
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) return null;
    return `data:${contentType};base64,${Buffer.from(bytes).toString('base64')}`;
  } catch {
    return null;
  }
}
