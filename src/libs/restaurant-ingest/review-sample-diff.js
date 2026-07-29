const MAX_REVIEW_CHARS = 600;

/**
 * Stable fingerprint for deduping reviews across ingests (text + rating only).
 * @param {{ text?: string | null, rating?: number | null }} review
 * @returns {string | null}
 */
function reviewFingerprint(review) {
  const text =
    typeof review.text === 'string'
      ? review.text.replace(/\s+/g, ' ').trim().slice(0, MAX_REVIEW_CHARS)
      : '';
  if (text.length < 10) return null;
  return `${review.rating ?? ''}|${text}`;
}

/**
 * Count reviews in the current sample that were not present in the prior ingest sample.
 * Falls back to Google aggregate review_count delta when prior sample is unavailable.
 * @param {Array<{ text: string | null, rating: number | null }>} current
 * @param {Array<{ text?: string | null, rating?: number | null }> | null | undefined} prior
 * @param {number | null | undefined} currentReviewCount
 * @param {number | null | undefined} priorReviewCount
 * @returns {number}
 */
export function countNewReviewsSincePrior(current, prior, currentReviewCount, priorReviewCount) {
  const priorSample = Array.isArray(prior) ? prior : [];
  if (priorSample.length) {
    const priorFingerprints = new Set(
      priorSample.map((r) => reviewFingerprint(r)).filter((fp) => fp != null)
    );
    return current.reduce((count, review) => {
      const fp = reviewFingerprint(review);
      if (!fp || priorFingerprints.has(fp)) return count;
      return count + 1;
    }, 0);
  }

  if (
    typeof currentReviewCount === 'number' &&
    Number.isFinite(currentReviewCount) &&
    typeof priorReviewCount === 'number' &&
    Number.isFinite(priorReviewCount)
  ) {
    return Math.max(0, currentReviewCount - priorReviewCount);
  }

  // Cannot compare — allow the LLM call rather than silently freezing consensus.
  return Number.MAX_SAFE_INTEGER;
}
