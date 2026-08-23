import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  IDEAL_QUOTE_MAX,
  MIN_LIST_PLACES,
  MIN_USABLE_QUOTE,
  RECAP_GRID_SIZE,
  listReelSeconds,
  looksGeneratedHandle,
  scoreList,
  scoreRestaurant,
  scoreReviewReel,
} from '../lib/reel-readiness.mjs';

const fullRestaurant = {
  id: 'r1',
  name: 'Casa Lupo',
  rating: 4.8,
  hasCoords: true,
  onPlatformReviews: 3,
  googleReviews: 4,
  photos: 6,
  chips: 3,
  dishes: 4,
  hasConsensus: true,
};

describe('scoreRestaurant', () => {
  it('scores a fully-sourced restaurant at the top of the scale', () => {
    const r = scoreRestaurant(fullRestaurant);
    assert.equal(r.blockers.length, 0);
    assert.equal(r.warnings.length, 0);
    assert.ok(r.score > 99, `expected ~100, got ${r.score}`);
  });

  it('blocks a restaurant with no review text, matching what the fetch script does', () => {
    const r = scoreRestaurant({ ...fullRestaurant, onPlatformReviews: 0, googleReviews: 0 });
    assert.match(r.blockers[0], /no reviews with text/);
  });

  it('counts Google metadata reviews toward the pool', () => {
    const onlyGoogle = scoreRestaurant({ ...fullRestaurant, onPlatformReviews: 0, googleReviews: 5 });
    assert.equal(onlyGoogle.blockers.length, 0);
    assert.equal(onlyGoogle.signals.reviewPool, 5);
  });

  it('warns about each missing input instead of hiding it', () => {
    const r = scoreRestaurant({ id: 'r2', name: 'Bare', rating: 3, onPlatformReviews: 1 });
    assert.equal(r.signals.reviewPool, 1);
    const joined = r.warnings.join(' | ');
    assert.match(joined, /--reviews 1/);
    assert.match(joined, /no photos/);
    assert.match(joined, /no cuisine\/vibe tags/);
    assert.match(joined, /no AI review_consensus/);
    assert.match(joined, /no coordinates/);
  });

  it('ranks a richer restaurant above a thinner one', () => {
    const thin = scoreRestaurant({ ...fullRestaurant, photos: 0, chips: 0, dishes: 0, hasConsensus: false });
    assert.ok(scoreRestaurant(fullRestaurant).score > thin.score);
  });

  it('does not reward hoarding beyond what the reel renders', () => {
    const plenty = scoreRestaurant({ ...fullRestaurant, photos: 50, chips: 20 });
    assert.equal(plenty.score, scoreRestaurant(fullRestaurant).score);
  });
});

describe('scoreReviewReel', () => {
  const base = { id: 'r1', name: 'Casa Lupo', rating: 4.8, photos: 4, chips: 3, dishes: 3, bestQuoteChars: 120 };

  it('puts a NomNom user review above an equivalent Google one', () => {
    const user = scoreReviewReel({ ...base, userQuotes: 1 });
    const google = scoreReviewReel({ ...base, googleQuotes: 6 });
    assert.ok(user.score > google.score, `${user.score} should beat ${google.score}`);
    assert.equal(user.warnings.length, 0);
    assert.match(google.warnings.join(' | '), /credited to its author/);
  });

  it('blocks a quote too short to carry a scene', () => {
    const r = scoreReviewReel({ ...base, userQuotes: 0, googleQuotes: 0, bestQuoteChars: 1 });
    assert.match(r.blockers.join(' | '), new RegExp(`at least ${MIN_USABLE_QUOTE} characters`));
  });

  it('blocks a spotlight with no photo, since it opens full-bleed', () => {
    const r = scoreReviewReel({ ...base, userQuotes: 1, photos: 0 });
    assert.match(r.blockers.join(' | '), /no photo/);
  });

  it('warns when the quote will be truncated', () => {
    const r = scoreReviewReel({ ...base, userQuotes: 1, bestQuoteChars: IDEAL_QUOTE_MAX + 60 });
    assert.match(r.warnings.join(' | '), /trimmed to 150/);
  });
});

const fullList = {
  id: 'l1',
  name: 'Caldas must-gos',
  description: 'Four tables worth the drive',
  placeCount: 4,
  placesWithPhoto: 4,
  placesWithTagline: 4,
  avgRating: 4.65,
  cityCoherence: 1,
  creatorNamed: true,
};

describe('scoreList', () => {
  it('scores a complete four-place list near the top', () => {
    const r = scoreList(fullList);
    assert.equal(r.blockers.length, 0);
    assert.equal(r.warnings.length, 0);
    assert.ok(r.score > 96, `expected ~100, got ${r.score}`);
  });

  it('blocks lists too short for a showcase', () => {
    const r = scoreList({ ...fullList, placeCount: 2, placesWithPhoto: 2, placesWithTagline: 2 });
    assert.match(r.blockers[0], new RegExp(`at least ${MIN_LIST_PLACES}`));
  });

  it('flags places the recap grid will not show', () => {
    const r = scoreList({ ...fullList, placeCount: 7, placesWithPhoto: 7, placesWithTagline: 7 });
    assert.match(r.warnings.join(' | '), new RegExp(`first ${RECAP_GRID_SIZE} of 7`));
  });

  it('flags a reel that runs long', () => {
    const r = scoreList({ ...fullList, placeCount: 9, placesWithPhoto: 9, placesWithTagline: 9 });
    assert.match(r.warnings.join(' | '), /runs \d+s — long for a feed/);
  });

  it('reports missing photos precisely', () => {
    const r = scoreList({ ...fullList, placesWithPhoto: 1 });
    assert.match(r.warnings.join(' | '), /3\/4 places have no photo/);
    assert.equal(r.signals.photoCoverage, 0.25);
  });

  it('penalises a list whose places span cities', () => {
    const split = scoreList({ ...fullList, cityCoherence: 0.5 });
    assert.ok(split.score < scoreList(fullList).score);
    assert.match(split.warnings.join(' | '), /more than one city/);
  });

  it('flags a seeded or generated creator handle before it reaches the screen', () => {
    for (const handle of ['e2eacctms25fl3m', 'user61f2e950_954d26bf', '@e2e_tester']) {
      assert.ok(looksGeneratedHandle(handle), `${handle} should look generated`);
      const r = scoreList({ ...fullList, creatorHandle: handle });
      assert.match(r.warnings.join(' | '), /test account on screen/);
    }
  });

  it('leaves real handles alone', () => {
    for (const handle of ['andre', 'maria_costa', 'joao99', '@chef_ana']) {
      assert.equal(looksGeneratedHandle(handle), false, `${handle} should pass`);
    }
    assert.equal(scoreList({ ...fullList, creatorHandle: 'andre' }).warnings.length, 0);
  });

  it('computes runtime from the composition timing', () => {
    assert.equal(Math.round(listReelSeconds(4)), 24);
    assert.equal(scoreList(fullList).signals.seconds, 24);
  });
});
