import assert from 'node:assert/strict';
import { test } from 'node:test';

import { countNewReviewsSincePrior } from '../review-sample-diff.js';

test('countNewReviewsSincePrior: counts fingerprints absent from prior', () => {
  const prior = [{ text: 'Great pasta place here', rating: 5 }];
  const current = [
    { text: 'Great pasta place here', rating: 5 },
    { text: 'Totally new review text!!', rating: 4 },
  ];
  assert.equal(countNewReviewsSincePrior(current, prior, 10, 9), 1);
});

test('countNewReviewsSincePrior: short/empty text ignored (<10 chars)', () => {
  const current = [{ text: 'short', rating: 5 }, { text: null, rating: 3 }];
  assert.equal(countNewReviewsSincePrior(current, [{ text: 'aaaaaaaaaa', rating: 1 }], null, null), 0);
});

test('countNewReviewsSincePrior: whitespace collapsed for fingerprint', () => {
  const prior = [{ text: 'hello     worldxx', rating: 4 }];
  const current = [{ text: 'hello worldxx', rating: 4 }];
  assert.equal(countNewReviewsSincePrior(current, prior, null, null), 0);
});

test('countNewReviewsSincePrior: falls back to review_count delta when no prior sample', () => {
  assert.equal(countNewReviewsSincePrior([], null, 120, 100), 20);
  assert.equal(countNewReviewsSincePrior([], [], 50, 80), 0); // max(0, delta)
});

test('countNewReviewsSincePrior: no prior sample and no counts → MAX_SAFE_INTEGER', () => {
  assert.equal(countNewReviewsSincePrior([], null, null, null), Number.MAX_SAFE_INTEGER);
  assert.equal(countNewReviewsSincePrior([], undefined, NaN, 10), Number.MAX_SAFE_INTEGER);
});

test('countNewReviewsSincePrior: rating difference = different fingerprint', () => {
  const prior = [{ text: 'Same review body text', rating: 4 }];
  const current = [{ text: 'Same review body text', rating: 5 }];
  assert.equal(countNewReviewsSincePrior(current, prior, null, null), 1);
});
