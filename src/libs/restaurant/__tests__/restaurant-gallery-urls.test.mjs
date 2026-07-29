import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  galleryImagesFromMetadata,
  galleryImagesFromRestaurantRow,
  galleryUrlsForRestaurant,
} from '../restaurant-gallery-urls.js';

// galleryImagesFromMetadata
test('returns [] for null metadata', () => {
  assert.deepEqual(galleryImagesFromMetadata(null), []);
});
test('returns [] for non-object', () => {
  assert.deepEqual(galleryImagesFromMetadata('string'), []);
  assert.deepEqual(galleryImagesFromMetadata(42), []);
});
test('extracts photos array', () => {
  const meta = { photos: ['https://a.com/1.jpg', 'https://a.com/2.jpg'] };
  const result = galleryImagesFromMetadata(meta);
  assert.deepEqual(result, ['https://a.com/1.jpg', 'https://a.com/2.jpg']);
});
test('deduplicates urls', () => {
  const meta = { photos: ['https://a.com/1.jpg', 'https://a.com/1.jpg'] };
  const result = galleryImagesFromMetadata(meta);
  assert.equal(result.length, 1);
});
test('adds hero_url if not in photos', () => {
  const meta = { photos: ['https://a.com/1.jpg'], hero_url: 'https://a.com/hero.jpg' };
  const result = galleryImagesFromMetadata(meta);
  assert.ok(result.includes('https://a.com/hero.jpg'));
});
test('does not duplicate hero_url already in photos', () => {
  const meta = { photos: ['https://a.com/hero.jpg'], hero_url: 'https://a.com/hero.jpg' };
  const result = galleryImagesFromMetadata(meta);
  assert.equal(result.filter((u) => u === 'https://a.com/hero.jpg').length, 1);
});
test('falls back to image_url when no photos', () => {
  const meta = { image_url: 'https://a.com/img.jpg' };
  const result = galleryImagesFromMetadata(meta);
  assert.ok(result.includes('https://a.com/img.jpg'));
});
test('returns [] when all fields empty', () => {
  assert.deepEqual(galleryImagesFromMetadata({}), []);
});
test('returns [] when every field is whitespace-only, not a blank url', () => {
  // Regression: the hero fallback used a truthiness check, so '   ' was returned
  // as a gallery URL and reached the DOM as <img src="   ">.
  assert.deepEqual(galleryImagesFromMetadata({ hero_url: '   ' }), []);
  assert.deepEqual(galleryImagesFromMetadata({ image_url: '\t\n ' }), []);
  assert.deepEqual(galleryImagesFromMetadata({ photos: ['  ', ''] }), []);
  assert.deepEqual(
    galleryImagesFromMetadata({ photos: ['', '  '], hero_url: '   ', image_url: '' }),
    []
  );
});
test('trims a hero_url that only the fallback path can reach', () => {
  assert.deepEqual(galleryImagesFromMetadata({ hero_url: '  https://a.com/h.jpg  ' }), [
    'https://a.com/h.jpg',
  ]);
});
test('skips blank strings in photos', () => {
  const meta = { photos: ['', 'https://a.com/ok.jpg'] };
  const result = galleryImagesFromMetadata(meta);
  assert.deepEqual(result, ['https://a.com/ok.jpg']);
});

// galleryImagesFromRestaurantRow
test('returns null when no restaurant_images relation', () => {
  assert.equal(galleryImagesFromRestaurantRow({}), null);
  assert.equal(galleryImagesFromRestaurantRow(null), null);
});
test('returns null for empty restaurant_images array', () => {
  assert.equal(galleryImagesFromRestaurantRow({ restaurant_images: [] }), null);
});
test('returns sorted urls by sort_order', () => {
  const restaurant = {
    restaurant_images: [
      { url: 'https://a.com/2.jpg', sort_order: 2 },
      { url: 'https://a.com/1.jpg', sort_order: 1 },
    ],
  };
  const result = galleryImagesFromRestaurantRow(restaurant);
  assert.deepEqual(result, ['https://a.com/1.jpg', 'https://a.com/2.jpg']);
});
test('filters out rejected images', () => {
  const restaurant = {
    restaurant_images: [
      { url: 'https://a.com/ok.jpg', moderation_status: 'approved', sort_order: 1 },
      { url: 'https://a.com/bad.jpg', moderation_status: 'rejected', sort_order: 2 },
    ],
  };
  const result = galleryImagesFromRestaurantRow(restaurant);
  assert.deepEqual(result, ['https://a.com/ok.jpg']);
});
test('returns null when all images are rejected', () => {
  const restaurant = {
    restaurant_images: [{ url: 'https://a.com/bad.jpg', moderation_status: 'rejected' }],
  };
  assert.equal(galleryImagesFromRestaurantRow(restaurant), null);
});

// galleryUrlsForRestaurant
test('prefers restaurant_images over metadata', () => {
  const restaurant = {
    restaurant_images: [{ url: 'https://a.com/curated.jpg', sort_order: 1 }],
    metadata: { photos: ['https://a.com/meta.jpg'] },
  };
  const result = galleryUrlsForRestaurant(restaurant);
  assert.deepEqual(result, ['https://a.com/curated.jpg']);
});
test('falls back to metadata when no restaurant_images', () => {
  const restaurant = {
    metadata: { photos: ['https://a.com/meta.jpg'] },
  };
  const result = galleryUrlsForRestaurant(restaurant);
  assert.deepEqual(result, ['https://a.com/meta.jpg']);
});
test('returns [] when neither source has images', () => {
  assert.deepEqual(galleryUrlsForRestaurant({}), []);
  assert.deepEqual(galleryUrlsForRestaurant(null), []);
});
