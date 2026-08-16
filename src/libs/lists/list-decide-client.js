/**
 * Browser-side helpers for Share → Decide (voter key, lock token, session cache).
 */

export const VOTER_KEY_STORAGE = 'nomnom:list-decide-voter-key:v1';
export const LOCK_TOKEN_PREFIX = 'nomnom:list-decide-lock:';
export const SESSION_CACHE_PREFIX = 'nomnom:list-decide-session:';

const SSR_VOTER_KEY = 'ssr-placeholder-key';

/**
 * Stable anonymous voter id for guest decide votes.
 * @returns {string}
 */
export function getOrCreateVoterKey() {
  if (typeof window === 'undefined') return SSR_VOTER_KEY;
  try {
    const existing = window.localStorage.getItem(VOTER_KEY_STORAGE);
    if (existing && existing.length >= 8) return existing;
    const next =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `vk-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VOTER_KEY_STORAGE, next);
    return next;
  } catch {
    return `vk-ephemeral-${Date.now()}`;
  }
}

/**
 * @param {string} sessionId
 * @param {string} lockToken
 */
export function persistLockToken(sessionId, lockToken) {
  if (typeof window === 'undefined' || !sessionId || !lockToken) return;
  try {
    window.sessionStorage.setItem(`${LOCK_TOKEN_PREFIX}${sessionId}`, lockToken);
  } catch {
    // ignore
  }
}

/**
 * @param {string} sessionId
 * @returns {string | null}
 */
export function readLockToken(sessionId) {
  if (typeof window === 'undefined' || !sessionId) return null;
  try {
    return window.sessionStorage.getItem(`${LOCK_TOKEN_PREFIX}${sessionId}`);
  } catch {
    return null;
  }
}

/**
 * Prefer the prop, then the live ?d= query (useSearchParams can lag on remount).
 * @param {string | null | undefined} initialSessionId
 * @returns {string | null}
 */
export function resolveDecideSessionId(initialSessionId) {
  if (initialSessionId) return String(initialSessionId);
  if (typeof window === 'undefined') return null;
  try {
    return new URLSearchParams(window.location.search).get('d');
  } catch {
    return null;
  }
}

/**
 * @param {string | null | undefined} sessionId
 * @returns {object | null}
 */
export function readCachedSession(sessionId) {
  if (typeof window === 'undefined' || !sessionId) return null;
  try {
    const raw = window.sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${sessionId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Keep the last known session payload so auth remounts do not flash the idle CTA.
 * @param {object | null | undefined} session
 */
export function persistCachedSession(session) {
  const id = session?.session_id;
  if (typeof window === 'undefined' || !id) return;
  try {
    window.sessionStorage.setItem(`${SESSION_CACHE_PREFIX}${id}`, JSON.stringify(session));
  } catch {
    // ignore
  }
}

/**
 * Map server error codes to translation keys.
 * @param {string | null} code
 * @param {(k: string) => string} t
 * @returns {string | null}
 */
export function decideErrorMessage(code, t) {
  if (!code) return null;
  const key = `pages.lists.decide_error_${code}`;
  const translated = t(key);
  return translated === key ? t('pages.lists.decide_error_generic') : translated;
}

/**
 * Flatten list items into decide-panel place rows.
 * @param {unknown} items
 * @param {string} unnamedPlace
 * @returns {{ restaurantId: string, name: string, mapsLink: string | null, photo: string | null }[]}
 */
export function mapListItemsToDecidePlaces(items, unnamedPlace) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const nested = item?.restaurants || item?.restaurant || null;
      const r = Array.isArray(nested) ? nested[0] : nested;
      const id = r?.id || item?.restaurant_id;
      if (!id) return null;
      const images = Array.isArray(r?.restaurant_images) ? r.restaurant_images : [];
      const photo =
        images
          .toSorted((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .find((img) => img?.url)?.url || null;
      return {
        restaurantId: String(id),
        name: r?.name || unnamedPlace,
        mapsLink: r?.maps_link || null,
        photo,
      };
    })
    .filter(Boolean);
}

/**
 * Deduped Tonight picker rows: extras from catalog search first, then list places.
 * @param {{ restaurantId: string, name: string }[]} listPlaces
 * @param {{ restaurantId: string, name: string }[]} extraPlaces
 * @returns {{ restaurantId: string, name: string }[]}
 */
export function tonightPickerRows(listPlaces, extraPlaces) {
  const seen = new Set();
  return [
    ...(Array.isArray(extraPlaces) ? extraPlaces : []),
    ...(Array.isArray(listPlaces) ? listPlaces : []),
  ].flatMap((place) => {
    const id = place?.restaurantId ? String(place.restaurantId) : '';
    if (!id || seen.has(id)) return [];
    seen.add(id);
    return [place];
  });
}

/**
 * Selected shortlist rows, independent of the current search filter.
 * Picks stay visible in "Your picks" even when the list/catalog query would hide them.
 * @param {{ restaurantId: string }[]} listPlaces
 * @param {{ restaurantId: string }[]} extraPlaces
 * @param {Set<string> | unknown} selectedIds
 * @returns {{ restaurantId: string }[]}
 */
export function tonightSelectedPickerRows(listPlaces, extraPlaces, selectedIds) {
  const selected = selectedIds instanceof Set ? selectedIds : new Set();
  const keep = (place) => Boolean(place?.restaurantId) && selected.has(place.restaurantId);
  return tonightPickerRows(
    (Array.isArray(listPlaces) ? listPlaces : []).filter(keep),
    (Array.isArray(extraPlaces) ? extraPlaces : []).filter(keep)
  );
}

/**
 * Filter picker rows by restaurant name. Queries shorter than 2 chars return all rows.
 * @param {{ restaurantId: string, name: string }[]} places
 * @param {unknown} query
 * @returns {{ restaurantId: string, name: string }[]}
 */
export function filterTonightPickerRows(places, query) {
  const rows = Array.isArray(places) ? places : [];
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (q.length < 2) return rows;
  return rows.filter((p) => String(p.name || '').toLowerCase().includes(q));
}

/**
 * Classify Tonight live-page catalog search: idle, pending, results, already_on_night, empty.
 * @param {{ query?: unknown, hits?: unknown, existingIds?: Set<string> | unknown, pending?: boolean }} params
 * @returns {'idle' | 'pending' | 'results' | 'already_on_night' | 'empty'}
 */
export function tonightAddSearchState({ query, hits, existingIds, pending } = {}) {
  const q = String(query || '').trim();
  if (q.length < 2) return 'idle';
  if (pending) return 'pending';
  const onNight = existingIds instanceof Set ? existingIds : new Set();
  const list = Array.isArray(hits) ? hits : [];
  const fresh = list.filter((hit) => {
    const id = hit?.id ? String(hit.id) : '';
    return Boolean(id) && !onNight.has(id);
  });
  if (fresh.length > 0) return 'results';
  const anyHit = list.some((hit) => Boolean(hit?.id));
  return anyHit ? 'already_on_night' : 'empty';
}

/**
 * Toggle a restaurant id in a Tonight shortlist Set.
 * Pass `maxPlaces` only when a caller still wants a cap; omit for unlimited.
 * Returns the previous Set when the toggle is a no-op (missing id or already at cap).
 * @param {Set<string> | unknown} selectedIds
 * @param {unknown} restaurantId
 * @param {number} [maxPlaces]
 * @returns {Set<string>}
 */
export function toggleTonightSelectedIds(selectedIds, restaurantId, maxPlaces) {
  const prev = selectedIds instanceof Set ? selectedIds : new Set();
  const id = restaurantId ? String(restaurantId) : '';
  if (!id) return prev;
  if (prev.has(id)) {
    const next = new Set(prev);
    next.delete(id);
    return next;
  }
  if (Number.isFinite(maxPlaces) && prev.size >= maxPlaces) return prev;
  const next = new Set(prev);
  next.add(id);
  return next;
}

/**
 * Organiser (owner or holder of lock_token) can lock an open session.
 * @param {{ sessionId?: string | null, locked?: boolean, isOwner?: boolean, lockToken?: string | null }} params
 * @returns {boolean}
 */
export function canLockDecideSession({ sessionId, locked, isOwner, lockToken } = {}) {
  return Boolean(sessionId && !locked && (isOwner || lockToken));
}

/**
 * Winner id is only shown after lock.
 * @param {object | null | undefined} session
 * @returns {string | null}
 */
export function lockedWinnerRestaurantId(session) {
  if (session?.status !== 'locked') return null;
  return session?.winner_restaurant_id ? String(session.winner_restaurant_id) : null;
}
