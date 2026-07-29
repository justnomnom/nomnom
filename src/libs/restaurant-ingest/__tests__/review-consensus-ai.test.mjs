import { test } from 'node:test';
import assert from 'node:assert/strict';

import { countNewReviewsSincePrior } from '../review-sample-diff.js';

const review = (text, rating = 5) => ({ text, rating });

test('countNewReviewsSincePrior compares sampled review fingerprints', () => {
  const prior = [
    review('First review with enough text here'),
    review('Second review with enough text here'),
  ];
  const current = [
    review('First review with enough text here'),
    review('Second review with enough text here'),
    review('Third brand new review with enough text'),
  ];

  assert.equal(countNewReviewsSincePrior(current, prior, null, null), 1);
});

test('countNewReviewsSincePrior falls back to aggregate review_count delta', () => {
  const current = [review('Only review in the current sample')];
  assert.equal(countNewReviewsSincePrior(current, null, 120, 100), 20);
  assert.equal(countNewReviewsSincePrior(current, [], 105, 100), 5);
});

test('countNewReviewsSincePrior allows rerun when comparison data is missing', () => {
  const current = [review('Only review in the current sample')];
  assert.equal(countNewReviewsSincePrior(current, null, null, null), Number.MAX_SAFE_INTEGER);
});
