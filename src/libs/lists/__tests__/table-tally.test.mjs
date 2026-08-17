/**
 * Corner cases for Table tally ranking.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pickWinnerId, rankTallies } from '../table-tally.js';

describe('table-tally', () => {
  it('ranks by net then upvotes', () => {
    const ranked = rankTallies(
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
    const ranked = rankTallies(
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

  it('includes places with no votes and ignores extra tally keys', () => {
    const ranked = rankTallies({ ghost: { up: 9, down: 0, net: 9 } }, ['kept']);
    assert.equal(ranked.length, 1);
    assert.deepEqual(ranked[0], { restaurantId: 'kept', up: 0, down: 0, net: 0 });
  });

  it('derives net from up/down when net is missing or non-finite', () => {
    const ranked = rankTallies(
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
    const ranked = rankTallies({ 1: { up: 1, down: 0, net: 1 } }, [1, '', null, '2']);
    assert.deepEqual(
      ranked.map((r) => r.restaurantId),
      ['1', '2']
    );
  });

  it('tolerates null tallies and non-array restaurant ids', () => {
    assert.deepEqual(rankTallies(null, ['a']), [{ restaurantId: 'a', up: 0, down: 0, net: 0 }]);
    assert.deepEqual(rankTallies(undefined, null), []);
    assert.deepEqual(rankTallies('nope', ['a']), [{ restaurantId: 'a', up: 0, down: 0, net: 0 }]);
  });

  it('picks the top-ranked winner', () => {
    assert.equal(
      pickWinnerId({ x: { net: 2, up: 2, down: 0 }, y: { net: 5, up: 5, down: 0 } }, ['x', 'y']),
      'y'
    );
  });

  it('returns null when there are no places to pick from', () => {
    assert.equal(pickWinnerId({}, []), null);
    assert.equal(pickWinnerId(null, null), null);
  });

  it('coerces string counts and falls back when net is Infinity', () => {
    const ranked = rankTallies(
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
    const ranked = rankTallies({ a: { up: 1, down: 0, net: 1 } }, ['a', 'a']);
    assert.equal(ranked.length, 2);
    assert.equal(ranked[0].restaurantId, 'a');
    assert.equal(ranked[1].restaurantId, 'a');
  });

  it('treats non-numeric up/down as zero', () => {
    const [row] = rankTallies({ a: { up: 'nope', down: null } }, ['a']);
    assert.deepEqual(row, { restaurantId: 'a', up: 0, down: 0, net: 0 });
  });
});
