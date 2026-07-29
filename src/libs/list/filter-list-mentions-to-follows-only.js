/**
 * Nom Nom circle: keep list-item rows for the viewer, or for people they follow who saved this
 * restaurant to a list (each row already represents a list save).
 * @param {Array<{ added_by?: string | null }>} mentions
 * @param {string | null | undefined} viewerUserId
 * @param {Set<string>} followingUserIds — normalized ids from {@link fetchViewerFollowingIds}
 * @returns {object[]}
 */
export function filterListMentionsToFollowsOnly(mentions, viewerUserId, followingUserIds) {
  const me = viewerUserId != null ? String(viewerUserId) : '';
  const follows =
    followingUserIds && typeof followingUserIds.has === 'function' ? followingUserIds : new Set();
  return (Array.isArray(mentions) ? mentions : []).filter((row) => {
    const uid = row?.added_by != null ? String(row.added_by) : '';
    if (!uid) return false;
    if (me && uid === me) return true;
    return follows.has(uid);
  });
}

/**
 * After {@link filterListMentionsToFollowsOnly}: hide other people’s list-only saves (no linked
 * `contributor_review`). Keeps the viewer’s own saves (with or without a review) and any row
 * that has a written review, so the feed is “my review + people I follow’s reviews” — not
 * anonymous “Someone saved this” cards from the circle.
 *
 * @param {Array<{ added_by?: string | null, contributor_review?: object | null }>} mentions
 * @param {string | null | undefined} viewerUserId
 * @returns {object[]}
 */
export function filterListMentionsToSelfOrReviewBacked(mentions, viewerUserId) {
  const me = viewerUserId != null ? String(viewerUserId) : '';
  return (Array.isArray(mentions) ? mentions : []).filter((row) => {
    const uid = row?.added_by != null ? String(row.added_by) : '';
    if (!uid) return false;
    if (me && uid === me) return true;
    return Boolean(row?.contributor_review);
  });
}
