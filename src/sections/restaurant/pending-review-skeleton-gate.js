/**
 * Pure gating logic for the post-save "review pending" skeleton in the restaurant
 * detail view's "Mentioned by" feed. Kept JSX-free so it can be unit tested under
 * `node --test` (see `__tests__/pending-review-skeleton.test.mjs`).
 */

/**
 * Is the viewer already represented by a card in the "Mentioned by" feed
 * (a list group they added / reviewed, or a standalone review of theirs)?
 * @param {Array<{ kind?: string, payload?: any }> | null | undefined} mergedMentionFeed
 * @param {string | null | undefined} myUserId
 * @returns {boolean}
 */
export function viewerHasOwnMentionCard(mergedMentionFeed, myUserId) {
  if (!myUserId || !Array.isArray(mergedMentionFeed)) return false;
  const uid = String(myUserId);
  return mergedMentionFeed.some((feed) => {
    if (!feed) return false;
    if (feed.kind === 'list_group') {
      const row = feed.payload?.primary;
      const addedBy = row?.added_by != null ? String(row.added_by) : '';
      const revUid =
        row?.contributor_review?.user_id != null ? String(row.contributor_review.user_id) : '';
      return addedBy === uid || revUid === uid;
    }
    if (feed.kind === 'standalone_review') {
      const revUid = feed.payload?.user_id != null ? String(feed.payload.user_id) : '';
      return revUid === uid;
    }
    return false;
  });
}

/**
 * After a save, the viewer's own review/mention card is fetched async. Show a loading
 * skeleton in its place — but only when the viewer doesn't already have a card to swap
 * (the existing in-place skeleton handles that). Without this, a first-time save renders
 * the empty state until the refetch lands, then the card pops in with no loading state.
 * @param {{ reviewPending: boolean, showListsAndReviews: boolean, myUserId: string | null | undefined, mergedMentionFeed: Array<{ kind?: string, payload?: any }> | null | undefined }} args
 * @returns {boolean}
 */
export function shouldShowPendingReviewSkeleton({
  reviewPending,
  showListsAndReviews,
  myUserId,
  mergedMentionFeed,
}) {
  if (!reviewPending || !showListsAndReviews || !myUserId) return false;
  return !viewerHasOwnMentionCard(mergedMentionFeed, myUserId);
}
