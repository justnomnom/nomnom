import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  galleryImagesFromMetadata,
  galleryImagesFromRestaurantRow,
  galleryUrlsForRestaurant,
} from '../restaurant-gallery-urls.js';

describe('galleryImagesFromMetadata', () => {
  test('empty / invalid', () => {
    assert.deepEqual(galleryImagesFromMetadata(null), []);
    assert.deepEqual(galleryImagesFromMetadata('x'), []);
    assert.deepEqual(galleryImagesFromMetadata({}), []);
  });

  test('dedupes photos + hero + image_url', () => {
    assert.deepEqual(
      galleryImagesFromMetadata({
        photos: [' https://a.com/1 ', 'https://a.com/2', 'https://a.com/1'],
        hero_url: 'https://a.com/2',
        image_url: 'https://a.com/3',
      }),
      ['https://a.com/1', 'https://a.com/2', 'https://a.com/3']
    );
  });
});

describe('galleryImagesFromRestaurantRow', () => {
  test('null when missing or all rejected', () => {
    assert.equal(galleryImagesFromRestaurantRow(null), null);
    assert.equal(galleryImagesFromRestaurantRow({ restaurant_images: [] }), null);
    assert.equal(
      galleryImagesFromRestaurantRow({
        restaurant_images: [{ url: 'https://x', moderation_status: 'rejected' }],
      }),
      null
    );
  });

  test('sorts by sort_order and drops empty urls', () => {
    assert.deepEqual(
      galleryImagesFromRestaurantRow({
        restaurant_images: [
          { url: 'https://b', sort_order: 2 },
          { url: 'https://a', sort_order: 1 },
          { url: '  ', sort_order: 0 },
          { url: null, sort_order: 3 },
        ],
      }),
      ['https://a', 'https://b']
    );
  });
});

test('galleryUrlsForRestaurant: prefers restaurant_images over metadata', () => {
  assert.deepEqual(
    galleryUrlsForRestaurant({
      restaurant_images: [{ url: 'https://curated', sort_order: 0 }],
      metadata: { hero_url: 'https://meta' },
    }),
    ['https://curated']
  );
  assert.deepEqual(
    galleryUrlsForRestaurant({ metadata: { image_url: 'https://meta' } }),
    ['https://meta']
  );
});
