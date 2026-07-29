/**
 * Frontend QA — pending review skeleton: unknown feed kinds, coerced ids.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  shouldShowPendingReviewSkeleton,
  viewerHasOwnMentionCard,
} from '../pending-review-skeleton-gate.js';

const ME = 'user-1';

test('viewerHasOwnMentionCard: ignores unknown feed kinds and null entries', () => {
  assert.equal(
    viewerHasOwnMentionCard([{ kind: 'mystery', payload: { user_id: ME } }, null], ME),
    false
  );
});

test('viewerHasOwnMentionCard: coerces numeric user ids', () => {
  assert.equal(
    viewerHasOwnMentionCard(
      [{ kind: 'standalone_review', payload: { user_id: 42 } }],
      42
    ),
    true
  );
});

test('viewerHasOwnMentionCard: list_group with empty primary is false', () => {
  assert.equal(
    viewerHasOwnMentionCard([{ kind: 'list_group', payload: { primary: null } }], ME),
    false
  );
});

test('shouldShowPendingReviewSkeleton: true when feed is null (first save)', () => {
  assert.equal(
    shouldShowPendingReviewSkeleton({
      reviewPending: true,
      showListsAndReviews: true,
      myUserId: ME,
      mergedMentionFeed: null,
    }),
    true
  );
});
