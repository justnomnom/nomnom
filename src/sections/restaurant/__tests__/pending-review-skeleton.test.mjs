import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  viewerHasOwnMentionCard,
  shouldShowPendingReviewSkeleton,
} from '../pending-review-skeleton-gate.js';

const ME = 'user-1';

const myStandalone = { kind: 'standalone_review', payload: { user_id: ME } };
const othersStandalone = { kind: 'standalone_review', payload: { user_id: 'user-2' } };
const myListSave = { kind: 'list_group', payload: { primary: { added_by: ME } } };
const myListReview = {
  kind: 'list_group',
  payload: { primary: { added_by: 'owner', contributor_review: { user_id: ME } } },
};
const othersListGroup = { kind: 'list_group', payload: { primary: { added_by: 'user-2' } } };

test('viewerHasOwnMentionCard: detects own standalone review', () => {
  assert.equal(viewerHasOwnMentionCard([othersStandalone, myStandalone], ME), true);
});

test('viewerHasOwnMentionCard: detects own list save and own list review', () => {
  assert.equal(viewerHasOwnMentionCard([myListSave], ME), true);
  assert.equal(viewerHasOwnMentionCard([myListReview], ME), true);
});

test('viewerHasOwnMentionCard: false when only others are present', () => {
  assert.equal(viewerHasOwnMentionCard([othersStandalone, othersListGroup], ME), false);
});

test('viewerHasOwnMentionCard: false for empty / missing inputs', () => {
  assert.equal(viewerHasOwnMentionCard([], ME), false);
  assert.equal(viewerHasOwnMentionCard(null, ME), false);
  assert.equal(viewerHasOwnMentionCard([myStandalone], null), false);
});

// The bug: a first-time save (viewer has no card yet) must show a loading skeleton
// instead of leaving the empty state until the refetch lands and the card pops in.
test('shouldShowPendingReviewSkeleton: true on first-time save with an empty feed', () => {
  assert.equal(
    shouldShowPendingReviewSkeleton({
      reviewPending: true,
      showListsAndReviews: true,
      myUserId: ME,
      mergedMentionFeed: [],
    }),
    true
  );
});

test('shouldShowPendingReviewSkeleton: true on first-time save among others’ cards', () => {
  assert.equal(
    shouldShowPendingReviewSkeleton({
      reviewPending: true,
      showListsAndReviews: true,
      myUserId: ME,
      mergedMentionFeed: [othersStandalone, othersListGroup],
    }),
    true
  );
});

test('shouldShowPendingReviewSkeleton: false when the viewer already has a card (in-place skeleton handles it)', () => {
  assert.equal(
    shouldShowPendingReviewSkeleton({
      reviewPending: true,
      showListsAndReviews: true,
      myUserId: ME,
      mergedMentionFeed: [myStandalone],
    }),
    false
  );
});

test('shouldShowPendingReviewSkeleton: false when not pending', () => {
  assert.equal(
    shouldShowPendingReviewSkeleton({
      reviewPending: false,
      showListsAndReviews: true,
      myUserId: ME,
      mergedMentionFeed: [],
    }),
    false
  );
});

test('shouldShowPendingReviewSkeleton: false when reviews are hidden or no viewer', () => {
  assert.equal(
    shouldShowPendingReviewSkeleton({
      reviewPending: true,
      showListsAndReviews: false,
      myUserId: ME,
      mergedMentionFeed: [],
    }),
    false
  );
  assert.equal(
    shouldShowPendingReviewSkeleton({
      reviewPending: true,
      showListsAndReviews: true,
      myUserId: null,
      mergedMentionFeed: [],
    }),
    false
  );
});
