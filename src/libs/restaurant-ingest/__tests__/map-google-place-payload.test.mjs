import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mapGooglePlacePayload, normalizeUserReviews } from '../map-google-place-payload.js';

const textReview = (text, i = 0) => ({
  Name: `Author ${i}`,
  Rating: 5,
  Description: text,
  When: 'a week ago',
});
const ratingOnlyReview = (rating = 4) => ({ Name: 'Rater', Rating: rating, Description: '' });

test('normalizeUserReviews prefers meaningful-text reviews over rating-only within the cap', () => {
  const ratingOnly = Array.from({ length: 30 }, () => ratingOnlyReview());
  const withText = Array.from({ length: 20 }, (_, i) => textReview(`Great food and service #${i}`, i));
  // Newest-first scrape: rating-only reviews dominate the head of the array.
  const out = normalizeUserReviews([...ratingOnly, ...withText]);

  assert.equal(out.length, 25);
  const textCount = out.filter((r) => typeof r.text === 'string' && r.text.length >= 10).length;
  assert.equal(textCount, 20);
  // All text reviews come before the rating-only padding.
  assert.ok(out.slice(0, 20).every((r) => r.text != null));
  assert.ok(out.slice(20).every((r) => r.text == null));
});

test('normalizeUserReviews ranks meaningful text before short text before rating-only', () => {
  const out = normalizeUserReviews([
    ratingOnlyReview(),
    textReview('Ok'),
    textReview('Long enough meaningful review text'),
  ]);

  assert.deepEqual(
    out.map((r) => r.text),
    ['Long enough meaningful review text', 'Ok', null]
  );
});

test('normalizeUserReviews keeps newest-first order within each tier', () => {
  const input = [
    textReview('Newest meaningful review text', 1),
    ratingOnlyReview(5),
    textReview('Middle meaningful review text', 2),
    ratingOnlyReview(3),
    textReview('Oldest meaningful review text', 3),
  ];
  const out = normalizeUserReviews(input);

  assert.deepEqual(
    out.map((r) => r.text),
    [
      'Newest meaningful review text',
      'Middle meaningful review text',
      'Oldest meaningful review text',
      null,
      null,
    ]
  );
  assert.deepEqual(
    out.filter((r) => r.text == null).map((r) => r.rating),
    [5, 3]
  );
});

test('normalizeUserReviews caps at 25 even when more text reviews exist', () => {
  const input = Array.from({ length: 40 }, (_, i) => textReview(`Meaningful review number ${i}`, i));
  const out = normalizeUserReviews(input);

  assert.equal(out.length, 25);
  assert.equal(out[0].text, 'Meaningful review number 0');
  assert.equal(out[24].text, 'Meaningful review number 24');
});

test('normalizeUserReviews pulls text reviews from beyond the first 25 entries', () => {
  // Old behavior sliced to the first 25 before normalizing, discarding this text review.
  const input = [...Array.from({ length: 25 }, () => ratingOnlyReview()), textReview('Buried meaningful review text')];
  const out = normalizeUserReviews(input);

  assert.equal(out.length, 25);
  assert.equal(out[0].text, 'Buried meaningful review text');
});

test('normalizeUserReviews preserves relative order of meaningful-text reviews for hash stability', () => {
  // review-consensus-ai hashes the ≥10-char subsequence in order; reordering
  // tiers must not shuffle that subsequence.
  const input = [
    ratingOnlyReview(),
    textReview('First meaningful review text', 1),
    ratingOnlyReview(),
    textReview('Second meaningful review text', 2),
    textReview('Third meaningful review text', 3),
  ];
  const out = normalizeUserReviews(input);
  const meaningful = out.filter((r) => typeof r.text === 'string' && r.text.length >= 10);

  assert.deepEqual(
    meaningful.map((r) => r.text),
    ['First meaningful review text', 'Second meaningful review text', 'Third meaningful review text']
  );
});

test('normalizeUserReviews keeps the normalized shape and drops empty entries', () => {
  const out = normalizeUserReviews([
    {
      Name: '  Jane  ',
      Rating: 4.5,
      Description: '  Lovely spot with great pasta  ',
      ProfilePicture: 'https://example.com/avatar.jpg',
      When: ' 2 weeks ago ',
    },
    { Name: 'No content', Description: '' },
    null,
    'not-an-object',
  ]);

  assert.deepEqual(out, [
    {
      author_name: 'Jane',
      author_avatar: 'https://example.com/avatar.jpg',
      rating: 4.5,
      text: 'Lovely spot with great pasta',
      when: '2 weeks ago',
    },
  ]);
});

test('normalizeUserReviews returns empty array for non-array input', () => {
  assert.deepEqual(normalizeUserReviews(null), []);
  assert.deepEqual(normalizeUserReviews({}), []);
  assert.deepEqual(normalizeUserReviews('reviews'), []);
});

// Regression: the scraper runs with -extra-reviews, so the deep-scrolled reviews
// land in `user_reviews_extended` (~119/place) while `user_reviews` holds only the
// ~8 visible on first paint. Reading just the short array starved the AI consensus
// (5-8 samples instead of the 25 cap) and silently discarded >90% of the scrape.
test('mapGooglePlacePayload feeds the deep-scrolled reviews to the consensus layer', () => {
  const extended = Array.from({ length: 40 }, (_, i) =>
    textReview(`Deep scrolled review number ${i} with plenty of detail.`, i)
  );
  const basic = [textReview('Only visible on first paint, long enough to count.', 999)];
  const mapped = mapGooglePlacePayload({
    title: 'Test Place',
    place_id: 'ChIJtest',
    latitude: 38.7,
    longitude: -9.1,
    user_reviews: basic,
    user_reviews_extended: extended,
  });
  const out = mapped.metadataBase.user_reviews;
  assert.equal(out.length, 25, 'should fill the 25-review cap from the extended array');
  assert.ok(
    out.every((r) => typeof r.text === 'string' && r.text.trim().length >= 10),
    'every mapped review should carry usable text'
  );
});

test('mapGooglePlacePayload falls back to user_reviews when no extended array exists', () => {
  const basic = [1, 2, 3, 4].map((i) => textReview(`Short-array review ${i} with enough text.`, i));
  const mapped = mapGooglePlacePayload({
    title: 'Test Place',
    place_id: 'ChIJtest2',
    latitude: 38.7,
    longitude: -9.1,
    user_reviews: basic,
  });
  assert.equal(mapped.metadataBase.user_reviews.length, 4);
});

test('mapGooglePlacePayload dedupes reviews present in both arrays', () => {
  const shared = textReview('This exact review appears in both arrays verbatim.', 1);
  const mapped = mapGooglePlacePayload({
    title: 'Test Place',
    place_id: 'ChIJtest3',
    latitude: 38.7,
    longitude: -9.1,
    user_reviews: [shared],
    user_reviews_extended: [shared, textReview('A second distinct review, long enough.', 2)],
  });
  assert.equal(mapped.metadataBase.user_reviews.length, 2, 'the duplicate should collapse');
});
