/**
 * Marketing page metadata must set openGraph title/description/image, not only <title>.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { APP, APP_OG_IMAGE_PATH } from 'src/config-global.js';
import { getSiteUrl } from 'src/libs/site-url.js';
import { pageMetadata } from '../page-metadata.js';

test('pageMetadata fills canonical, Open Graph, and Twitter from title/description/path', () => {
  const meta = pageMetadata({
    title: 'Pricing',
    description: 'Free lists and paid creator lists.',
    path: '/pricing',
  });
  const url = `${getSiteUrl()}/pricing`;
  assert.equal(meta.title, 'Pricing');
  assert.equal(meta.description, 'Free lists and paid creator lists.');
  assert.equal(meta.alternates.canonical, url);
  assert.equal(meta.openGraph.siteName, APP.name);
  assert.equal(meta.openGraph.title, 'Pricing');
  assert.equal(meta.openGraph.url, url);
  assert.deepEqual(meta.openGraph.images, [
    { url: APP_OG_IMAGE_PATH, width: 1200, height: 630, alt: 'Pricing' },
  ]);
  assert.equal(meta.twitter.card, 'summary_large_image');
  assert.deepEqual(meta.twitter.images, [APP_OG_IMAGE_PATH]);
});
