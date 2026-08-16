import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { warningsFromProps } from '../lib/review-warnings.mjs';

describe('warningsFromProps — list', () => {
  const good = {
    list: { title: 'Caldas must-gos', subtitle: 'Worth the drive' },
    creator: { name: 'Andre', handle: '@andre' },
    places: [{ name: 'A', photo: 'x.jpg' }, { name: 'B', photo: 'y.jpg' }],
  };

  it('stays quiet on a complete list', () => {
    assert.deepEqual(warningsFromProps('list', good), []);
  });

  it('catches a seeded creator handle straight from the props', () => {
    const seeded = { ...good, creator: { name: 'e2eacctms25fl3m', handle: '@e2eacctms25fl3m' } };
    assert.match(warningsFromProps('list', seeded).join(' | '), /test account on screen/);
  });

  it('counts places with no photo', () => {
    const thin = { ...good, places: [{ name: 'A', photo: null }, { name: 'B', photo: 'y.jpg' }] };
    assert.match(warningsFromProps('list', thin).join(' | '), /1\/2 places have no photo/);
  });

  it('notes a hidden subtitle', () => {
    assert.match(warningsFromProps('list', { ...good, list: { title: 'X', subtitle: '' } }).join(' | '), /subtitle hides itself/);
  });
});

describe('warningsFromProps — restaurant and review', () => {
  const good = {
    badgeText: 'In your NomNom Circle',
    restaurant: { mapImage: 'maps/x.png' },
    reviews: [{ quote: 'A complete thought.' }],
    consensus: { knows: ['can get loud'] },
  };

  it('stays quiet when everything is sourced on-platform', () => {
    assert.deepEqual(warningsFromProps('restaurant', good), []);
  });

  it('flags a Google-sourced pool via the emptied badge', () => {
    assert.match(warningsFromProps('restaurant', { ...good, badgeText: '' }).join(' | '), /credited to their authors/);
  });

  it('flags a truncated quote only for the spotlight cut', () => {
    const trimmed = { ...good, reviews: [{ quote: 'It goes on and on and…' }] };
    assert.match(warningsFromProps('review', trimmed).join(' | '), /trimmed with an ellipsis/);
    assert.deepEqual(warningsFromProps('restaurant', trimmed), [], 'the reel shows several quotes, so this is expected there');
  });

  it('reads a single `review` prop as well as the reviews array', () => {
    const spotlight = { ...good, reviews: undefined, review: { quote: 'Trimmed…' } };
    assert.match(warningsFromProps('review', spotlight).join(' | '), /trimmed with an ellipsis/);
  });

  it('flags the stylized map fallback', () => {
    assert.match(warningsFromProps('restaurant', { ...good, restaurant: {} }).join(' | '), /stylized fallback/);
  });
});
