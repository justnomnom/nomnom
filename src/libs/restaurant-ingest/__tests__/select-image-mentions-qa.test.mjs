/**
 * Frontend QA — gallery album selection + dish mention aggregates.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  normalizeMentionedInReviews,
  selectImageUrls,
} from '../map-google-place-payload.js';

test('selectImageUrls: non-array → []', () => {
  assert.deepEqual(selectImageUrls(null), []);
  assert.deepEqual(selectImageUrls({}), []);
});

test('selectImageUrls: skips Latest/Videos/Street View and streetviewpixels URLs', () => {
  const out = selectImageUrls([
    { title: 'Latest', image: 'https://lh3.googleusercontent.com/p/LATEST=w100-h100' },
    { title: 'Videos', image: 'https://lh3.googleusercontent.com/p/VID=w100-h100' },
    { title: 'Street View & 360°', image: 'https://lh3.googleusercontent.com/p/SV=w100-h100' },
    {
      title: 'All',
      image: 'https://maps.googleapis.com/maps/api/streetviewpixels?x=1',
    },
    { title: 'By owner', image: 'https://lh3.googleusercontent.com/p/OWNER=w397-h298-k-no' },
  ]);
  assert.equal(out.length, 1);
  assert.ok(out[0].includes('OWNER'));
  assert.ok(out[0].includes('w1600-h1200'));
});

test('selectImageUrls: priority order then original order; dedupes upgraded URL', () => {
  const a = 'https://lh3.googleusercontent.com/p/A=w10-h10';
  const b = 'https://lh3.googleusercontent.com/p/B=w10-h10';
  const out = selectImageUrls([
    { title: 'Menu', image: a },
    { title: 'By owner', image: b },
    { title: 'All', image: a }, // same as Menu after upgrade → dedupe
  ]);
  assert.equal(out.length, 2);
  assert.ok(out[0].includes('/p/B'));
  assert.ok(out[1].includes('/p/A'));
});

test('selectImageUrls: respects max cap', () => {
  const images = Array.from({ length: 5 }, (_, i) => ({
    title: 'All',
    image: `https://lh3.googleusercontent.com/p/${i}=w10-h10`,
  }));
  assert.equal(selectImageUrls(images, { max: 2 }).length, 2);
});

test('normalizeMentionedInReviews: sorts by count, caps 20, dedupes case-insensitively', () => {
  assert.deepEqual(normalizeMentionedInReviews(null), []);
  const many = Array.from({ length: 25 }, (_, i) => ({
    name: `Dish ${i}`,
    count: i + 1,
  }));
  const capped = normalizeMentionedInReviews(many);
  assert.equal(capped.length, 20);
  assert.equal(capped[0].label, 'Dish 24');
  assert.equal(capped[0].mentions, 25);

  const out = normalizeMentionedInReviews([
    { name: '  Pizza  ', count: 3 },
    { name: 'PIZZA', count: 99 },
    { name: '', count: 5 },
    { name: 'x'.repeat(81), count: 5 },
    { name: 'Pasta', count: '2' },
    { name: 'Bad', count: 0 },
    { name: 'Ramen', count: 10 },
  ]);
  assert.deepEqual(out[0], { label: 'Ramen', mentions: 10 });
  assert.ok(out.some((x) => x.label === 'Pizza' && x.mentions === 3));
  assert.ok(!out.some((x) => x.label === 'PIZZA'));
  assert.ok(out.some((x) => x.label === 'Pasta' && x.mentions === 2));
});
