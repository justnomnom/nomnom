/**
 * Maps Google Maps–style scrape JSON to NomNom restaurant row fields + metadata.
 * @see plan: Google place ingest API
 */

/** @type {readonly string[]} */
export const PRICE_TAG_SLUGS = Object.freeze(['budget', 'moderate', 'upscale', 'fine_dining']);

const EMPTY_METADATA = () => /** @type {Record<string, unknown>} */ ({});

/**
 * @param {unknown} payload
 * @returns {{ lat: number, lng: number } | null}
 */
export function parseCoordinates(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const p = /** @type {Record<string, unknown>} */ (payload);
  const latRaw = p.latitude;
  let lngRaw = p.longitude;
  if (lngRaw == null && p.longtitude != null) {
    lngRaw = p.longtitude;
  }
  const lat = typeof latRaw === 'number' ? latRaw : parseFloat(String(latRaw));
  const lng = typeof lngRaw === 'number' ? lngRaw : parseFloat(String(lngRaw));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/**
 * Google/Outscraper price_range shapes:
 *   - Symbol tier: "$", "$$", "$$$", "$$$$" (also "€€", "£££", "¥¥¥¥")
 *   - Numeric range: "$10–20", "€15–20", "£20-30"
 *   - Open-ended top: "€50+", "$100+" → always tier 4
 * Numeric ranges are mapped from upper bound, in source currency:
 *   ≤10 → 1, 11–25 → 2, 26–50 → 3, >50 → 4
 * @param {unknown} priceRange
 * @returns {{ priceLevel: number | null, priceTagSlug: string | null }}
 */
export function priceRangeToPriceLevelAndSlug(priceRange) {
  if (priceRange == null || typeof priceRange !== 'string') {
    return { priceLevel: null, priceTagSlug: null };
  }
  const t = priceRange.trim();
  if (!t) return { priceLevel: null, priceTagSlug: null };

  const digitMatches = t.match(/\d+/g);
  if (digitMatches?.length) {
    const upper = Math.max(...digitMatches.map((n) => parseInt(n, 10)));
    const openEnded = /\d\s*\+/.test(t);
    let level;
    if (openEnded) level = 4;
    else if (upper <= 10) level = 1;
    else if (upper <= 25) level = 2;
    else if (upper <= 50) level = 3;
    else level = 4;
    return { priceLevel: level, priceTagSlug: PRICE_TAG_SLUGS[level - 1] ?? null };
  }

  const symbolCount = (t.match(/[$€£¥]/g) || []).length;
  if (symbolCount < 1 || symbolCount > 4) {
    return { priceLevel: null, priceTagSlug: null };
  }
  return {
    priceLevel: symbolCount,
    priceTagSlug: PRICE_TAG_SLUGS[symbolCount - 1] ?? null,
  };
}

/**
 * @param {unknown} about
 * @returns {Array<{ groupId: string, groupName: string, option: string }>}
 */
export function flattenAboutEnabled(about) {
  if (!Array.isArray(about)) return [];
  return about.flatMap((group) => {
    if (!group || typeof group !== 'object') return [];
    const g = /** @type {Record<string, unknown>} */ (group);
    const groupId = typeof g.id === 'string' ? g.id : '';
    const groupName = typeof g.name === 'string' ? g.name : '';
    const { options } = g;
    if (!Array.isArray(options)) return [];
    return options.flatMap((opt) => {
      if (!opt || typeof opt !== 'object') return [];
      const o = /** @type {Record<string, unknown>} */ (opt);
      if (!o.enabled) return [];
      const name = typeof o.name === 'string' ? o.name.trim() : '';
      if (!name) return [];
      return [{ groupId, groupName, option: name }];
    });
  });
}

/**
 * Outscraper returns thumbnail-sized Google image URLs ending in `=w397-h298-k-no`
 * or `=s120`. Google's image server honors arbitrary size hints, so rewriting the
 * suffix to a larger width yields a higher-resolution image without re-scraping.
 *
 * @param {string} url
 * @returns {string}
 */
export function upgradeGoogleImageUrl(url) {
  if (typeof url !== 'string') return url;
  if (!/googleusercontent\.com\//i.test(url)) return url;
  const target = '=w1600-h1200-k-no';
  if (/=w\d+-h\d+(?:-[a-z-]+)?$/i.test(url)) {
    return url.replace(/=w\d+-h\d+(?:-[a-z-]+)?$/i, target);
  }
  if (/=s\d+(?:-[a-z-]+)?$/i.test(url)) {
    return url.replace(/=s\d+(?:-[a-z-]+)?$/i, target);
  }
  if (/=[a-z0-9-]+$/i.test(url)) {
    return url.replace(/=[a-z0-9-]+$/i, target);
  }
  return `${url}${target}`;
}

/**
 * Outscraper's `images` array is one entry per album, ordered by Google's UI:
 *   "All", "Food & drink", "Vibe", "Menu", "By owner", "Latest", "Videos",
 *   "Street View & 360°", plus named-dish albums ("Pizza", "Sushi", …).
 * "Latest" surfaces the most recent review photo (often low quality / off-topic).
 * "Videos" is a video thumbnail, not a still. Both are excluded.
 * Street View is also excluded.
 *
 * Album order is reshuffled to put owner-uploaded and curated themed albums first,
 * then named-dish covers, so the resulting gallery reflects the restaurant rather
 * than the latest random review.
 *
 * @param {unknown} images
 * @param {{ max?: number }} [opts]
 * @returns {string[]}
 */
export function selectImageUrls(images, opts = {}) {
  const max = opts.max ?? 25;
  if (!Array.isArray(images)) return [];
  const priority = ['by owner', 'all', 'food & drink', 'vibe', 'menu'];
  const skip = /^(latest|videos?|street\s*view.*)$/i;
  const scored = images
    .map((item, i) => {
      if (!item || typeof item !== 'object') return null;
      const im = /** @type {Record<string, unknown>} */ (item);
      const title = typeof im.title === 'string' ? im.title.trim() : '';
      const url = typeof im.image === 'string' ? im.image.trim() : '';
      if (!url) return null;
      if (skip.test(title)) return null;
      if (url.includes('streetviewpixels')) return null;
      const idx = priority.indexOf(title.toLowerCase());
      const rank = idx === -1 ? priority.length : idx;
      return { url: upgradeGoogleImageUrl(url), rank, order: i };
    })
    .filter((x) => x != null);
  scored.sort((a, b) => a.rank - b.rank || a.order - b.order);
  const seen = new Set();
  return scored.reduce((out, s) => {
    if (out.length >= max) return out;
    if (seen.has(s.url)) return out;
    seen.add(s.url);
    out.push(s.url);
    return out;
  }, /** @type {string[]} */ ([]));
}

function trimOrNull(v) {
  if (v == null) return null;
  const s = typeof v === 'string' ? v.trim() : String(v).trim();
  return s.length ? s : null;
}

function parseClock(str) {
  const m = str
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  if (h > 23 || min > 59) return null;
  const mer = m[3]?.replace(/\./g, '');
  const hasMeridiem = !!mer;
  if (hasMeridiem) {
    if (mer === 'pm' && h < 12) h += 12;
    if (mer === 'am' && h === 12) h = 0;
  }
  return { hour: h, minute: min, hasMeridiem };
}

/**
 * Parse one Google hours string like "12–3 p.m.", "8 a.m.–10 p.m.", "12 p.m.–2 a.m.".
 * @param {string} str
 * @returns {{ open: string, close: string, crosses_midnight: boolean } | null}
 */
export function parseHourInterval(str) {
  if (!str || typeof str !== 'string') return null;
  if (/^\s*closed\s*$/i.test(str)) return null;
  // Use Unicode-aware dash split (em-dash, en-dash, hyphen)
  const parts = str.split(/\s*[–—-]\s*/);
  if (parts.length !== 2) return null;
  const right = parseClock(parts[1]);
  if (!right) return null;
  let left = parseClock(parts[0]);
  if (!left) return null;
  if (!left.hasMeridiem && right.hasMeridiem) {
    // Inherit meridiem from right side. "12–3 p.m." → left 12pm, right 3pm.
    // For "11–1 p.m." this would yield 11am→1pm which is correct since left < right after meridiem.
    const inheritMer = right.hour >= 12 ? 'pm' : 'am';
    left = parseClock(`${parts[0]} ${inheritMer}`);
    if (!left) return null;
    // If the inherited meridiem makes left >= right and there's a gap (e.g. "11–1 pm" → 23:00→13:00),
    // flip to am.
    const lMins = left.hour * 60 + left.minute;
    const rMins = right.hour * 60 + right.minute;
    if (lMins > rMins && left.hour >= 12) {
      const alt = parseClock(`${parts[0]} am`);
      if (alt) left = alt;
    }
  }
  const fmt = (t) => `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
  const lMins = left.hour * 60 + left.minute;
  const rMins = right.hour * 60 + right.minute;
  return { open: fmt(left), close: fmt(right), crosses_midnight: rMins < lMins };
}

/**
 * @param {unknown} openHours
 * @returns {Record<string, Array<{ open: string, close: string, crosses_midnight: boolean }>> | null}
 */
export function parseOpenHours(openHours) {
  if (!openHours || typeof openHours !== 'object') return null;
  return Object.entries(openHours).reduce((result, [day, intervals]) => {
    if (!Array.isArray(intervals)) return result;
    result[day] = intervals
      .map((s) => (typeof s === 'string' ? parseHourInterval(s) : null))
      .filter((x) => x != null);
    return result;
  }, /** @type {Record<string, Array<{ open: string, close: string, crosses_midnight: boolean }>>} */ ({}));
}

/**
 * @param {unknown} status
 * @param {unknown} openHours
 * @returns {'permanently_closed' | 'temporarily_closed' | 'closed_all_days' | null}
 */
export function detectClosedStatus(status, openHours) {
  const s = typeof status === 'string' ? status.trim().toLowerCase() : '';
  if (/permanently\s*closed/.test(s)) return 'permanently_closed';
  if (/temporarily\s*closed/.test(s)) return 'temporarily_closed';
  if (openHours && typeof openHours === 'object') {
    const days = Object.values(openHours).filter(Array.isArray);
    if (
      days.length > 0 &&
      days.every((d) => d.length === 1 && typeof d[0] === 'string' && /^\s*closed\s*$/i.test(d[0]))
    ) {
      return 'closed_all_days';
    }
  }
  return null;
}

/**
 * @param {unknown} arr
 * @returns {Array<{ link: string, source: string | null }>}
 */
export function normalizeLinkArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.reduce((acc, x) => {
    if (acc.length >= 10) return acc;
    if (!x || typeof x !== 'object') return acc;
    const o = /** @type {Record<string, unknown>} */ (x);
    const link = typeof o.link === 'string' ? o.link.trim() : '';
    if (!/^https?:\/\//i.test(link)) return acc;
    const source = typeof o.source === 'string' ? o.source.trim() : '';
    return [...acc, { link, source: source || null }];
  }, []);
}

/**
 * @param {unknown} owner
 * @returns {{ id: string | null, name: string | null, link: string | null } | null}
 */
export function normalizeOwner(owner) {
  if (!owner || typeof owner !== 'object') return null;
  const o = /** @type {Record<string, unknown>} */ (owner);
  const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : null;
  const name = typeof o.name === 'string' && o.name.trim() ? o.name.trim() : null;
  const linkRaw = typeof o.link === 'string' ? o.link.trim() : '';
  const link = /^https?:\/\//i.test(linkRaw) ? linkRaw : null;
  if (!id && !name && !link) return null;
  return { id, name, link };
}

/**
 * Outscraper's `mentioned_in_reviews` is real-aggregate dish counts across all
 * reviews on Google (not just the 25-review sample). Vastly better signal than
 * AI-counted dishes from sampled reviews. Cap at 20 to keep metadata size sane.
 * @param {unknown} arr
 * @returns {Array<{ label: string, mentions: number }>}
 */
export function normalizeMentionedInReviews(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const normalized = arr
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = /** @type {Record<string, unknown>} */ (item);
      const rawName = typeof o.name === 'string' ? o.name.trim() : '';
      if (!rawName || rawName.length > 80) return null;
      const rawCount = typeof o.count === 'number' ? o.count : parseInt(String(o.count ?? ''), 10);
      if (!Number.isFinite(rawCount) || rawCount < 1) return null;
      return { label: rawName, mentions: Math.floor(rawCount) };
    })
    .filter((x) => {
      if (!x) return false;
      const key = x.label.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  normalized.sort((a, b) => b.mentions - a.mentions);
  return normalized.slice(0, 20);
}

const MAX_USER_REVIEWS = 25;
// Matches the usable-text threshold in review-consensus-ai.js and review-sample-diff.js.
const MIN_MEANINGFUL_REVIEW_TEXT_CHARS = 10;

/**
 * Scrapes arrive newest-first and many recent Google reviews are rating-only,
 * so a plain head slice can starve the review-consensus AI of text. Reviews are
 * ranked into the cap by tier — meaningful text (≥10 chars) first, then short
 * text, then rating-only — preserving newest-first order within each tier, so
 * the ≥10-char subsequence (what the consensus hash covers) keeps its relative
 * order across ingests.
 *
 * @param {unknown} reviews
 * @returns {Array<{
 *   author_name: string | null,
 *   author_avatar: string | null,
 *   rating: number | null,
 *   text: string | null,
 *   when: string | null,
 * }>}
 */
export function normalizeUserReviews(reviews) {
  if (!Array.isArray(reviews)) return [];
  const scored = reviews
    .map((r, i) => {
      if (!r || typeof r !== 'object') return null;
      const o = /** @type {Record<string, unknown>} */ (r);
      const text = typeof o.Description === 'string' ? o.Description.trim() : '';
      const rating = typeof o.Rating === 'number' && Number.isFinite(o.Rating) ? o.Rating : null;
      if (!text && rating == null) return null;
      let rank;
      if (text.length >= MIN_MEANINGFUL_REVIEW_TEXT_CHARS) rank = 0;
      else if (text) rank = 1;
      else rank = 2;
      return {
        review: {
          author_name: typeof o.Name === 'string' && o.Name.trim() ? o.Name.trim() : null,
          author_avatar:
            typeof o.ProfilePicture === 'string' && /^https?:\/\//i.test(o.ProfilePicture)
              ? o.ProfilePicture
              : null,
          rating,
          text: text || null,
          when: typeof o.When === 'string' && o.When.trim() ? o.When.trim() : null,
        },
        rank,
        order: i,
      };
    })
    .filter((x) => x != null);
  scored.sort((a, b) => a.rank - b.rank || a.order - b.order);
  return scored.slice(0, MAX_USER_REVIEWS).map((s) => s.review);
}

/**
 * @param {unknown} payload
 * @returns {{
 *   row: {
 *     external_place_id: string,
 *     name: string,
 *     address: string | null,
 *     latitude: number,
 *     longitude: number,
 *     rating: number | null,
 *     price_level: number | null,
 *     phone: string | null,
 *     website: string | null,
 *     maps_link: string | null,
 *     menu_url: string | null,
 *     menu_source: string | null,
 *   },
 *   priceTagSlug: string | null,
 *   metadataBase: Record<string, unknown>,
 *   flattenedAbout: ReturnType<typeof flattenAboutEnabled>,
 *   imageUrls: string[],
 *   closedStatus: ReturnType<typeof detectClosedStatus>,
 * }}
 */
export function mapGooglePlacePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('invalid_payload');
  }
  const p = /** @type {Record<string, unknown>} */ (payload);
  const coords = parseCoordinates(p);
  if (!coords) {
    throw new Error('invalid_coordinates');
  }
  const placeId = trimOrNull(p.place_id);
  const title = trimOrNull(p.title);
  if (!placeId) throw new Error('missing_place_id');
  if (!title) throw new Error('missing_title');

  const { priceLevel, priceTagSlug } = priceRangeToPriceLevelAndSlug(p.price_range);

  const menu =
    p.menu && typeof p.menu === 'object' ? /** @type {Record<string, unknown>} */ (p.menu) : null;
  const menuUrl = menu && typeof menu.link === 'string' ? trimOrNull(menu.link) : null;
  const menuSource = menu && typeof menu.source === 'string' ? trimOrNull(menu.source) : null;

  const { review_rating: reviewRating } = p;
  let rating =
    typeof reviewRating === 'number' && Number.isFinite(reviewRating)
      ? reviewRating
      : parseFloat(String(reviewRating ?? ''));
  if (!Number.isFinite(rating)) rating = null;

  const reviewCount =
    typeof p.review_count === 'number' && Number.isFinite(p.review_count) && p.review_count >= 0
      ? p.review_count
      : null;

  const aboutRaw = p.about;
  const flattenedAbout = flattenAboutEnabled(aboutRaw);

  const openHoursRaw =
    p.open_hours && typeof p.open_hours === 'object' && !Array.isArray(p.open_hours)
      ? p.open_hours
      : null;
  const hoursParsed = parseOpenHours(openHoursRaw);
  const closedStatus = detectClosedStatus(p.status, openHoursRaw);

  const reservations = normalizeLinkArray(p.reservations);
  const orderOnline = normalizeLinkArray(p.order_online);
  const owner = normalizeOwner(p.owner);
  const userReviews = normalizeUserReviews(p.user_reviews);
  const mentionedInReviews = normalizeMentionedInReviews(p.mentioned_in_reviews);

  const popularTimes =
    p.popular_times &&
    typeof p.popular_times === 'object' &&
    !Array.isArray(p.popular_times) &&
    Object.keys(p.popular_times).length > 0
      ? p.popular_times
      : null;

  const statusStr = typeof p.status === 'string' && p.status.trim() ? p.status.trim() : null;
  const plusCode = trimOrNull(p.plus_code);
  const reviewsLink =
    typeof p.reviews_link === 'string' && /^https?:\/\//i.test(p.reviews_link)
      ? p.reviews_link.trim()
      : null;
  const primaryCategory = trimOrNull(p.category);

  const metadataBase = {
    ...EMPTY_METADATA(),
    ...(typeof p.description === 'string' && p.description.trim()
      ? { description: p.description.trim() }
      : {}),
    ...(openHoursRaw ? { open_hours: openHoursRaw } : {}),
    ...(hoursParsed && Object.keys(hoursParsed).length > 0 ? { hours_parsed: hoursParsed } : {}),
    ...(Array.isArray(aboutRaw) ? { about: aboutRaw } : {}),
    ...(Array.isArray(p.categories) ? { categories: p.categories } : {}),
    ...(primaryCategory ? { primary_category: primaryCategory } : {}),
    ...(typeof p.timezone === 'string' ? { timezone: p.timezone } : {}),
    ...(p.complete_address && typeof p.complete_address === 'object'
      ? { complete_address: p.complete_address }
      : {}),
    ...(p.reviews_per_rating && typeof p.reviews_per_rating === 'object'
      ? { reviews_per_rating: p.reviews_per_rating }
      : {}),
    ...(reviewCount != null ? { review_count: reviewCount } : {}),
    ...(popularTimes ? { popular_times: popularTimes } : {}),
    ...(userReviews.length ? { user_reviews: userReviews } : {}),
    ...(mentionedInReviews.length ? { mentioned_in_reviews: mentionedInReviews } : {}),
    ...(reservations.length ? { reservations } : {}),
    ...(orderOnline.length ? { order_online: orderOnline } : {}),
    ...(owner ? { owner } : {}),
    ...(plusCode ? { plus_code: plusCode } : {}),
    ...(reviewsLink ? { reviews_link: reviewsLink } : {}),
    ...(statusStr ? { status: statusStr } : {}),
    ...(closedStatus ? { is_closed: true, closed_reason: closedStatus } : {}),
    ...(typeof p.cid === 'string' ? { cid: p.cid } : {}),
    ...(typeof p.data_id === 'string' ? { data_id: p.data_id } : {}),
  };

  const imageUrls = selectImageUrls(p.images, { max: 25 });

  if (imageUrls.length > 0) {
    metadataBase.photos = imageUrls;
    metadataBase.image_url = imageUrls[0];
  } else if (typeof p.thumbnail === 'string' && /^https?:\/\//i.test(p.thumbnail)) {
    metadataBase.image_url = p.thumbnail.trim();
    metadataBase.photos = [p.thumbnail.trim()];
  }

  return {
    row: {
      external_place_id: placeId,
      name: title,
      address: trimOrNull(p.address),
      latitude: coords.lat,
      longitude: coords.lng,
      rating,
      price_level: priceLevel,
      phone: trimOrNull(p.phone),
      website: trimOrNull(p.web_site),
      maps_link: trimOrNull(p.link),
      menu_url: menuUrl,
      menu_source: menuUrl ? menuSource : null,
    },
    priceTagSlug,
    metadataBase,
    flattenedAbout,
    imageUrls,
    closedStatus,
  };
}
