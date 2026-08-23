/**
 * Read side for the opening hours that `restaurant-ingest` writes.
 *
 * Ingest parses Google's hour strings into `metadata.hours_parsed`
 * (`{ [dayName]: Array<{ open: 'HH:MM', close: 'HH:MM', crosses_midnight: boolean }> }`,
 * see `map-google-place-payload.js`), alongside `metadata.timezone`,
 * `metadata.is_closed` and `metadata.closed_reason`. Nothing has ever read them:
 * `slim-restaurant-card-metadata.js` drops `hours_parsed` and `open_hours` from every
 * row because the full metadata blob averages ~7.7 KB and the map refetches on each pan.
 *
 * Map/feed RPCs resolve hours in SQL (`restaurant_opening_status`) and return
 * `opening_status` alongside already-slim `metadata`. `attachOpeningStatusToRows`
 * prefers that column; `resolveOpeningStatus()` remains for detail SSR / tests
 * that still see full hours in metadata.
 */

/** Google's day keys are capitalised English names — index matches `Date#getDay()`. */
const DAY_KEYS = Object.freeze([
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]);

/** Restaurants are Portuguese unless ingest said otherwise. */
const DEFAULT_RESTAURANT_TIMEZONE = 'Europe/Lisbon';

/** @typedef {{ open: string, close: string, crosses_midnight?: boolean }} HourInterval */
/**
 * @typedef {'open' | 'closed' | 'unknown' | 'permanently_closed' | 'temporarily_closed'} OpeningStatus
 * @typedef {{ status: OpeningStatus, closesAt: string | null, opensAt: string | null, today: HourInterval[] }} OpeningStatusResult
 */

/** `'HH:MM'` → minutes since midnight, or null when malformed. */
export function minutesFromClock(clock) {
  if (typeof clock !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(clock.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

/**
 * Weekday index and minutes-since-midnight *at the restaurant*, not on the viewer's clock.
 * An invalid timezone falls back rather than throwing — bad ingest data must never break a page.
 *
 * @param {Date} now
 * @param {string} timeZone
 * @returns {{ dayIndex: number, minutes: number }}
 */
export function localTimeParts(now, timeZone) {
  const read = (tz) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
    const dayIndex = DAY_KEYS.indexOf(get('weekday'));
    // `hour12: false` yields '24' at midnight in some ICU versions.
    const hour = Number(get('hour')) % 24;
    const minute = Number(get('minute'));
    return { dayIndex, minutes: hour * 60 + minute };
  };
  try {
    return read(timeZone || DEFAULT_RESTAURANT_TIMEZONE);
  } catch {
    return read(DEFAULT_RESTAURANT_TIMEZONE);
  }
}

/** @returns {HourInterval[]} intervals for a day key, always an array. */
function intervalsForDay(hoursParsed, dayIndex) {
  const key = DAY_KEYS[((dayIndex % 7) + 7) % 7];
  const raw = hoursParsed?.[key];
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (i) =>
      i &&
      typeof i === 'object' &&
      minutesFromClock(i.open) !== null &&
      minutesFromClock(i.close) !== null
  );
}

/**
 * Does `interval` (belonging to `offsetDays` ago) cover `minutes` now?
 * A `crosses_midnight` interval opened yesterday still counts this morning.
 */
function covers(interval, minutes, offsetDays) {
  const open = minutesFromClock(interval.open);
  const close = minutesFromClock(interval.close);
  if (open === null || close === null) return false;
  const crosses = Boolean(interval.crosses_midnight) || close < open;
  if (offsetDays === 0) {
    return crosses ? minutes >= open : minutes >= open && minutes < close;
  }
  // Yesterday's interval only reaches into today when it crosses midnight.
  return crosses && minutes < close;
}

/**
 * Current open/closed state for a restaurant.
 *
 * Missing or unparseable hours resolve to `'unknown'` — never `'closed'`. Telling someone
 * a place is shut because ingest failed is worse than saying nothing.
 *
 * @param {unknown} metadata raw `restaurants.metadata` (pre-slimming)
 * @param {Date} [now]
 * @returns {OpeningStatusResult}
 */
export function resolveOpeningStatus(metadata, now = new Date()) {
  const empty = {
    status: /** @type {OpeningStatus} */ ('unknown'),
    closesAt: null,
    opensAt: null,
    today: [],
  };
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return empty;
  const meta = /** @type {Record<string, unknown>} */ (metadata);

  if (meta.is_closed === true) {
    const reason = meta.closed_reason;
    const status = reason === 'temporarily_closed' ? 'temporarily_closed' : 'permanently_closed';
    return { ...empty, status: /** @type {OpeningStatus} */ (status) };
  }

  const hoursParsed = meta.hours_parsed;
  if (!hoursParsed || typeof hoursParsed !== 'object' || Array.isArray(hoursParsed)) return empty;

  const timeZone = typeof meta.timezone === 'string' ? meta.timezone : DEFAULT_RESTAURANT_TIMEZONE;
  const { dayIndex, minutes } = localTimeParts(now, timeZone);
  if (dayIndex < 0) return empty;

  const today = intervalsForDay(hoursParsed, dayIndex);
  const yesterday = intervalsForDay(hoursParsed, dayIndex - 1);
  if (today.length === 0 && yesterday.length === 0) return { ...empty, today };

  const openNow =
    today.find((i) => covers(i, minutes, 0)) ??
    yesterday.find((i) => covers(i, minutes, 1)) ??
    null;
  if (openNow) {
    return { status: 'open', closesAt: openNow.close, opensAt: null, today };
  }

  // Closed: report the next opening today, if there is one still to come.
  const next = today
    .filter((i) => {
      const open = minutesFromClock(i.open);
      return open !== null && open > minutes;
    })
    .sort((a, b) => (minutesFromClock(a.open) ?? 0) - (minutesFromClock(b.open) ?? 0))[0];

  return { status: 'closed', closesAt: null, opensAt: next?.open ?? null, today };
}

/**
 * Normalize a SQL `opening_status` jsonb (or camelCase) into the client `openingStatus` shape.
 * Returns null when absent / unknown so callers can omit the field from the payload.
 *
 * @param {unknown} value
 * @returns {{ status: OpeningStatus, closesAt?: string, opensAt?: string } | null}
 */
export function normalizeOpeningStatus(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const src = /** @type {Record<string, unknown>} */ (value);
  const { status } = src;
  if (
    status !== 'open' &&
    status !== 'closed' &&
    status !== 'temporarily_closed' &&
    status !== 'permanently_closed'
  ) {
    return null;
  }
  /** @type {{ status: OpeningStatus, closesAt?: string, opensAt?: string }} */
  const out = { status };
  if (typeof src.closesAt === 'string' && src.closesAt) out.closesAt = src.closesAt;
  else if (typeof src.closes_at === 'string' && src.closes_at) out.closesAt = src.closes_at;
  if (typeof src.opensAt === 'string' && src.opensAt) out.opensAt = src.opensAt;
  else if (typeof src.opens_at === 'string' && src.opens_at) out.opensAt = src.opens_at;
  return out;
}

/**
 * Attach `openingStatus` to restaurant rows.
 *
 * Prefer SQL `opening_status` from map/feed RPCs (already resolved server-side; metadata is
 * card-slim and no longer carries `hours_parsed`). Fall back to deriving from `metadata` for
 * paths that still ship full hours (detail SSR, tests).
 *
 * Map *pins* stay untouched — they omit hours and never render an open/closed badge.
 *
 * @template {Record<string, unknown>} T
 * @param {T[] | null | undefined} rows
 * @param {Date} [now]
 * @returns {T[]}
 */
export function attachOpeningStatusToRows(rows, now = new Date()) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    if (!row || typeof row !== 'object') return row;
    const sqlStatus = row.opening_status ?? row.openingStatus;
    const fromSql = normalizeOpeningStatus(sqlStatus);
    if (fromSql) {
      const { opening_status: _drop, ...rest } = /** @type {Record<string, unknown>} */ (row);
      return /** @type {T} */ ({ ...rest, openingStatus: fromSql });
    }
    const openingStatus = openingStatusForRow(row.metadata, now);
    return openingStatus ? { ...row, openingStatus } : row;
  });
}

/**
 * The wire shape attached to restaurant rows. Deliberately tiny — this is the whole
 * reason hours are resolved server-side instead of shipped.
 *
 * Returns `null` for `'unknown'` so rows without usable hours add nothing to the payload.
 *
 * @param {unknown} metadata
 * @param {Date} [now]
 * @returns {{ status: OpeningStatus, closesAt?: string, opensAt?: string } | null}
 */
export function openingStatusForRow(metadata, now = new Date()) {
  const { status, closesAt, opensAt } = resolveOpeningStatus(metadata, now);
  if (status === 'unknown') return null;
  return {
    status,
    ...(closesAt ? { closesAt } : {}),
    ...(opensAt ? { opensAt } : {}),
  };
}
