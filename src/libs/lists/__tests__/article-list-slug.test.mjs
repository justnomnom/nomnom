/**
 * Run: node --test src/libs/lists/__tests__/article-list-slug.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mintListSlug } from '../article-list-slug.js';

test('mintListSlug returns existing slug without writing', async () => {
  const calls = [];
  const supabase = {
    from(table) {
      calls.push(table);
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({
                  data: { id: 'l1', user_id: 'u1', name: 'Weekend', slug: 'weekend' },
                  error: null,
                }),
              };
            },
          };
        },
      };
    },
  };
  const result = await mintListSlug(supabase, 'l1');
  assert.equal(result.slug, 'weekend');
  assert.equal(result.error, null);
});

test('mintListSlug suffixes when base is taken', async () => {
  let updated = null;
  const supabase = {
    from(table) {
      if (table === 'lists') {
        return {
          select(cols) {
            if (cols === 'id, user_id, name, slug') {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: { id: 'l1', user_id: 'u1', name: 'Weekend Tables!', slug: null },
                      error: null,
                    }),
                  };
                },
              };
            }
            return {
              eq() {
                return {
                  like: async () => ({
                    data: [{ slug: 'weekend-tables' }],
                    error: null,
                  }),
                };
              },
            };
          },
          update(payload) {
            updated = payload;
            return {
              eq: async () => ({ error: null }),
            };
          },
        };
      }
      return {};
    },
  };
  const result = await mintListSlug(supabase, 'l1');
  assert.equal(result.slug, 'weekend-tables-2');
  assert.equal(updated.slug, 'weekend-tables-2');
});
