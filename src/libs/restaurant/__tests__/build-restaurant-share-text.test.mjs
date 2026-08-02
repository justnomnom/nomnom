import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import { buildRestaurantShareText } from '../build-restaurant-share-text.js';

describe('buildRestaurantShareText', () => {
  test('builds the full three-line overview', () => {
    assert.equal(
      buildRestaurantShareText({
        name: 'WOAK SUSHI',
        area: 'Caldas da Rainha · Leiria',
        ratingText: '4.9',
        priceLevel: 2,
      }),
      'WOAK SUSHI\nCaldas da Rainha · Leiria\n★ 4.9 · €€'
    );
  });

  test('drops absent lines instead of leaving blank ones', () => {
    assert.equal(buildRestaurantShareText({ name: 'Tasca do Chico' }), 'Tasca do Chico');
    assert.equal(
      buildRestaurantShareText({ name: 'Tasca do Chico', area: 'Lisboa' }),
      'Tasca do Chico\nLisboa'
    );
  });

  test('renders either stat alone without a dangling separator', () => {
    assert.equal(
      buildRestaurantShareText({ name: 'A', ratingText: '4.6' }),
      'A\n★ 4.6'
    );
    assert.equal(buildRestaurantShareText({ name: 'A', priceLevel: 3 }), 'A\n€€€');
  });

  test('keeps a locale-formatted rating verbatim, so pt gets a comma', () => {
    assert.match(buildRestaurantShareText({ name: 'A', ratingText: '4,9' }), /★ 4,9$/);
  });

  test('drops a zero rating rather than shipping "★ 0"', () => {
    // A freshly ingested venue with no reviews reads as a bad review, not an absent one.
    assert.equal(buildRestaurantShareText({ name: 'A', ratingText: '0' }), 'A');
    assert.equal(buildRestaurantShareText({ name: 'A', ratingText: '0.0' }), 'A');
    assert.equal(buildRestaurantShareText({ name: 'A', ratingText: '0,0' }), 'A');
    assert.equal(buildRestaurantShareText({ name: 'A', ratingText: '0', priceLevel: 2 }), 'A\n€€');
  });

  test('keeps a low but real rating', () => {
    assert.equal(buildRestaurantShareText({ name: 'A', ratingText: '0.5' }), 'A\n★ 0.5');
    assert.equal(buildRestaurantShareText({ name: 'A', ratingText: '0,5' }), 'A\n★ 0,5');
  });

  test('drops a rating that is not a number at all', () => {
    assert.equal(buildRestaurantShareText({ name: 'A', ratingText: 'n/a' }), 'A');
  });

  test('maps price level 1-4 to euro symbols', () => {
    for (const [level, expected] of [[1, '€'], [2, '€€'], [3, '€€€'], [4, '€€€€']]) {
      assert.equal(buildRestaurantShareText({ name: 'A', priceLevel: level }), `A\n${expected}`);
    }
  });

  test('drops an out-of-range or non-integer price level rather than clamping', () => {
    // A bad ingest value should vanish, not render "€€€€€" or a row of empties.
    for (const level of [0, -1, 5, 99, 2.5, null, undefined, NaN, '', 'cheap']) {
      assert.equal(buildRestaurantShareText({ name: 'A', priceLevel: level }), 'A', `level ${level}`);
    }
  });

  test('accepts a numeric string, since DB and API values arrive that way', () => {
    assert.equal(buildRestaurantShareText({ name: 'A', priceLevel: '2' }), 'A\n€€');
  });

  test('returns empty without a name, so a share never leads with a stray rating', () => {
    assert.equal(buildRestaurantShareText({ name: '', ratingText: '4.9', priceLevel: 2 }), '');
    assert.equal(buildRestaurantShareText({ name: null, area: 'Lisboa' }), '');
    assert.equal(buildRestaurantShareText({}), '');
  });

  test('collapses whitespace so a multi-line name cannot break the layout', () => {
    assert.equal(
      buildRestaurantShareText({ name: '  Cervejaria\n  Ramiro  ', area: '  Lisboa  ' }),
      'Cervejaria Ramiro\nLisboa'
    );
  });

  test('preserves Portuguese diacritics', () => {
    assert.equal(
      buildRestaurantShareText({ name: 'Solar dos Presuntos', area: 'São Sebastião' }),
      'Solar dos Presuntos\nSão Sebastião'
    );
  });
});

describe('buildRestaurantShareText — community consensus', () => {
  const CONSENSUS =
    'Locals consistently praise the exceptional pizza quality and variety, with frequent mentions of francesinhas.';

  test('adds the consensus as its own block, in the page’s curly quotes', () => {
    assert.equal(
      buildRestaurantShareText({
        name: 'Pizzaria Roma Antiga',
        area: 'Amarante · Porto',
        ratingText: '4.5',
        priceLevel: 1,
        consensus: CONSENSUS,
        consensusBasis: 'Based on 25 reviews',
      }),
      `Pizzaria Roma Antiga\nAmarante · Porto\n★ 4.5 · €\n\n“${CONSENSUS}”\nBased on 25 reviews`
    );
  });

  test('renders the consensus without a basis', () => {
    assert.equal(
      buildRestaurantShareText({ name: 'A', consensus: 'Great food.' }),
      'A\n\n“Great food.”'
    );
  });

  test('drops a basis that has no consensus to attribute', () => {
    // "Based on 25 reviews" alone attributes nothing and reads as a non sequitur.
    assert.equal(
      buildRestaurantShareText({ name: 'A', consensus: '', consensusBasis: 'Based on 25 reviews' }),
      'A'
    );
  });

  test('accepts a localized basis verbatim', () => {
    assert.match(
      buildRestaurantShareText({
        name: 'A',
        consensus: 'Boa comida.',
        consensusBasis: 'Com base em 25 avaliações',
      }),
      /Com base em 25 avaliações$/
    );
  });

  test('clamps an over-long summary on a word boundary', () => {
    const long = `${'palavra '.repeat(60)}fim`;
    const out = buildRestaurantShareText({ name: 'A', consensus: long });
    const quoted = out.split('\n\n')[1];
    assert.ok(quoted.length <= 244, `quoted length ${quoted.length}`);
    assert.ok(quoted.startsWith('“') && quoted.endsWith('”'), 'stays quoted');
    assert.ok(quoted.includes('…'), 'marks the cut');
    assert.ok(!/\s…”$/.test(quoted), 'no space before the ellipsis');
  });

  test('leaves a normal-length summary untouched', () => {
    const out = buildRestaurantShareText({ name: 'A', consensus: CONSENSUS });
    assert.ok(out.includes(CONSENSUS), 'summary preserved in full');
    assert.ok(!out.includes('…'), 'not clamped');
  });

  test('collapses newlines inside a summary so the block stays two lines', () => {
    assert.equal(
      buildRestaurantShareText({ name: 'A', consensus: 'Good\n\nfood.', consensusBasis: 'x' }),
      'A\n\n“Good food.”\nx'
    );
  });
});
