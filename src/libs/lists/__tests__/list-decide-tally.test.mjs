/**
 * Corner cases for Share → Decide tally ranking.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canStartListDecide,
  pickDecideWinnerId,
  rankDecideTallies,
} from '../list-decide-tally.js';

describe('list-decide-tally', () => {
  it('requires at least three places to start', () => {
    assert.equal(canStartListDecide(2), false);
    assert.equal(canStartListDecide(3), true);
  });

  it('treats non-numeric / short counts as not startable', () => {
    assert.equal(canStartListDecide(0), false);
    assert.equal(canStartListDecide(-1), false);
    assert.equal(canStartListDecide(NaN), false);
    assert.equal(canStartListDecide(undefined), false);
    assert.equal(canStartListDecide(null), false);
    assert.equal(canStartListDecide('2'), false);
    assert.equal(canStartListDecide('3'), true);
    assert.equal(canStartListDecide(2.9), false);
    assert.equal(canStartListDecide(3.1), true);
  });

  it('ranks by net then upvotes', () => {
    const ranked = rankDecideTallies(
      {
        a: { up: 2, down: 1, net: 1 },
        b: { up: 3, down: 2, net: 1 },
        c: { up: 0, down: 0, net: 0 },
      },
      ['c', 'a', 'b']
    );
    assert.deepEqual(
      ranked.map((r) => r.restaurantId),
      ['b', 'a', 'c']
    );
  });

  it('breaks remaining ties with restaurant id', () => {
    const ranked = rankDecideTallies(
      {
        zebra: { up: 1, down: 0, net: 1 },
        alpha: { up: 1, down: 0, net: 1 },
      },
      ['zebra', 'alpha']
    );
    assert.deepEqual(
      ranked.map((r) => r.restaurantId),
      ['alpha', 'zebra']
    );
  });

  it('includes list places with no votes and ignores extra tally keys', () => {
    const ranked = rankDecideTallies({ ghost: { up: 9, down: 0, net: 9 } }, ['kept']);
    assert.equal(ranked.length, 1);
    assert.deepEqual(ranked[0], { restaurantId: 'kept', up: 0, down: 0, net: 0 });
  });

  it('derives net from up/down when net is missing or non-finite', () => {
    const ranked = rankDecideTallies(
      {
        a: { up: 4, down: 1 },
        b: { up: 1, down: 3, net: Number.NaN },
      },
      ['a', 'b']
    );
    assert.equal(ranked[0].net, 3);
    assert.equal(ranked[1].net, -2);
  });

  it('coerces ids to strings and drops falsy restaurant ids', () => {
    const ranked = rankDecideTallies({ 1: { up: 1, down: 0, net: 1 } }, [1, '', null, '2']);
    assert.deepEqual(
      ranked.map((r) => r.restaurantId),
      ['1', '2']
    );
  });

  it('tolerates null tallies and non-array restaurant ids', () => {
    assert.deepEqual(rankDecideTallies(null, ['a']), [{ restaurantId: 'a', up: 0, down: 0, net: 0 }]);
    assert.deepEqual(rankDecideTallies(undefined, null), []);
    assert.deepEqual(rankDecideTallies('nope', ['a']), [
      { restaurantId: 'a', up: 0, down: 0, net: 0 },
    ]);
  });

  it('picks the top-ranked winner', () => {
    assert.equal(
      pickDecideWinnerId({ x: { net: 2, up: 2, down: 0 }, y: { net: 5, up: 5, down: 0 } }, [
        'x',
        'y',
      ]),
      'y'
    );
  });

  it('returns null when there are no places to pick from', () => {
    assert.equal(pickDecideWinnerId({}, []), null);
    assert.equal(pickDecideWinnerId(null, null), null);
  });

  it('coerces string counts and falls back when net is Infinity', () => {
    const ranked = rankDecideTallies(
      {
        a: { up: '2', down: '1', net: '1' },
        b: { up: 1, down: 0, net: Number.POSITIVE_INFINITY },
        c: { up: 0, down: 0, net: 99 },
      },
      ['a', 'b', 'c']
    );
    assert.equal(ranked[0].restaurantId, 'c');
    assert.equal(ranked[0].net, 99);
    assert.equal(ranked[1].restaurantId, 'a');
    assert.equal(ranked[1].up, 2);
    assert.equal(ranked[1].net, 1);
    assert.equal(ranked[2].restaurantId, 'b');
    assert.equal(ranked[2].net, 1);
  });

  it('keeps duplicate restaurant ids as separate ranked rows', () => {
    const ranked = rankDecideTallies({ a: { up: 1, down: 0, net: 1 } }, ['a', 'a']);
    assert.equal(ranked.length, 2);
    assert.equal(ranked[0].restaurantId, 'a');
    assert.equal(ranked[1].restaurantId, 'a');
  });

  it('treats non-numeric up/down as zero', () => {
    const [row] = rankDecideTallies({ a: { up: 'nope', down: null } }, ['a']);
    assert.deepEqual(row, { restaurantId: 'a', up: 0, down: 0, net: 0 });
  });
});
