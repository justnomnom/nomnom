import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { captionFor, captionForList, captionForRestaurant, captionForReview, hashtags } from '../lib/captions.mjs';

const restaurantProps = {
  restaurant: { name: 'Casa Lupo', tagline: 'Italian · Wine bar · Lisboa', location: 'Lisboa', rating: 4.9, address: 'Rua da Prata 12' },
  chips: [{ label: 'Italian' }, { label: 'Wine bar' }],
  consensus: { reviewCount: '164', dishes: [['Carbonara', 21], ['Tiramisu', 9], ['Focaccia', 4], ['Negroni', 2]] },
};

describe('captionForRestaurant', () => {
  it('uses only values present in the rendered props', () => {
    const caption = captionForRestaurant(restaurantProps);
    assert.equal(caption.split('\n')[0], 'Casa Lupo — Italian · Wine bar · Lisboa');
    assert.match(caption, /★ 4\.9 · 164 reviews/);
    assert.match(caption, /Most mentioned: Carbonara, Tiramisu, Focaccia/);
    assert.ok(!caption.includes('Negroni'), 'caps the dish list at three');
    assert.match(caption, /Rua da Prata 12/);
    assert.match(caption, /nomnom\.app/);
  });

  it('drops every line whose source is missing rather than filling it in', () => {
    const caption = captionForRestaurant({ restaurant: { name: 'Bare' }, chips: [], consensus: {} });
    assert.deepEqual(caption.split('\n'), ['Bare', 'Save it in NomNom → nomnom.app', '#nomnom']);
  });

  it('accepts plain-string dishes as well as [label, mentions] pairs', () => {
    const caption = captionForRestaurant({ ...restaurantProps, consensus: { dishes: ['Bifana', 'Pastel'] } });
    assert.match(caption, /Most mentioned: Bifana, Pastel/);
  });
});

describe('captionForReview', () => {
  const reviewProps = {
    ...restaurantProps,
    reviews: [{ name: 'Charlotte Bae', handle: '@charlotte', quote: 'Everything delicious, service exceptional.' }],
  };

  it('leads with the quote and attributes it', () => {
    const lines = captionForReview(reviewProps).split('\n');
    assert.equal(lines[0], '"Everything delicious, service exceptional."');
    assert.equal(lines[1], '— @charlotte on Casa Lupo');
    assert.equal(lines[2], '★ 4.9 · Lisboa');
  });

  it('falls back to the reviewer name when there is no handle', () => {
    const noHandle = { ...reviewProps, reviews: [{ ...reviewProps.reviews[0], handle: '' }] };
    assert.match(captionForReview(noHandle), /— Charlotte Bae on Casa Lupo/);
  });

  it('flattens the author line breaks that would split the caption', () => {
    const multiline = { ...reviewProps, reviews: [{ name: 'Ana', quote: 'Fantastic.\n\nThe pasta was  exceptional.' }] };
    const lines = captionForReview(multiline).split('\n');
    assert.equal(lines[0], '"Fantastic. The pasta was exceptional."');
  });

  it('prefers an explicit review over the reviews array', () => {
    const explicit = { ...reviewProps, review: { name: 'Ana', quote: 'The bifana is the point.' } };
    assert.match(captionForReview(explicit), /The bifana is the point/);
  });
});

const listProps = {
  list: { title: 'Caldas must-gos', subtitle: 'Worth the drive · Caldas da Rainha', location: 'Caldas da Rainha' },
  creator: { name: 'Andre', handle: '@andre' },
  places: [
    { name: 'WOAK SUSHI', rating: 4.9, neighbourhood: 'Caldas da Rainha' },
    { name: 'Retiro dos Cubanos', rating: null, neighbourhood: 'Gaeiras' },
  ],
};

describe('captionForList', () => {
  it('numbers the places the reel shows, in order', () => {
    const lines = captionForList(listProps).split('\n');
    assert.equal(lines[0], 'Caldas must-gos — 2 spots by @andre');
    assert.equal(lines[1], 'Worth the drive · Caldas da Rainha');
    assert.equal(lines[2], '1. WOAK SUSHI ★4.9');
    assert.equal(lines[3], '2. Retiro dos Cubanos', 'a place with no rating gets no star');
  });

  it('handles an anonymous creator and a single place', () => {
    const caption = captionForList({ list: { title: 'Solo' }, creator: {}, places: [{ name: 'One' }] });
    assert.equal(caption.split('\n')[0], 'Solo — 1 spot');
  });
});

describe('hashtags', () => {
  it('always leads with #nomnom and dedupes real labels', () => {
    assert.equal(hashtags(['Lisboa', 'Wine bar', 'lisboa']), '#nomnom #lisboa #winebar');
  });

  it('ignores empty labels', () => {
    assert.equal(hashtags(['', null, undefined]), '#nomnom');
  });
});

describe('captionFor', () => {
  it('dispatches by kind and refuses unknown ones', () => {
    assert.match(captionFor('restaurant', restaurantProps), /Casa Lupo/);
    assert.match(captionFor('list', listProps), /Caldas must-gos/);
    assert.throws(() => captionFor('tweet', {}), /No caption builder/);
  });
});
