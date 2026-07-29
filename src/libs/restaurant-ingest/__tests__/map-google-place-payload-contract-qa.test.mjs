/**
 * Frontend QA — mapGooglePlacePayload contract (throws + minimal happy path).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mapGooglePlacePayload } from '../map-google-place-payload.js';

const base = {
  place_id: 'ChIJabc',
  title: '  Casa  ',
  latitude: 38.72,
  longitude: -9.14,
};

test('mapGooglePlacePayload: throws on invalid payload / coords / missing fields', () => {
  assert.throws(() => mapGooglePlacePayload(null), /invalid_payload/);
  assert.throws(() => mapGooglePlacePayload({}), /invalid_coordinates/);
  assert.throws(
    () => mapGooglePlacePayload({ latitude: 38, longitude: -9, title: 'x' }),
    /missing_place_id/
  );
  assert.throws(
    () => mapGooglePlacePayload({ latitude: 38, longitude: -9, place_id: 'p' }),
    /missing_title/
  );
  assert.throws(
    () => mapGooglePlacePayload({ latitude: 38, longitude: -9, place_id: 'p', title: '   ' }),
    /missing_title/
  );
});

test('mapGooglePlacePayload: minimal place wires row + metadata', () => {
  const out = mapGooglePlacePayload({
    ...base,
    price_range: '$$',
    review_rating: '4.5',
    review_count: 12,
    category: 'Restaurant',
    description: '  Nice spot  ',
    images: [{ title: 'By owner', image: 'https://lh3.googleusercontent.com/p/X=w10-h10' }],
    mentioned_in_reviews: [{ name: 'Pastel', count: 4 }],
  });
  assert.equal(out.row.external_place_id, 'ChIJabc');
  assert.equal(out.row.name, 'Casa');
  assert.equal(out.row.latitude, 38.72);
  assert.equal(out.row.longitude, -9.14);
  assert.equal(out.row.rating, 4.5);
  assert.equal(out.row.price_level, 2);
  assert.equal(out.priceTagSlug, 'moderate');
  assert.equal(out.metadataBase.description, 'Nice spot');
  assert.equal(out.metadataBase.review_count, 12);
  assert.equal(out.metadataBase.primary_category, 'Restaurant');
  assert.ok(out.imageUrls.length >= 1);
  assert.deepEqual(out.metadataBase.mentioned_in_reviews, [{ label: 'Pastel', mentions: 4 }]);
  assert.equal(out.closedStatus, null);
});
