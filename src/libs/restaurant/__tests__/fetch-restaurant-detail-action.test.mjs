/**
 * Client-callable restaurant detail: UUID gate, not_found, and SSR hit.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';

/** @type {object | null} */
let ssrRow = null;

mock.module('src/libs/restaurant/fetch-restaurant-by-id-for-ssr.js', {
  exports: {
    RESTAURANT_ID_UUID_RE:
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    fetchRestaurantByIdForSsr: async () => ssrRow,
  },
});

const { fetchRestaurantDetail } = await import('../fetch-restaurant-detail-action.js');

const ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('fetchRestaurantDetail', { concurrency: false }, () => {
  beforeEach(() => {
    ssrRow = null;
  });

  test('blank / non-uuid → invalid_id without querying', async () => {
    ssrRow = { id: ID, name: 'should-not-use' };
    assert.deepEqual(await fetchRestaurantDetail(''), { restaurant: null, error: 'invalid_id' });
    assert.deepEqual(await fetchRestaurantDetail('not-a-uuid'), {
      restaurant: null,
      error: 'invalid_id',
    });
    assert.deepEqual(await fetchRestaurantDetail(null), { restaurant: null, error: 'invalid_id' });
  });

  test('unknown uuid → not_found', async () => {
    ssrRow = null;
    assert.deepEqual(await fetchRestaurantDetail(ID), { restaurant: null, error: 'not_found' });
  });

  test('known uuid returns the SSR row', async () => {
    ssrRow = { id: ID, name: 'Time Out Market' };
    assert.deepEqual(await fetchRestaurantDetail(ID), {
      restaurant: ssrRow,
      error: null,
    });
  });
});
