/**
 * Pick the best NomNom restaurant for an imported Google Maps place.
 *
 * The previous matcher took the first restaurant inside a ~110m coordinate box
 * regardless of name, so two distinct neighbours collapsed onto whichever row
 * sorted first. This requires an actual name match (exact or containment,
 * accent- and venue-prefix-insensitive for Portuguese names) and tie-breaks by
 * distance. No name match → no match (reported as not-found), never a wrong one.
 */

// Leading venue-type words carry no identity ("Restaurante O Trevo" === "O Trevo").
const VENUE_PREFIX_RE =
  /^(restaurante|restaurant|cafe|tasca|tasquinha|cervejaria|marisqueira|churrasqueira|pizzaria|pizzeria|snack bar|bar)\s+/;

/**
 * Lowercase, strip diacritics, drop punctuation, drop a leading venue-type word.
 * @param {unknown} name
 * @returns {string}
 */
export function normalizeName(name) {
  if (typeof name !== 'string') return '';
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents: ã ç ó -> a c o
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return base.replace(VENUE_PREFIX_RE, '').trim();
}

/**
 * 3 = exact, 2 = one name contains the other (≥3 chars), 0 = no match.
 * @param {unknown} placeName
 * @param {unknown} candidateName
 * @returns {number}
 */
export function nameMatchScore(placeName, candidateName) {
  const a = normalizeName(placeName);
  const b = normalizeName(candidateName);
  if (!a || !b) return 0;
  if (a === b) return 3;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length >= 3 && longer.includes(shorter)) return 2;
  return 0;
}

function squaredDistance(place, candidate) {
  if (
    typeof place?.lat !== 'number' ||
    typeof place?.lng !== 'number' ||
    typeof candidate?.latitude !== 'number' ||
    typeof candidate?.longitude !== 'number'
  ) {
    return Infinity;
  }
  const dLat = candidate.latitude - place.lat;
  const dLng = candidate.longitude - place.lng;
  return dLat * dLat + dLng * dLng;
}

/**
 * @param {{ name: string, lat?: number, lng?: number }} place
 * @param {{ id: string, name: string, latitude?: number, longitude?: number }[]} candidates
 * @returns {object|null} best candidate, or null when none match by name
 */
export function pickRestaurantMatch(place, candidates) {
  if (!place || !Array.isArray(candidates)) return null;
  const best = candidates.reduce(
    (acc, candidate) => {
      const score = nameMatchScore(place.name, candidate?.name);
      if (score === 0) return acc;
      const dist = squaredDistance(place, candidate);
      if (score > acc.score || (score === acc.score && dist < acc.dist)) {
        return { candidate, score, dist };
      }
      return acc;
    },
    { candidate: null, score: 0, dist: Infinity }
  );
  return best.candidate;
}

/**
 * Score a candidate shortlist for an article extract (no coordinates).
 * Does not search the database — callers recall candidates first.
 *
 * @param {{ name: string, candidates?: { id: string, name: string, address?: string, city?: string }[] }} input
 * @returns {{
 *   status: 'matched' | 'ambiguous' | 'not_found',
 *   restaurant_id: string | null,
 *   candidates: { id: string, name: string, address?: string, city?: string }[],
 *   decision: 'accept' | 'drop' | null,
 * }}
 */
export function matchRestaurantByName({ name, candidates } = {}) {
  const list = Array.isArray(candidates) ? candidates.filter((c) => c?.id && c?.name) : [];
  const scored = list
    .map((candidate) => ({ candidate, score: nameMatchScore(name, candidate.name) }))
    .filter((row) => row.score >= 2);

  const exact = scored.filter((row) => row.score === 3);
  const contain = scored.filter((row) => row.score === 2);

  const toShortlist = (rows) =>
    rows.map(({ candidate }) => ({
      id: candidate.id,
      name: candidate.name,
      address: candidate.address ?? '',
      city: candidate.city ?? '',
    }));

  if (exact.length === 1) {
    return {
      status: 'matched',
      restaurant_id: exact[0].candidate.id,
      candidates: [],
      decision: 'accept',
    };
  }
  if (exact.length >= 2 || contain.length >= 1) {
    const shortlist = exact.length >= 2 ? exact : contain;
    return {
      status: 'ambiguous',
      restaurant_id: null,
      candidates: toShortlist(shortlist),
      decision: null,
    };
  }
  return {
    status: 'not_found',
    restaurant_id: null,
    candidates: [],
    decision: 'drop',
  };
}
