/**
 * fetchOgListRestaurantThumbs: empty inputs, missing config, query errors.
 */
import assert from 'node:assert/strict';
import { describe, mock, test } from 'node:test';

/** @type {{ url: string, key: string }} */
let supabaseApi = { url: 'https://example.supabase.co', key: 'anon-key' };
/** @type {((ctx: object) => object) | null} */
let fromHandler = null;
const createClientCalls = [];

mock.module('src/config-global.js', {
  exports: {
    SUPABASE_API: new Proxy(
      {},
      {
        get(_t, prop) {
          return supabaseApi[prop];
        },
      }
    ),
  },
});

mock.module('@supabase/supabase-js', {
  exports: {
    createClient() {
      createClientCalls.push([...arguments]);
      const ctx = { table: null, filter: {}, limit: null, order: null, select: null };
      const api = {
        from(table) {
          ctx.table = table;
          return api;
        },
        select(cols) {
          ctx.select = cols;
          return api;
        },
        eq(col, val) {
          ctx.filter[col] = val;
          return api;
        },
        order(col, opts) {
          ctx.order = { col, opts };
          return api;
        },
        limit(n) {
          ctx.limit = n;
          return Promise.resolve(fromHandler ? fromHandler(ctx) : { data: [], error: null });
        },
      };
      return api;
    },
  },
});

const { fetchOgListRestaurantThumbs } = await import('../fetch-og-list-restaurant-thumbs.js');

describe('fetchOgListRestaurantThumbs', { concurrency: false }, () => {
  test('returns [] for non-string / empty ids and missing config', async () => {
    createClientCalls.length = 0;
    assert.deepEqual(await fetchOgListRestaurantThumbs(null), []);
    assert.deepEqual(await fetchOgListRestaurantThumbs(''), []);
    assert.deepEqual(await fetchOgListRestaurantThumbs(12), []);
    supabaseApi = { url: '', key: 'anon-key' };
    assert.deepEqual(await fetchOgListRestaurantThumbs('list-1'), []);
    supabaseApi = { url: 'https://example.supabase.co', key: '' };
    assert.deepEqual(await fetchOgListRestaurantThumbs('list-1'), []);
    assert.equal(createClientCalls.length, 0);
    supabaseApi = { url: 'https://example.supabase.co', key: 'anon-key' };
  });

  test('maps list_items rows through pickOgListRestaurantThumbUrls', async () => {
    fromHandler = (ctx) => {
      assert.equal(ctx.table, 'list_items');
      assert.equal(ctx.filter.list_id, 'list-1');
      assert.equal(ctx.limit, 12);
      assert.equal(ctx.order.col, 'sort_order');
      return {
        data: [
          {
            restaurants: {
              restaurant_images: [{ url: 'a.jpg', sort_order: 0, moderation_status: 'approved' }],
            },
          },
          {
            restaurants: {
              restaurant_images: [{ url: 'b.jpg', moderation_status: 'rejected' }],
            },
          },
        ],
        error: null,
      };
    };
    assert.deepEqual(await fetchOgListRestaurantThumbs('list-1', 4), ['a.jpg']);
  });

  test('returns [] on query error, non-array data, and thrown client', async () => {
    fromHandler = () => ({ data: null, error: { message: 'boom' } });
    assert.deepEqual(await fetchOgListRestaurantThumbs('list-1'), []);

    fromHandler = () => ({ data: { not: 'array' }, error: null });
    assert.deepEqual(await fetchOgListRestaurantThumbs('list-1'), []);

    fromHandler = () => {
      throw new Error('network');
    };
    assert.deepEqual(await fetchOgListRestaurantThumbs('list-1'), []);
  });
});
