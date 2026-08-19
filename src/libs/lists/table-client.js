import { format } from 'date-fns';

/**
 * Browser-side helpers for Table (guest key, lock token, vote + payload cache).
 */

export const GUEST_KEY_STORAGE = 'nomnom:table-guest-key:v1';
export const LOCK_TOKEN_PREFIX = 'nomnom:table-lock:';
export const LINK_COPIED_PREFIX = 'nomnom:table-link-copied:';
export const TABLE_CACHE_PREFIX = 'nomnom:table-cache:';
export const MY_VOTES_PREFIX = 'nomnom:table-my-votes:';
export const TABLE_NAMED_PREFIX = 'nomnom:table-named:';

const SSR_GUEST_KEY = 'ssr-placeholder-key';

/**
 * Stable anonymous id for this device's seat at any table.
 * @returns {string}
 */
export function getOrCreateGuestKey() {
  if (typeof window === 'undefined') return SSR_GUEST_KEY;
  try {
    const existing = window.localStorage.getItem(GUEST_KEY_STORAGE);
    if (existing && existing.length >= 8) return existing;
    const next =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `gk-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(GUEST_KEY_STORAGE, next);
    return next;
  } catch {
    return `gk-ephemeral-${Date.now()}`;
  }
}

/**
 * @param {string} tableId
 * @param {string} lockToken
 */
export function persistLockToken(tableId, lockToken) {
  if (typeof window === 'undefined' || !tableId || !lockToken) return;
  try {
    window.sessionStorage.setItem(`${LOCK_TOKEN_PREFIX}${tableId}`, lockToken);
  } catch {
    // ignore
  }
}

/**
 * @param {string} tableId
 * @returns {string | null}
 */
export function readLockToken(tableId) {
  if (typeof window === 'undefined' || !tableId) return null;
  try {
    return window.sessionStorage.getItem(`${LOCK_TOKEN_PREFIX}${tableId}`);
  } catch {
    return null;
  }
}

/**
 * Remember that this device just copied the table link so the table page can
 * still toast after we navigate away from the start sheet.
 * @param {string} tableId
 */
export function persistLinkCopied(tableId) {
  if (typeof window === 'undefined' || !tableId) return;
  try {
    window.sessionStorage.setItem(`${LINK_COPIED_PREFIX}${tableId}`, '1');
  } catch {
    // ignore
  }
}

/**
 * Whether this device still has a pending "link copied" toast for the table.
 * @param {string} tableId
 * @returns {boolean}
 */
export function readLinkCopied(tableId) {
  if (typeof window === 'undefined' || !tableId) return false;
  try {
    return window.sessionStorage.getItem(`${LINK_COPIED_PREFIX}${tableId}`) === '1';
  } catch {
    return false;
  }
}

/**
 * Drop the one-shot "link copied" flag after the table page has shown it.
 * @param {string} tableId
 */
export function clearLinkCopied(tableId) {
  if (typeof window === 'undefined' || !tableId) return;
  try {
    window.sessionStorage.removeItem(`${LINK_COPIED_PREFIX}${tableId}`);
  } catch {
    // ignore
  }
}

/**
 * Your own votes for a table, keyed by restaurant.
 *
 * The payload only carries aggregate tallies (`up` / `down` / `net`) — it has no
 * per-voter field — so the server cannot tell the UI which way *you* voted. Voting
 * identity is already device-local (see {@link getOrCreateGuestKey}), so the vote is
 * recorded against this device either way; remembering it here is the same identity,
 * not a second source of truth. Persisted so a reload keeps your choice visible.
 *
 * @param {string | null | undefined} tableId
 * @returns {Record<string, 1 | -1>}
 */
export function readMyVotes(tableId) {
  if (typeof window === 'undefined' || !tableId) return {};
  try {
    const raw = window.localStorage.getItem(`${MY_VOTES_PREFIX}${tableId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * @param {string | null | undefined} tableId
 * @param {string} restaurantId
 * @param {1 | -1} vote
 * @returns {Record<string, 1 | -1>} the updated map
 */
export function persistMyVote(tableId, restaurantId, vote) {
  const next = { ...readMyVotes(tableId), [String(restaurantId)]: vote };
  if (typeof window === 'undefined' || !tableId) return next;
  try {
    window.localStorage.setItem(`${MY_VOTES_PREFIX}${tableId}`, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

/**
 * @param {string | null | undefined} tableId
 * @returns {object | null}
 */
export function readCachedTable(tableId) {
  if (typeof window === 'undefined' || !tableId) return null;
  try {
    const raw = window.sessionStorage.getItem(`${TABLE_CACHE_PREFIX}${tableId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Keep the last known payload so a revisit or auth remount does not flash empty state.
 *
 * Accepts a full `get_table` payload (`table_id`) or a bare decide slice (`session_id`);
 * both key off the same id, since the merge made the decide session id the table id.
 *
 * @param {object | null | undefined} table
 */
export function persistCachedTable(table) {
  const id = table?.table_id || table?.session_id;
  if (typeof window === 'undefined' || !id) return;
  try {
    window.sessionStorage.setItem(`${TABLE_CACHE_PREFIX}${id}`, JSON.stringify(table));
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
export function tableErrorMessage(code, t) {
  if (!code) return null;
  const key = `pages.table.error_${code}`;
  const translated = t(key);
  return translated === key ? t('pages.table.error_generic') : translated;
}

/**
 * Flatten list items into vote-panel place rows.
 * @param {unknown} items
 * @param {string} unnamedPlace
 * @returns {{ restaurantId: string, name: string, mapsLink: string | null, photo: string | null }[]}
 */
export function mapListItemsToPlaces(items, unnamedPlace) {
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
 * Instant restaurant-detail stub from a Table place row, so the sheet can open
 * with name + photo while the full restaurant page payload loads.
 * @param {{ restaurantId?: string, name?: string, mapsLink?: string | null, photo?: string | null } | null | undefined} place
 * @returns {object | null}
 */
export function tablePlaceToSheetRestaurant(place) {
  const id = place?.restaurantId ? String(place.restaurantId) : '';
  if (!id) return null;
  const photo = typeof place.photo === 'string' && place.photo.trim() ? place.photo.trim() : null;
  return {
    id,
    name: place.name || '',
    maps_link: place.mapsLink || null,
    restaurant_images: photo ? [{ url: photo, sort_order: 0 }] : [],
  };
}

/**
 * Deduped shortlist picker rows: extras from catalog search first, then list places.
 * @param {{ restaurantId: string, name: string }[]} listPlaces
 * @param {{ restaurantId: string, name: string }[]} extraPlaces
 * @returns {{ restaurantId: string, name: string }[]}
 */
export function tablePickerRows(listPlaces, extraPlaces) {
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
export function tableSelectedPickerRows(listPlaces, extraPlaces, selectedIds) {
  const selected = selectedIds instanceof Set ? selectedIds : new Set();
  const keep = (place) => Boolean(place?.restaurantId) && selected.has(place.restaurantId);
  return tablePickerRows(
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
export function filterTablePickerRows(places, query) {
  const rows = Array.isArray(places) ? places : [];
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (q.length < 2) return rows;
  return rows.filter((p) => String(p.name || '').toLowerCase().includes(q));
}

/**
 * Classify the live-page catalog search: idle, pending, results, already_at_table, empty.
 * @param {{ query?: unknown, hits?: unknown, existingIds?: Set<string> | unknown, pending?: boolean }} params
 * @returns {'idle' | 'pending' | 'results' | 'already_at_table' | 'empty'}
 */
export function tableAddSearchState({ query, hits, existingIds, pending } = {}) {
  const q = String(query || '').trim();
  if (q.length < 2) return 'idle';
  if (pending) return 'pending';
  const atTable = existingIds instanceof Set ? existingIds : new Set();
  const list = Array.isArray(hits) ? hits : [];
  const fresh = list.filter((hit) => {
    const id = hit?.id ? String(hit.id) : '';
    return Boolean(id) && !atTable.has(id);
  });
  if (fresh.length > 0) return 'results';
  const anyHit = list.some((hit) => Boolean(hit?.id));
  return anyHit ? 'already_at_table' : 'empty';
}

/**
 * Toggle a restaurant id in a shortlist Set.
 * Pass `maxPlaces` only when a caller still wants a cap; omit for unlimited.
 * Returns the previous Set when the toggle is a no-op (missing id or already at cap).
 * @param {Set<string> | unknown} selectedIds
 * @param {unknown} restaurantId
 * @param {number} [maxPlaces]
 * @returns {Set<string>}
 */
export function toggleSelectedIds(selectedIds, restaurantId, maxPlaces) {
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
 * Organiser (owner or holder of lock_token) can settle an open table.
 * @param {{ tableId?: string | null, locked?: boolean, isOwner?: boolean, lockToken?: string | null }} params
 * @returns {boolean}
 */
export function canLockTable({ tableId, locked, isOwner, lockToken } = {}) {
  return Boolean(tableId && !locked && (isOwner || lockToken));
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

/**
 * Pad a number to two digits for `datetime-local` values.
 * @param {number} value
 * @returns {string}
 */
function pad2(value) {
  return String(value).padStart(2, '0');
}

/**
 * Parse a table `starts_at` into a Date, or null when missing/invalid.
 * @param {unknown} raw
 * @returns {Date | null}
 */
export function parseTableStartsAt(raw) {
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Convert an ISO timestamptz into a `datetime-local` value in the browser timezone.
 * @param {unknown} iso
 * @returns {string}
 */
export function datetimeLocalFromIso(iso) {
  const date = parseTableStartsAt(iso);
  if (!date) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/**
 * Convert a `datetime-local` value (no timezone) into an ISO string in this device's zone.
 * Must run in the browser — a UTC server would shift dinner time.
 * @param {unknown} value
 * @returns {string | null}
 */
export function isoFromDatetimeLocal(value) {
  if (typeof value !== 'string') return null;
  const local = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(local)) return null;
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Break a table start time into copy parts (today / tomorrow / later).
 * @param {unknown} raw
 * @param {{ now?: Date, locale?: object }} [opts]
 * @returns {{ kind: 'today' | 'tomorrow' | 'later', time: string, dateLabel: string } | null}
 */
export function tableWhenParts(raw, { now = new Date(), locale } = {}) {
  const date = parseTableStartsAt(raw);
  if (!date) return null;
  const startOfDayMs = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const deltaDays = Math.round((startOfDayMs(date) - startOfDayMs(now)) / 86_400_000);
  const kind = deltaDays === 0 ? 'today' : deltaDays === 1 ? 'tomorrow' : 'later';
  return {
    kind,
    time: format(date, 'p', { locale }),
    dateLabel: format(date, 'EEE d MMM', { locale }),
  };
}

/**
 * Localized "when this table is" line, or empty when no start time is set.
 * @param {unknown} raw
 * @param {(key: string, vars?: object) => string} t
 * @param {{ now?: Date, locale?: object }} [opts]
 * @returns {string}
 */
export function formatTableWhenLabel(raw, t, opts) {
  const parts = tableWhenParts(raw, opts);
  if (!parts || typeof t !== 'function') return '';
  if (parts.kind === 'today') return t('pages.table.when_today', { time: parts.time });
  if (parts.kind === 'tomorrow') return t('pages.table.when_tomorrow', { time: parts.time });
  return t('pages.table.when_on', { date: parts.dateLabel, time: parts.time });
}

/**
 * This device already took a named seat at this table (survives a reload so the
 * vote page does not flash the join gate while guests hydrate).
 * @param {string | null | undefined} tableId
 * @returns {boolean}
 */
export function readTableNamed(tableId) {
  if (typeof window === 'undefined' || !tableId) return false;
  try {
    return window.localStorage.getItem(`${TABLE_NAMED_PREFIX}${tableId}`) === '1';
  } catch {
    return false;
  }
}

/**
 * Remember that this device named itself at this table.
 * @param {string | null | undefined} tableId
 */
export function persistTableNamed(tableId) {
  if (typeof window === 'undefined' || !tableId) return;
  try {
    window.localStorage.setItem(`${TABLE_NAMED_PREFIX}${tableId}`, '1');
  } catch {
    // ignore
  }
}

/**
 * Whether this guest_key already has a non-empty display name in the payload.
 * @param {unknown} guests
 * @param {string | null | undefined} guestKey
 * @returns {boolean}
 */
export function guestHasDisplayName(guests, guestKey) {
  if (!guestKey) return false;
  const key = String(guestKey);
  return (Array.isArray(guests) ? guests : []).some((g) => {
    if (String(g?.guest_key) !== key) return false;
    return Boolean(typeof g?.display_name === 'string' && g.display_name.trim());
  });
}

/**
 * Render the who's-at-the-table line. Anonymous seats collapse into a "+N" tail
 * so a voter who never named themselves still shows up in the count.
 * @param {unknown} guests
 * @returns {{ count: number, names: string[], anonymous: number }}
 */
export function summarizeGuests(guests) {
  const rows = Array.isArray(guests) ? guests : [];
  const names = rows
    .map((g) => (typeof g?.display_name === 'string' ? g.display_name.trim() : ''))
    .filter(Boolean);
  return { count: rows.length, names, anonymous: rows.length - names.length };
}
