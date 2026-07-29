import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  mapGalleryUrlsFromRow,
  mapPlaceAddressLine,
  mapPlaceFromListRestaurant,
  mapPlaceMapsUrl,
  mapPlaceNumericRating,
  mapPlaceTagLabelsCapped,
  mapPlaceTagSkeletonCount,
  mapPlaceTelHref,
  mapSheetViewerIdentityFromUser,
  mapSpotListSubtitle,
  mapThumbFromRow,
  normalizeMapSheetPlaces,
  prepareMapSheetPlaces,
  sortMapSheetPlacesByRecency,
  sortMapSheetPlacesWithSponsoredFirst,
} from '../map-spot-sheet-helpers.js';

const t = (key) => key;

test('mapSheetViewerIdentityFromUser handles missing user', () => {
  assert.deepEqual(mapSheetViewerIdentityFromUser(null), { avatarUrl: null, displayName: null });
  assert.deepEqual(mapSheetViewerIdentityFromUser(undefined), {
    avatarUrl: null,
    displayName: null,
  });
});

test('mapSheetViewerIdentityFromUser reads metadata and identity fallbacks', () => {
  const user = {
    email: 'a@b.com',
    user_metadata: { display_name: ' Meta ', avatar_url: ' https://a.png ' },
    identities: [{ identity_data: { picture: 'https://id.png' } }],
  };
  const out = mapSheetViewerIdentityFromUser(user);
  assert.equal(out.avatarUrl, 'https://a.png');
  assert.equal(out.displayName, 'Meta');
});

test('mapSheetViewerIdentityFromUser falls back to identity avatar and email', () => {
  const user = {
    email: 'viewer@example.com',
    user_metadata: {},
    identities: [{ identity_data: { image_url: 'https://oauth.png' } }],
  };
  const out = mapSheetViewerIdentityFromUser(user);
  assert.equal(out.avatarUrl, 'https://oauth.png');
  assert.equal(out.displayName, 'viewer@example.com');
});

test('mapPlaceFromListRestaurant returns null for invalid input', () => {
  assert.equal(mapPlaceFromListRestaurant(null), null);
  assert.equal(mapPlaceFromListRestaurant({ name: 'no id' }), null);
});

test('mapPlaceFromListRestaurant prefers row address over metadata', () => {
  const out = mapPlaceFromListRestaurant({
    id: 'r1',
    name: 'Cafe',
    address: ' Row St ',
    metadata: { address: 'Meta St' },
    latitude: '38.7',
    longitude: -9.1,
    rating: 4.2,
    is_sponsored: true,
    added_at: '2024-01-01',
  });
  assert.equal(out.id, 'r1');
  assert.equal(out.address, 'Row St');
  assert.equal(out.latitude, 38.7);
  assert.equal(out.longitude, -9.1);
  assert.equal(out.rating, 4.2);
  assert.equal(out.is_sponsored, true);
  assert.equal(out.added_at, '2024-01-01');
});

test('normalizeMapSheetPlaces filters invalid rows', () => {
  const places = [{ id: 'ok', name: 'A' }, null, { name: 'no id' }, { id: 'raw', foo: 1 }];
  const out = normalizeMapSheetPlaces(places);
  assert.equal(out.length, 2);
  assert.equal(out[0].id, 'ok');
});

test('sortMapSheetPlacesWithSponsoredFirst promotes sponsored rows', () => {
  const places = [
    { id: 'a', is_sponsored: false },
    { id: 'b', is_sponsored: true },
    { id: 'c' },
  ];
  const out = sortMapSheetPlacesWithSponsoredFirst(places);
  assert.equal(out[0].id, 'b');
});

test('sortMapSheetPlacesWithSponsoredFirst short-circuits small arrays', () => {
  const one = [{ id: 'solo' }];
  assert.equal(sortMapSheetPlacesWithSponsoredFirst(one), one);
  assert.deepEqual(sortMapSheetPlacesWithSponsoredFirst([]), []);
});

test('prepareMapSheetPlaces normalizes then sorts sponsored first', () => {
  const out = prepareMapSheetPlaces([
    { id: 'a', name: 'Regular' },
    { id: 'b', name: 'Paid', is_sponsored: true },
  ]);
  assert.equal(out[0].id, 'b');
  assert.equal(out[0].name, 'Paid');
});

test('sortMapSheetPlacesByRecency: sponsored first, then newest added_at', () => {
  const places = [
    { id: 'old', added_at: '2023-01-01' },
    { id: 'sponsored-new', is_sponsored: true, added_at: '2024-01-01' },
    { id: 'new', added_at: '2025-01-01' },
  ];
  const out = sortMapSheetPlacesByRecency(places);
  assert.equal(out[0].id, 'sponsored-new');
  assert.equal(out[1].id, 'new');
  assert.equal(out[2].id, 'old');
});

test('sortMapSheetPlacesByRecency: missing added_at keeps stable order below dated rows', () => {
  const places = [
    { id: 'no-ts-1' },
    { id: 'dated', added_at: '2024-06-01' },
    { id: 'no-ts-2' },
  ];
  const out = sortMapSheetPlacesByRecency(places);
  assert.equal(out[0].id, 'dated');
  assert.deepEqual(
    out.slice(1).map((p) => p.id),
    ['no-ts-1', 'no-ts-2']
  );
});

test('mapPlaceAddressLine resolves metadata formatted_address', () => {
  assert.equal(mapPlaceAddressLine({ metadata: { formatted_address: '  Fmt  ' } }), 'Fmt');
  assert.equal(mapPlaceAddressLine(null), null);
});

test('mapPlaceMapsUrl prefers explicit maps_link', () => {
  const url = mapPlaceMapsUrl({
    name: 'Test',
    maps_link: ' https://maps.example/x ',
  });
  assert.equal(url, 'https://maps.example/x');
});

test('mapPlaceMapsUrl builds search query from name + address', () => {
  const url = mapPlaceMapsUrl({
    name: 'Cafe',
    address: 'Lisbon',
  });
  assert.ok(url.includes('google.com/maps'));
  assert.ok(url.includes(encodeURIComponent('Cafe Lisbon')));
});

test('mapPlaceMapsUrl falls back to lat/lng', () => {
  const url = mapPlaceMapsUrl({ latitude: 38.7, longitude: -9.1 });
  assert.ok(url?.includes('38.7'));
});

test('mapPlaceTelHref rejects too-short numbers', () => {
  assert.equal(mapPlaceTelHref({ phone: '12345' }), null);
});

test('mapPlaceTelHref normalizes international and extension', () => {
  const out = mapPlaceTelHref({ phone: '+351 912 345 678 ext. 9' });
  assert.equal(out.href, 'tel:+351912345678');
  assert.equal(out.display, '+351 912 345 678 ext. 9');
});

test('mapPlaceTelHref reads metadata phone fields', () => {
  const out = mapPlaceTelHref({ metadata: { formatted_phone_number: '+351 211 111 111' } });
  assert.ok(out?.href.startsWith('tel:'));
});

test('mapGalleryUrlsFromRow prefers restaurant_images sorted by sort_order', () => {
  const urls = mapGalleryUrlsFromRow({
    restaurant_images: [
      { url: ' https://b.jpg ', sort_order: 2, moderation_status: 'approved' },
      { url: 'https://a.jpg', sort_order: 1 },
      { url: 'https://rej.jpg', moderation_status: 'rejected' },
    ],
  });
  assert.deepEqual(urls, ['https://a.jpg', ' https://b.jpg ']);
});

test('mapGalleryUrlsFromRow falls back to metadata photos without duplicates', () => {
  const urls = mapGalleryUrlsFromRow({
    metadata: {
      photos: ['https://p1.jpg', 'https://p1.jpg'],
      hero_url: 'https://hero.jpg',
    },
  });
  assert.deepEqual(urls, ['https://p1.jpg', 'https://hero.jpg']);
});

test('mapThumbFromRow returns first gallery url', () => {
  assert.equal(mapThumbFromRow({ metadata: { hero_url: 'https://h.jpg' } }), 'https://h.jpg');
  assert.equal(mapThumbFromRow({}), null);
});

test('mapPlaceNumericRating prefers row rating over metadata', () => {
  assert.equal(mapPlaceNumericRating({ rating: 4.5, metadata: { rating: 3 } }), 4.5);
  assert.equal(mapPlaceNumericRating({ metadata: { rating: 3.2 } }), 3.2);
  assert.equal(mapPlaceNumericRating({}), null);
});

test('mapPlaceTagLabelsCapped returns empty while catalog loading', () => {
  const labels = mapPlaceTagLabelsCapped(
    { metadata: { tag_slugs: ['pizza'] } },
    t,
    [{ slug: 'pizza', label: 'Pizza' }],
    { tagCatalogLoaded: false }
  );
  assert.deepEqual(labels, []);
});

test('mapPlaceTagLabelsCapped caps at 8 labels', () => {
  const slugs = Array.from({ length: 12 }, (_, i) => `tag-${i}`);
  const catalog = slugs.map((slug) => ({ slug, label: slug, category: 'other' }));
  const labels = mapPlaceTagLabelsCapped({ metadata: { tag_slugs: slugs } }, t, catalog);
  assert.equal(labels.length, 8);
});

test('mapPlaceTagSkeletonCount mirrors capped slug count', () => {
  const slugs = Array.from({ length: 12 }, (_, i) => `s${i}`);
  assert.equal(mapPlaceTagSkeletonCount({ metadata: { tag_slugs: slugs } }), 8);
  assert.equal(mapPlaceTagSkeletonCount({ metadata: {} }), 0);
});

test('mapSpotListSubtitle joins tags and appends rating', () => {
  const sub = mapSpotListSubtitle(
    { metadata: { tag_slugs: ['pizza'] }, rating: 4.25 },
    t,
    [{ slug: 'pizza', label: 'Pizza', category: 'cuisine' }]
  );
  assert.ok(sub.includes('Pizza'));
  assert.ok(sub.includes('★ 4.3'));
});

test('mapSpotListSubtitle uses fallback when no tags', () => {
  const sub = mapSpotListSubtitle({}, t, []);
  assert.equal(sub, 'pages.dashboard.restaurant.category_fallback');
});
