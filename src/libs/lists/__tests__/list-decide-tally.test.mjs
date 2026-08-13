/**
 * @jest-environment node
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

  it('picks the top-ranked winner', () => {
    assert.equal(
      pickDecideWinnerId({ x: { net: 2, up: 2, down: 0 }, y: { net: 5, up: 5, down: 0 } }, [
        'x',
        'y',
      ]),
      'y'
    );
  });
});
