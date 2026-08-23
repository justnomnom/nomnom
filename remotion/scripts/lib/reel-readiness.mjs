// Reel-readiness scoring.
//
// Scores a subject on what the compositions actually render, not on how
// interesting it sounds. Every weight below maps to a scene element:
// no reviews means RestaurantReviewsReel has nothing to show, no photos means
// the review tiles fall back to an emoji, no consensus means the loves/knows
// section hides itself. Pure functions — no DB, no fs — so they can be tested.

/** Review scenes the reel shows by default (fetch-restaurant-props --reviews). */
export const TARGET_REVIEWS = 3;
/** Cuisine/vibe chips the identity scene renders. */
export const TARGET_CHIPS = 3;
/** Photos before extra ones stop changing the reel (one per review scene). */
export const TARGET_PHOTOS = 3;
/** Dish chips the consensus scene shows well. */
export const TARGET_DISHES = 3;

/**
 * Shortest review that can carry a whole scene. RestaurantSpotlight gives one
 * quote the full screen for ~5s, so a two-word review reads as a broken render.
 */
export const MIN_USABLE_QUOTE = 40;
/** Past this the quote is truncated with an ellipsis, which reads as clipped. */
export const IDEAL_QUOTE_MAX = 150;

/** Places in the ListShowcase recap grid (Scene3Recap slices to 4). */
export const RECAP_GRID_SIZE = 4;
/** Fewer than this and a list reel is just a slower single-spot reel. */
export const MIN_LIST_PLACES = 3;
/** ListShowcase runtime = 10s of fixed scenes + 3.5s per place. */
export const listReelSeconds = (placeCount) => 10 + 3.5 * Math.max(1, placeCount);

/**
 * Seeded and generated accounts — `e2eacct…`, `user61f2e950_954d26bf` — whose
 * handles the list reel would put on screen. Real usernames pass through.
 */
export const looksGeneratedHandle = (handle) => {
  const h = String(handle ?? '').replace(/^@/, '').toLowerCase();
  if (!h) return false;
  return /^e2e/.test(h) || /^user[0-9a-f]{6,}/.test(h) || /_[0-9a-f]{8,}$/.test(h);
};

const ratio = (value, target) => Math.min(Math.max(Number(value) || 0, 0), target) / target;
const round = (n) => Math.round(n * 10) / 10;

const RESTAURANT_WEIGHTS = {
  reviews: 35,
  photos: 20,
  chips: 15,
  dishes: 12,
  consensus: 10,
  coords: 5,
  rating: 3,
};

const REVIEW_WEIGHTS = {
  userReview: 30,
  quote: 30,
  photo: 20,
  chips: 10,
  rating: 5,
  dish: 5,
};

const LIST_WEIGHTS = {
  places: 30,
  photos: 25,
  creator: 10,
  description: 10,
  rating: 10,
  cityCoherence: 10,
  taglines: 5,
};

/**
 * Score one restaurant for RestaurantReviewsReel.
 *
 * @param {{ id: string, name: string, rating?: number|null, hasCoords?: boolean,
 *   onPlatformReviews?: number, googleReviews?: number, photos?: number,
 *   chips?: number, dishes?: number, hasConsensus?: boolean }} c
 * @returns {{ score: number, breakdown: object, blockers: string[], warnings: string[] }}
 */
export function scoreRestaurant(c) {
  const reviewPool = (Number(c.onPlatformReviews) || 0) + (Number(c.googleReviews) || 0);
  const photos = Number(c.photos) || 0;
  const chips = Number(c.chips) || 0;
  const dishes = Number(c.dishes) || 0;
  const rating = Number(c.rating) || 0;

  const breakdown = {
    reviews: RESTAURANT_WEIGHTS.reviews * ratio(reviewPool, TARGET_REVIEWS + 2),
    photos: RESTAURANT_WEIGHTS.photos * ratio(photos, TARGET_PHOTOS),
    chips: RESTAURANT_WEIGHTS.chips * ratio(chips, TARGET_CHIPS),
    dishes: RESTAURANT_WEIGHTS.dishes * ratio(dishes, TARGET_DISHES),
    consensus: c.hasConsensus ? RESTAURANT_WEIGHTS.consensus : 0,
    coords: c.hasCoords ? RESTAURANT_WEIGHTS.coords : 0,
    rating: RESTAURANT_WEIGHTS.rating * ratio(rating, 5),
  };

  const blockers = [];
  if (reviewPool === 0) blockers.push('no reviews with text — fetch-restaurant-props.mjs refuses to build props');

  const warnings = [];
  if (reviewPool > 0 && reviewPool < TARGET_REVIEWS) {
    warnings.push(`only ${reviewPool} review${reviewPool === 1 ? '' : 's'} — render with --reviews ${reviewPool}`);
  }
  if (photos === 0) warnings.push('no photos — review tiles fall back to the dish emoji');
  if (chips === 0) warnings.push('no cuisine/vibe tags — tagline falls back to the street address');
  if (!c.hasConsensus) warnings.push('no AI review_consensus — loves/knows built from leftover quotes');
  if (!c.hasCoords) warnings.push('no coordinates — map scene uses the stylized fallback');

  return {
    score: round(Object.values(breakdown).reduce((a, b) => a + b, 0)),
    breakdown: Object.fromEntries(Object.entries(breakdown).map(([k, v]) => [k, round(v)])),
    signals: { reviewPool, onPlatform: Number(c.onPlatformReviews) || 0, google: Number(c.googleReviews) || 0, photos, chips, dishes, rating },
    blockers,
    warnings,
  };
}

/**
 * Score one restaurant for RestaurantSpotlight — the review-led cut, where a
 * single quote carries a whole scene.
 *
 * A review from a NomNom user is worth far more than a Google one: it is the
 * product's own social proof, and the reel can credit a real handle. Google
 * reviews still work, but they are attributed to the Google reviewer by name.
 *
 * @param {{ id: string, name: string, rating?: number|null,
 *   userQuotes?: number, googleQuotes?: number, bestQuoteChars?: number,
 *   photos?: number, chips?: number, dishes?: number }} c
 */
export function scoreReviewReel(c) {
  const userQuotes = Number(c.userQuotes) || 0;
  const googleQuotes = Number(c.googleQuotes) || 0;
  const usable = userQuotes + googleQuotes;
  const chars = Number(c.bestQuoteChars) || 0;
  const photos = Number(c.photos) || 0;
  const chips = Number(c.chips) || 0;

  // Full marks between the minimum and the truncation point; a quote longer
  // than that still works, it just loses its tail.
  const quoteFit = chars >= IDEAL_QUOTE_MAX ? 0.85 : ratio(chars, IDEAL_QUOTE_MAX);

  const breakdown = {
    userReview: userQuotes > 0 ? REVIEW_WEIGHTS.userReview : 0,
    quote: usable > 0 ? REVIEW_WEIGHTS.quote * quoteFit : 0,
    photo: photos > 0 ? REVIEW_WEIGHTS.photo : 0,
    chips: REVIEW_WEIGHTS.chips * ratio(chips, TARGET_CHIPS),
    rating: REVIEW_WEIGHTS.rating * ratio(Number(c.rating) || 0, 5),
    dish: Number(c.dishes) > 0 ? REVIEW_WEIGHTS.dish : 0,
  };

  const blockers = [];
  if (usable === 0) {
    blockers.push(`no review of at least ${MIN_USABLE_QUOTE} characters — one short quote cannot carry the scene`);
  }
  if (photos === 0) blockers.push('no photo — the spotlight opens on a full-bleed plate shot');

  const warnings = [];
  if (usable > 0 && userQuotes === 0) {
    warnings.push('no NomNom review — the quote is a Google review, credited to its author');
  }
  if (chars > IDEAL_QUOTE_MAX) warnings.push(`best quote is ${chars} chars — trimmed to ${IDEAL_QUOTE_MAX} with an ellipsis`);
  if (chips === 0) warnings.push('no cuisine/vibe tags — identity scene falls back to the street address');

  return {
    score: round(Object.values(breakdown).reduce((a, b) => a + b, 0)),
    breakdown: Object.fromEntries(Object.entries(breakdown).map(([k, v]) => [k, round(v)])),
    signals: { userQuotes, googleQuotes, bestQuoteChars: chars, photos, chips, rating: Number(c.rating) || 0 },
    blockers,
    warnings,
  };
}

/**
 * Score one list for ListShowcase.
 *
 * @param {{ id: string, name: string, description?: string|null, placeCount?: number,
 *   placesWithPhoto?: number, placesWithTagline?: number, avgRating?: number|null,
 *   cityCoherence?: number, creatorNamed?: boolean }} c
 * @returns {{ score: number, breakdown: object, blockers: string[], warnings: string[] }}
 */
export function scoreList(c) {
  const placeCount = Number(c.placeCount) || 0;
  const withPhoto = Number(c.placesWithPhoto) || 0;
  const withTagline = Number(c.placesWithTagline) || 0;
  const avgRating = Number(c.avgRating) || 0;
  const cityCoherence = Math.min(Math.max(Number(c.cityCoherence) || 0, 0), 1);
  const photoCoverage = placeCount ? withPhoto / placeCount : 0;
  const taglineCoverage = placeCount ? withTagline / placeCount : 0;

  const breakdown = {
    places: LIST_WEIGHTS.places * ratio(placeCount, RECAP_GRID_SIZE),
    photos: LIST_WEIGHTS.photos * photoCoverage,
    creator: c.creatorNamed ? LIST_WEIGHTS.creator : 0,
    description: c.description && String(c.description).trim() ? LIST_WEIGHTS.description : 0,
    rating: LIST_WEIGHTS.rating * ratio(avgRating, 5),
    cityCoherence: LIST_WEIGHTS.cityCoherence * cityCoherence,
    taglines: LIST_WEIGHTS.taglines * taglineCoverage,
  };

  const blockers = [];
  if (placeCount < MIN_LIST_PLACES) {
    blockers.push(`only ${placeCount} place${placeCount === 1 ? '' : 's'} — needs at least ${MIN_LIST_PLACES}`);
  }

  const warnings = [];
  if (placeCount > RECAP_GRID_SIZE) warnings.push(`recap grid shows the first ${RECAP_GRID_SIZE} of ${placeCount} places`);
  if (listReelSeconds(placeCount) > 33) warnings.push(`reel runs ${Math.round(listReelSeconds(placeCount))}s — long for a feed`);
  if (photoCoverage < 1) warnings.push(`${placeCount - withPhoto}/${placeCount} places have no photo`);
  if (!c.creatorNamed) warnings.push('creator has no display name or username — intro avatar shows a placeholder');
  if (looksGeneratedHandle(c.creatorHandle)) {
    warnings.push(`creator handle "${c.creatorHandle}" looks seeded or generated — the reel would put a test account on screen`);
  }
  if (!c.description || !String(c.description).trim()) warnings.push('no description — the intro subtitle hides itself');
  if (cityCoherence < 1) warnings.push('places span more than one city — the location line generalises');

  return {
    score: round(Object.values(breakdown).reduce((a, b) => a + b, 0)),
    breakdown: Object.fromEntries(Object.entries(breakdown).map(([k, v]) => [k, round(v)])),
    signals: {
      placeCount,
      placesWithPhoto: withPhoto,
      photoCoverage: round(photoCoverage * 100) / 100,
      avgRating: round(avgRating),
      cityCoherence: round(cityCoherence * 100) / 100,
      seconds: Math.round(listReelSeconds(placeCount)),
    },
    blockers,
    warnings,
  };
}
