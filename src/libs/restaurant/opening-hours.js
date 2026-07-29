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
 * So the rule here is: resolve to a **small derived object** on the server, before
 * slimming, and ship that instead of the hours themselves. `resolveOpeningStatus()`
 * returns a few dozen bytes rather than a few KB, which keeps the payload discipline
 * that slimming exists to protect.
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
 * Attach `openingStatus` to rows **before** `slimRestaurantRowsMetadata` drops the hours.
 * Order matters: slim first and there is nothing left to resolve from.
 *
 * Only worth calling on the heavy row fetches (spot list, feed) — map *pins* number in the
 * thousands and render no hours, so they should stay untouched.
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
