/**
 * Content-platform loaders that Node can execute without transpiling `.ts`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatSlugLabel, siblingHubHref } from '../content-breadcrumbs-links.js';
import { suggestByTags } from '../related-content.js';
import { mapCuratedRow } from '../curated-restaurants.js';

test('suggestByTags ranks overlapping tags and skips the source slug', () => {
  const source = { slug: 'a', frontmatter: { tags: ['lisbon', 'lunch'] } };
  const pool = [
    { slug: 'a', frontmatter: { tags: ['lisbon', 'lunch'] } },
    { slug: 'b', frontmatter: { tags: ['lisbon'] } },
    { slug: 'c', frontmatter: { tags: ['lisbon', 'lunch', 'tasca'] } },
    { slug: 'd', frontmatter: { tags: ['porto'] } },
  ];
  assert.deepEqual(
    suggestByTags(source, pool).map((d) => d.slug),
    ['c', 'b']
  );
  assert.deepEqual(suggestByTags({ slug: 'a', frontmatter: {} }, pool), []);
});

test('siblingHubHref links a different sibling, not the current page', () => {
  assert.equal(formatSlugLabel('late-kitchen-lisbon'), 'late kitchen lisbon');
  assert.equal(siblingHubHref(['only'], 'only', (s) => `/${s}`), null);
  assert.equal(siblingHubHref(['alfama-on-foot', 'baixa-walk'], 'baixa-walk', (s) => `/${s}`), '/alfama-on-foot');
});

test('mapCuratedRow: a fully curated row maps to the hub shape', () => {
  const r = mapCuratedRow({
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    slug: 'cervejaria-ramiro',
    name: 'Cervejaria Ramiro',
    latitude: 38.7223,
    longitude: -9.1351,
    rating: 4.6,
    metadata: {
      editorial: {
        country: 'portugal',
        city: 'lisbon',
        categories: ['seafood'],
        influencer_slugs: ['ines-lisboa'],
        short_description: 'Intendente beer hall.',
      },
      photos: ['https://example.test/a.jpg'],
    },
  });
  assert.equal(r.id, 'aaaaaaaa-0000-4000-8000-000000000001');
  assert.equal(r.slug, 'cervejaria-ramiro');
  assert.equal(r.country, 'portugal');
  assert.equal(r.city, 'lisbon');
  assert.deepEqual(r.categories, ['seafood']);
  assert.deepEqual(r.influencerSlugs, ['ines-lisboa']);
  assert.equal(r.shortDescription, 'Intendente beer hall.');
  assert.equal(r.heroImage, 'https://example.test/a.jpg');
  assert.deepEqual(r.location, { lat: 38.7223, lng: -9.1351 });
});

test('mapCuratedRow: an ingested row with no editorial country/city is not hub-publishable', () => {
  // This is what keeps hubs curated-only once the city-wide ingest lands.
  assert.equal(
    mapCuratedRow({ id: 'x', slug: 'some-scrape', name: 'Some Scrape', metadata: {} }),
    null
  );
  assert.equal(
    mapCuratedRow({
      id: 'x',
      slug: 'half-curated',
      name: 'Half Curated',
      metadata: { editorial: { country: 'portugal' } },
    }),
    null
  );
});

test('mapCuratedRow: a row without a slug or name is rejected', () => {
  const meta = { editorial: { country: 'portugal', city: 'lisbon' } };
  assert.equal(mapCuratedRow({ id: 'x', name: 'No Slug', metadata: meta }), null);
  assert.equal(mapCuratedRow({ id: 'x', slug: 'no-name', metadata: meta }), null);
  assert.equal(mapCuratedRow(null), null);
  assert.equal(mapCuratedRow('nope'), null);
});

test('mapCuratedRow: missing optional fields degrade instead of throwing', () => {
  const r = mapCuratedRow({
    id: 'x',
    slug: 's',
    name: 'N',
    metadata: { editorial: { country: 'portugal', city: 'lisbon' } },
  });
  assert.equal(r.rating, 0);
  assert.deepEqual(r.categories, []);
  assert.equal(r.shortDescription, '');
  assert.equal(r.heroImage, null);
  assert.deepEqual(r.location, { lat: 0, lng: 0 });
});
