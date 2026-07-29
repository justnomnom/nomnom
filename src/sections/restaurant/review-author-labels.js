/**
 * Pure review author label helpers — kept JSX-free for unit tests.
 * Used by restaurant review / mention feed UI.
 */

/** Role-like display names that should not read as a personal name in the feed. */
const GENERIC_AUTHOR_DISPLAY_NAME = new Set(['member', 'membro', 'user', 'utilizador', 'usuario']);

/**
 * Trimmed author display name for labels, or null when empty or a generic placeholder.
 * @param {{ author_display_name?: string | null } | null | undefined} review
 * @returns {string | null}
 */
export function reviewAuthorDisplayNameForLabel(review) {
  const raw =
    typeof review?.author_display_name === 'string' ? review.author_display_name.trim() : '';
  if (!raw) return null;
  if (GENERIC_AUTHOR_DISPLAY_NAME.has(raw.toLowerCase())) return null;
  return raw;
}

/**
 * @param {{ author_display_name?: string | null, author_username?: string | null } | null | undefined} review
 * @returns {string}
 */
export function restaurantReviewAuthorLabel(review) {
  const name = reviewAuthorDisplayNameForLabel(review);
  const handle =
    typeof review?.author_username === 'string' && review.author_username.trim()
      ? `@${review.author_username.trim()}`
      : null;
  if (name && handle) return `${name} (${handle})`;
  if (name) return name;
  if (handle) return handle;
  return '—';
}

/**
 * @param {string | null | undefined} iso
 * @returns {string}
 */
export function formatReviewDate(iso) {
  if (!iso || typeof iso !== 'string') return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

/** Characters shown before "Show more" / "Show less" (reviews allow up to 2000). */
export const REVIEW_BODY_PREVIEW_MAX_CHARS = 200;
