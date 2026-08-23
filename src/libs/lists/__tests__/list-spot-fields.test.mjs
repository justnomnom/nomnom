/**
 * Run: node --test src/libs/lists/__tests__/list-spot-fields.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clipAtWord,
  captionSiteOrigin,
  listPublicUrl,
  photoFitForAspect,
  spotConsensusFromMetadata,
  spotLocationFromRestaurant,
  spotNameLinesForCard,
} from '../list-spot-fields.js';

test('clipAtWord cuts on a space and does not invent text', () => {
  assert.equal(clipAtWord('short', 20), 'short');
  assert.equal(clipAtWord('Locals praise the suckling pig tonight', 22), 'Locals praise the…');
  assert.equal(clipAtWord('', 10), '');
});

test('spotLocationFromRestaurant prefers borough then street, with NomNom city', () => {
  assert.equal(
    spotLocationFromRestaurant({
      address: 'Largo do Rossio 16, Negrais, 2715-341 Almargem do Bpo.',
      home_city: { name: 'Sintra' },
      metadata: {
        complete_address: { street: 'Largo do Rossio 16', borough: 'Negrais', city: 'Almargem do Bispo' },
      },
    }),
    'Negrais · Sintra'
  );

  assert.equal(
    spotLocationFromRestaurant({
      address: 'R. Rodrigues Sampaio 52C, 1150-280 Lisboa',
      home_city: { name: 'Lisboa' },
      metadata: { complete_address: { street: 'R. Rodrigues Sampaio 52C', borough: '', city: 'Lisbon' } },
    }),
    'R. Rodrigues Sampaio 52C · Lisboa'
  );

  assert.equal(
    spotLocationFromRestaurant({ home_city: { name: 'Águeda' }, metadata: {} }),
    'Águeda'
  );
  assert.equal(spotLocationFromRestaurant({}), '');
});

test('spotConsensusFromMetadata hides itself when ingest has no consensus', () => {
  assert.deepEqual(spotConsensusFromMetadata(null), {
    summary: '',
    loves: [],
    knows: [],
    dishes: [],
    reviewCount: null,
  });
  assert.deepEqual(spotConsensusFromMetadata({}), {
    summary: '',
    loves: [],
    knows: [],
    dishes: [],
    reviewCount: null,
  });
});

test('spotConsensusFromMetadata copies the full app card, unclipped', () => {
  const consensus = spotConsensusFromMetadata({
    review_consensus: {
      summary: 'Locals praise the suckling pig.',
      strengths: ['Crispy skin', 'Good value', 'Family tables'],
      weaknesses: ['Gets busy on Sundays', 'Cash preferred'],
      signature_dishes: [{ label: 'suckling pig', mentions: 12 }, { label: 'bifana' }],
      reviews_analyzed: 184,
    },
  });
  assert.equal(consensus.summary, 'Locals praise the suckling pig.');
  assert.deepEqual(consensus.loves, ['Crispy skin', 'Good value', 'Family tables']);
  assert.deepEqual(consensus.knows, ['Gets busy on Sundays', 'Cash preferred']);
  assert.deepEqual(consensus.dishes, [
    { label: 'suckling pig', mentions: 12 },
    { label: 'bifana', mentions: null },
  ]);
  assert.equal(consensus.reviewCount, 184);
});

test('listPublicUrl prefers username/slug over id', () => {
  assert.equal(
    listPublicUrl({ origin: 'https://www.justnomnom.com', username: 'andre', slug: 'weekend-tables', listId: 'abc' }),
    'https://www.justnomnom.com/lists/andre/weekend-tables'
  );
  assert.equal(
    listPublicUrl({ origin: 'https://www.justnomnom.com', listId: 'abc' }),
    'https://www.justnomnom.com/lists/abc'
  );
  assert.equal(listPublicUrl({}), '');
});

test('photoFitForAspect contains near-square wordmarks and covers plates', () => {
  assert.equal(photoFitForAspect(1), 'contain');
  assert.equal(photoFitForAspect(0.8), 'cover');
  assert.equal(photoFitForAspect(1.5), 'cover');
  assert.equal(photoFitForAspect(null), 'cover');
});

test('spotNameLinesForCard keeps short names on one line', () => {
  assert.deepEqual(spotNameLinesForCard(['Tia', 'Alice'], 'Tia Alice'), ['Tia Alice']);
  assert.deepEqual(spotNameLinesForCard(['Honest', 'Greens'], 'Honest Greens'), ['Honest Greens']);
  assert.deepEqual(
    spotNameLinesForCard(['Casa Lundum | Live', 'Fado Show Alfama'], 'Casa Lundum | Live Fado Show Alfama'),
    ['Casa Lundum | Live', 'Fado Show Alfama']
  );
});

test('captionSiteOrigin ignores localhost SITE_URL', () => {
  assert.equal(
    captionSiteOrigin({ NEXT_PUBLIC_SITE_URL: 'http://localhost:3032' }),
    'https://www.justnomnom.com'
  );
  assert.equal(
    captionSiteOrigin({ NEXT_PUBLIC_SITE_URL: 'http://localhost:3032', NEXT_PUBLIC_APP_DOMAIN: 'example.test' }),
    'https://example.test'
  );
  assert.equal(
    captionSiteOrigin({ NEXT_PUBLIC_SITE_URL: 'https://www.justnomnom.com' }),
    'https://www.justnomnom.com'
  );
});
