/**
 * Seam tests for the map/search metadata slimming (commit cdafb93).
 *
 * `slimRestaurantCardMetadata` drops ~95% of the `restaurants.metadata` blob
 * before it is serialized to the client. That is only safe if every consumer
 * resolves the *same* result from the slimmed blob as from the full one.
 * `restaurant-gallery-urls` is the consumer with the most to lose — it is what
 * decides which image a map marker, list card, and detail hero actually render.
 *
 * The invariant asserted here is behaviour preservation:
 *
 *   galleryImagesFromMetadata(slim(m)) === galleryImagesFromMetadata(m)
 *
 * If someone narrows the allowlist and forgets a gallery key, these fail rather
 * than silently blanking images in production.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  galleryImagesFromMetadata,
  galleryUrlsForRestaurant,
} from 'src/libs/restaurant/restaurant-gallery-urls';
import {
  slimRestaurantCardMetadata,
  slimRestaurantRowsMetadata,
} from 'src/lib/slim-restaurant-card-metadata';

/** A blob shaped like a real ingest row: gallery keys buried in heavy junk. */
const fullIngestBlob = {
  rating: 4.6,
  review_consensus: { summary: 'busy', signature_dishes: ['pastel'] },
  photos: ['https://cdn/p1.jpg', 'https://cdn/p2.jpg'],
  hero_url: '  https://cdn/hero.jpg  ',
  image_url: 'https://cdn/img.jpg',
  // heavy / internal keys the slimmer drops
  user_reviews: 'x'.repeat(7000),
  about: { description: 'y'.repeat(2000) },
  popular_times: [[1, 2], [3, 4]],
  mentioned_in_reviews: ['tasty', 'queue'],
  hours_parsed: { mon: '9-5' },
  open_hours: { mon: '9-5' },
  owner: { name: 'someone' },
  reviews_link: 'https://maps/reviews',
  complete_address: { city: 'Lisbon' },
  categories: ['Restaurant'],
  tag_slugs: ['sushi'],
  data_id: '0xabc',
  cid: '123',
  plus_code: 'JX+12',
  ingest_run_id: 'run-1',
};

const cases = [
  ['full ingest blob', fullIngestBlob],
  ['photos only', { photos: ['https://cdn/a.jpg', 'https://cdn/b.jpg'] }],
  ['hero_url only, untrimmed', { hero_url: '  https://cdn/hero.jpg  ' }],
  ['image_url only', { image_url: 'https://cdn/img.jpg' }],
  ['hero_url already present in photos', {
    photos: ['https://cdn/hero.jpg', 'https://cdn/p2.jpg'],
    hero_url: 'https://cdn/hero.jpg',
  }],
  ['photos with junk entries', { photos: ['https://cdn/a.jpg', null, 7, {}, '   ', ''] }],
  ['photos with untrimmed entries', { photos: ['  https://cdn/a.jpg  '] }],
  ['all gallery fields blank', { photos: ['', '  '], hero_url: '   ', image_url: '' }],
  ['heavy keys only', { user_reviews: 'x'.repeat(500), about: {} }],
  ['empty object', {}],
  ['null metadata', null],
  ['undefined metadata', undefined],
  ['array metadata', ['https://cdn/a.jpg']],
  ['string metadata', 'not-an-object'],
  ['rating but no images', { rating: 4.2 }],
];

for (const [label, metadata] of cases) {
  test(`gallery seam: slimming preserves gallery URLs — ${label}`, () => {
    const fromFull = galleryImagesFromMetadata(metadata);
    const fromSlim = galleryImagesFromMetadata(slimRestaurantCardMetadata(metadata));
    assert.deepEqual(
      fromSlim,
      fromFull,
      `slimmed blob resolved ${JSON.stringify(fromSlim)} but full blob resolved ${JSON.stringify(fromFull)}`
    );
  });
}

test('gallery seam: the full ingest blob really does resolve images (guards a vacuous suite)', () => {
  // Without this, every case above would still pass if the resolver returned []
  // for everything.
  assert.deepEqual(galleryImagesFromMetadata(fullIngestBlob), [
    'https://cdn/p1.jpg',
    'https://cdn/p2.jpg',
    'https://cdn/hero.jpg',
    'https://cdn/img.jpg',
  ]);
});

test('gallery seam: slimming a row array preserves per-row gallery URLs', () => {
  const rows = [
    { id: '1', metadata: fullIngestBlob },
    { id: '2', metadata: { photos: ['https://cdn/only.jpg'], user_reviews: 'x'.repeat(900) } },
    { id: '3', metadata: null },
    { id: '4' }, // no metadata key at all
  ];
  const expected = rows.map((r) => galleryImagesFromMetadata(r.metadata));
  const slimmed = slimRestaurantRowsMetadata(rows);
  assert.deepEqual(
    slimmed.map((r) => galleryImagesFromMetadata(r.metadata)),
    expected
  );
});

test('gallery seam: curated restaurant_images still win over slimmed metadata', () => {
  const row = {
    id: '1',
    metadata: fullIngestBlob,
    restaurant_images: [
      { url: 'https://cdn/curated-2.jpg', sort_order: 2, moderation_status: 'approved' },
      { url: 'https://cdn/curated-1.jpg', sort_order: 1, moderation_status: 'approved' },
    ],
  };
  const [slimmedRow] = slimRestaurantRowsMetadata([row]);
  assert.deepEqual(galleryUrlsForRestaurant(slimmedRow), [
    'https://cdn/curated-1.jpg',
    'https://cdn/curated-2.jpg',
  ]);
  // ...and the relation survives the metadata-only rewrite.
  assert.equal(slimmedRow.restaurant_images.length, 2);
});

test('gallery seam: rejected curated images fall through to slimmed metadata', () => {
  const row = {
    id: '1',
    metadata: fullIngestBlob,
    restaurant_images: [
      { url: 'https://cdn/bad.jpg', sort_order: 1, moderation_status: 'rejected' },
    ],
  };
  const [slimmedRow] = slimRestaurantRowsMetadata([row]);
  assert.deepEqual(galleryUrlsForRestaurant(slimmedRow), galleryUrlsForRestaurant(row));
  assert.ok(galleryUrlsForRestaurant(slimmedRow).includes('https://cdn/hero.jpg'));
});
