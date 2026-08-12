import assert from 'node:assert/strict';
import test from 'node:test';

import {
  slimRestaurantCardMetadata,
  slimRestaurantRowsMetadata,
  CARD_METADATA_KEYS,
} from 'src/libs/restaurant/slim-restaurant-card-metadata';

test('slim: drops heavy ingest keys, keeps the allowlist', () => {
  const full = {
    rating: 4.7,
    review_consensus: { summary: 'great' },
    photos: ['https://a/1.jpg', '  ', 'https://a/2.jpg'],
    hero_url: ' https://a/hero.jpg ',
    image_url: 'https://a/img.jpg',
    // heavy / internal — must be dropped
    user_reviews: 'x'.repeat(8000),
    about: { long: 'y'.repeat(3000) },
    popular_times: [1, 2, 3],
    mentioned_in_reviews: ['a'],
    tag_slugs: ['sushi'],
    ingest_source_photo_urls_hash: 'abc',
    data_id: '0x1',
    owner: { name: 'z' },
  };
  const slim = slimRestaurantCardMetadata(full);
  assert.deepEqual(Object.keys(slim).sort(), [...CARD_METADATA_KEYS].sort());
  assert.equal(slim.rating, 4.7);
  assert.deepEqual(slim.review_consensus, { summary: 'great' });
  assert.deepEqual(slim.photos, ['https://a/1.jpg', 'https://a/2.jpg']); // blanks filtered
  assert.equal(slim.hero_url, 'https://a/hero.jpg'); // trimmed
  assert.equal(slim.image_url, 'https://a/img.jpg');
  // The blob shrinks by >95%.
  assert.ok(JSON.stringify(slim).length < JSON.stringify(full).length * 0.05);
});

test('slim: bad / empty inputs -> null', () => {
  assert.equal(slimRestaurantCardMetadata(null), null);
  assert.equal(slimRestaurantCardMetadata(undefined), null);
  assert.equal(slimRestaurantCardMetadata('str'), null);
  assert.equal(slimRestaurantCardMetadata(['a']), null);
  assert.equal(slimRestaurantCardMetadata({}), null);
  assert.equal(slimRestaurantCardMetadata({ user_reviews: 'x' }), null); // only heavy keys -> null
});

test('slim: partial metadata keeps only present valid keys', () => {
  assert.deepEqual(slimRestaurantCardMetadata({ image_url: 'https://a/i.jpg', junk: 1 }), {
    image_url: 'https://a/i.jpg',
  });
  // invalid-typed values are skipped
  assert.equal(slimRestaurantCardMetadata({ rating: 'nope', hero_url: 42 }), null);
});

test('slimRows: replaces metadata per row, passes through rows without it', () => {
  const rows = [
    { id: '1', name: 'A', metadata: { rating: 4.1, user_reviews: 'x'.repeat(5000) } },
    { id: '2', name: 'B', metadata: null },
    { id: '3', name: 'C' }, // no metadata field
  ];
  const out = slimRestaurantRowsMetadata(rows);
  assert.deepEqual(out[0].metadata, { rating: 4.1 });
  assert.equal(out[0].id, '1'); // other fields preserved
  assert.equal(out[1].metadata, null);
  assert.equal('metadata' in out[2], false);
  // original not mutated
  assert.equal(typeof rows[0].metadata.user_reviews, 'string');
});

test('slimRows: non-array -> []', () => {
  assert.deepEqual(slimRestaurantRowsMetadata(null), []);
  assert.deepEqual(slimRestaurantRowsMetadata(undefined), []);
});

/* ------------------------------------------------------------------ *
 * Corner cases
 * ------------------------------------------------------------------ */

test('slim: rating 0 survives (falsy but a valid rating)', () => {
  // Guards the `typeof === number` check against ever being rewritten as a
  // truthiness test, which would silently drop unrated-as-0 rows.
  assert.deepEqual(slimRestaurantCardMetadata({ rating: 0 }), { rating: 0 });
});

test('slim: non-finite ratings are dropped', () => {
  assert.equal(slimRestaurantCardMetadata({ rating: NaN }), null);
  assert.equal(slimRestaurantCardMetadata({ rating: Infinity }), null);
  assert.equal(slimRestaurantCardMetadata({ rating: -Infinity }), null);
});

test('slim: rating must be a real number, not a coercible one', () => {
  assert.equal(slimRestaurantCardMetadata({ rating: '4.7' }), null);
  assert.equal(slimRestaurantCardMetadata({ rating: true }), null);
  assert.equal(slimRestaurantCardMetadata({ rating: [4.7] }), null);
  assert.equal(slimRestaurantCardMetadata({ rating: null }), null);
});

test('slim: rating range is not validated — out-of-range values pass through', () => {
  // Documents current behaviour: this is a shaping helper, not a validator. The
  // ingest blob is trusted for range; only the type is enforced here.
  assert.deepEqual(slimRestaurantCardMetadata({ rating: -3.5 }), { rating: -3.5 });
  assert.deepEqual(slimRestaurantCardMetadata({ rating: 99 }), { rating: 99 });
});

test('slim: hero_url / image_url that are blank after trim are dropped', () => {
  assert.equal(slimRestaurantCardMetadata({ hero_url: '' }), null);
  assert.equal(slimRestaurantCardMetadata({ hero_url: '   ' }), null);
  assert.equal(slimRestaurantCardMetadata({ image_url: '' }), null);
  assert.equal(slimRestaurantCardMetadata({ image_url: '\n\t ' }), null);
});

test('slim: photos filters non-strings and blanks, but does NOT trim survivors', () => {
  // Asymmetry with hero_url/image_url, which are trimmed. `p.trim()` is used
  // only as the filter predicate; the element is emitted as-is.
  assert.deepEqual(slimRestaurantCardMetadata({ photos: ['a', null, 3, {}, '  b  ', ''] }), {
    photos: ['a', '  b  '],
  });
});

test('slim: an empty photos array still yields a non-null object', () => {
  // `photos: []` sets the key, so `Object.keys(slim).length > 0` holds and the
  // "nothing survives -> null" branch is not reached. Callers that treat a
  // non-null metadata as "has a usable image" must still check photos.length.
  assert.deepEqual(slimRestaurantCardMetadata({ photos: [] }), { photos: [] });
  assert.deepEqual(slimRestaurantCardMetadata({ photos: ['', '   '] }), { photos: [] });
});

test('slim: review_consensus accepts any object, including empty and arrays', () => {
  // Arrays pass the `typeof === object` check here even though the top-level
  // guard rejects an array *metadata*. Documents current behaviour.
  assert.deepEqual(slimRestaurantCardMetadata({ review_consensus: {} }), {
    review_consensus: {},
  });
  assert.deepEqual(slimRestaurantCardMetadata({ review_consensus: [] }), {
    review_consensus: [],
  });
  assert.equal(slimRestaurantCardMetadata({ review_consensus: 'great' }), null);
  assert.equal(slimRestaurantCardMetadata({ review_consensus: null }), null);
});

test('slim: kept object values are shared by reference, not deep-cloned', () => {
  // The slim blob is serialized straight to the client, so a shallow copy is
  // fine — but callers must not mutate it expecting the source to be untouched.
  const consensus = { summary: 'great' };
  const photos = ['https://a/1.jpg'];
  const slim = slimRestaurantCardMetadata({ review_consensus: consensus, photos });
  assert.equal(slim.review_consensus, consensus);
  assert.notEqual(slim.photos, photos); // .filter() always allocates a new array
});

test('slim: never emits a key outside the allowlist', () => {
  const noisy = {
    rating: 4.2,
    review_consensus: { s: 1 },
    photos: ['https://a/1.jpg'],
    hero_url: 'https://a/h.jpg',
    image_url: 'https://a/i.jpg',
    Rating: 5,
    RATING: 5,
    ' rating': 5,
    'rating ': 5,
    tag_slugs: ['sushi'],
    hours_parsed: {},
    open_hours: {},
    complete_address: {},
    categories: [],
    reviews_link: 'https://x',
    cid: '1',
    plus_code: 'X',
    ingest_run_id: 'r1',
    user_reviews: 'x',
  };
  const slim = slimRestaurantCardMetadata(noisy);
  for (const key of Object.keys(slim)) {
    assert.ok(CARD_METADATA_KEYS.includes(key), `unexpected key leaked: ${key}`);
  }
  assert.equal(Object.keys(slim).length, CARD_METADATA_KEYS.length);
});

test('slim: does not mutate its input', () => {
  const full = {
    rating: 4.7,
    hero_url: ' https://a/hero.jpg ',
    photos: ['https://a/1.jpg', '  '],
    user_reviews: 'x'.repeat(100),
  };
  const before = JSON.stringify(full);
  slimRestaurantCardMetadata(full);
  assert.equal(JSON.stringify(full), before);
});

test('slimRows: null / primitive rows pass through untouched', () => {
  assert.deepEqual(slimRestaurantRowsMetadata([null, undefined, 5, 'str', false]), [
    null,
    undefined,
    5,
    'str',
    false,
  ]);
});

test('slimRows: a present-but-undefined metadata key is normalized to null', () => {
  const out = slimRestaurantRowsMetadata([{ id: '1', metadata: undefined }]);
  assert.equal('metadata' in out[0], true);
  assert.equal(out[0].metadata, null);
});

test('slimRows: rejects every non-array shape, not just null/undefined', () => {
  assert.deepEqual(slimRestaurantRowsMetadata({}), []);
  assert.deepEqual(slimRestaurantRowsMetadata({ 0: { metadata: {} }, length: 1 }), []);
  assert.deepEqual(slimRestaurantRowsMetadata('ab'), []);
  assert.deepEqual(slimRestaurantRowsMetadata(0), []);
});

test('slimRows: preserves row order and length', () => {
  const rows = Array.from({ length: 50 }, (_, i) => ({
    id: String(i),
    metadata: { rating: i / 10, user_reviews: 'x'.repeat(200) },
  }));
  const out = slimRestaurantRowsMetadata(rows);
  assert.equal(out.length, 50);
  assert.deepEqual(
    out.map((r) => r.id),
    rows.map((r) => r.id)
  );
  assert.deepEqual(out[49].metadata, { rating: 4.9 });
});

test('slimRows: returns new row objects and leaves the originals intact', () => {
  const rows = [{ id: '1', metadata: { rating: 4.1, user_reviews: 'x'.repeat(500) } }];
  const out = slimRestaurantRowsMetadata(rows);
  assert.notEqual(out[0], rows[0]);
  assert.equal(rows[0].metadata.user_reviews.length, 500);
  assert.equal('user_reviews' in out[0].metadata, false);
});
