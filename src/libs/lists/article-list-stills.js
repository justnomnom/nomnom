/**
 * ListShowcase still-frame indexes for article-list renders.
 * Timing must stay in lockstep with remotion ListShowcase constants.
 */

// eslint-disable-next-line import/extensions, import/no-relative-packages -- remotion/ is a standalone project, not an installed workspace package; this cross-repo constant must stay in lockstep with ListShowcase
import { buildListTimeline } from '../../../remotion/src/compositions/ListShowcase/constants.js';

export const LIST_SHOWCASE_POSTER_FRAME = 60;
export const ARTICLE_LIST_VIDEO_PLACE_CAP = 8;

/**
 * @param {number} acceptedCount
 */
export function videoPlaceCount(acceptedCount) {
  const n = Number(acceptedCount) || 0;
  if (n < 1) return 0;
  return Math.min(ARTICLE_LIST_VIDEO_PLACE_CAP, n);
}

/**
 * Mid-spot frame for still N (0-based) of a reel with `placeCount` spots.
 * @param {number} placeCount
 * @param {number} index
 * @returns {number | null}
 */
export function spotStillFrame(placeCount, index) {
  const tl = buildListTimeline(placeCount);
  const spot = tl.spots[index];
  if (!spot) return null;
  return spot.start + Math.floor(spot.duration / 2);
}
