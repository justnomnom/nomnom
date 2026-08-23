/**
 * Run: node --test src/libs/lists/__tests__/article-list-stills.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildListTimeline } from '../../../../remotion/src/compositions/ListShowcase/constants.js';
import { spotStillFrame, videoPlaceCount, ARTICLE_LIST_VIDEO_PLACE_CAP } from '../article-list-stills.js';

test('videoPlaceCount caps at 8', () => {
  assert.equal(videoPlaceCount(12), ARTICLE_LIST_VIDEO_PLACE_CAP);
  assert.equal(videoPlaceCount(3), 3);
  assert.equal(videoPlaceCount(0), 0);
});

test('spot still is the mid-spot frame from buildListTimeline', () => {
  const tl = buildListTimeline(4);
  const expected = tl.spots[1].start + Math.floor(tl.spots[1].duration / 2);
  assert.equal(spotStillFrame(4, 1), expected);
  assert.equal(spotStillFrame(4, 99), null);
});
