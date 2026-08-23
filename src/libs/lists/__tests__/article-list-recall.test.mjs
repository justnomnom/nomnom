/**
 * Run: node --test src/libs/lists/__tests__/article-list-recall.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeIlike, recallRestaurantsByName, mapPool } from '../article-list-recall.js';

test('escapeIlike treats percent and underscore as literals', () => {
  assert.equal(escapeIlike('100%'), '100\\%');
  assert.equal(escapeIlike('foo_bar'), 'foo\\_bar');
});

test('recallRestaurantsByName merges two ilike queries by id', async () => {
  const calls = [];
  const supabase = {
    from() {
      return {
        select() {
          return {
            ilike(_col, pattern) {
              calls.push(pattern);
              return {
                limit() {
                  if (pattern.includes('Ramiro')) {
                    return {
                      data: [
                        { id: 'a', name: 'Cervejaria Ramiro', address: 'x', home_city: { name: 'Lisboa' } },
                      ],
                      error: null,
                    };
                  }
                  return { data: [{ id: 'a', name: 'Cervejaria Ramiro', address: 'x', home_city: { name: 'Lisboa' } }], error: null };
                },
              };
            },
          };
        },
      };
    },
  };
  const rows = await recallRestaurantsByName(supabase, 'Ramiro');
  assert.ok(calls.length >= 1);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].city, 'Lisboa');
});

test('mapPool preserves order with concurrency', async () => {
  const out = await mapPool([1, 2, 3, 4, 5], 2, async (n) => n * 10);
  assert.deepEqual(out, [10, 20, 30, 40, 50]);
});
