/**
 * Frontend QA — review author labels (Mentioned by / review cards).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  REVIEW_BODY_PREVIEW_MAX_CHARS,
  formatReviewDate,
  restaurantReviewAuthorLabel,
  reviewAuthorDisplayNameForLabel,
} from '../review-author-labels.js';

test('reviewAuthorDisplayNameForLabel: empty / non-string → null', () => {
  assert.equal(reviewAuthorDisplayNameForLabel(null), null);
  assert.equal(reviewAuthorDisplayNameForLabel({}), null);
  assert.equal(reviewAuthorDisplayNameForLabel({ author_display_name: '  ' }), null);
  assert.equal(reviewAuthorDisplayNameForLabel({ author_display_name: 12 }), null);
});

test('reviewAuthorDisplayNameForLabel: strips generic placeholders', () => {
  for (const name of ['Member', 'membro', 'USER', 'Utilizador', 'usuario']) {
    assert.equal(
      reviewAuthorDisplayNameForLabel({ author_display_name: name }),
      null,
      name
    );
  }
});

test('reviewAuthorDisplayNameForLabel: keeps real names trimmed', () => {
  assert.equal(
    reviewAuthorDisplayNameForLabel({ author_display_name: '  Ana Silva  ' }),
    'Ana Silva'
  );
});

test('restaurantReviewAuthorLabel: name + handle, name only, handle only, em dash', () => {
  assert.equal(
    restaurantReviewAuthorLabel({
      author_display_name: 'Ana',
      author_username: 'ana',
    }),
    'Ana (@ana)'
  );
  assert.equal(
    restaurantReviewAuthorLabel({ author_display_name: 'Ana', author_username: '' }),
    'Ana'
  );
  assert.equal(
    restaurantReviewAuthorLabel({ author_display_name: 'Member', author_username: 'ana' }),
    '@ana'
  );
  assert.equal(restaurantReviewAuthorLabel({}), '—');
});

test('formatReviewDate: invalid → empty string', () => {
  assert.equal(formatReviewDate(null), '');
  assert.equal(formatReviewDate(''), '');
  assert.equal(formatReviewDate(123), '');
  assert.equal(formatReviewDate('not-a-date'), '');
});

test('formatReviewDate: valid ISO returns non-empty locale string', () => {
  const out = formatReviewDate('2024-06-15T12:00:00.000Z');
  assert.equal(typeof out, 'string');
  assert.ok(out.length > 0);
});

test('REVIEW_BODY_PREVIEW_MAX_CHARS is 200', () => {
  assert.equal(REVIEW_BODY_PREVIEW_MAX_CHARS, 200);
});
