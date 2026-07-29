import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  SUPABASE_DEFAULT_PAGE_SIZE,
  fetchAllSupabasePages,
} from '../supabase-fetch-all-pages.js';

test('SUPABASE_DEFAULT_PAGE_SIZE is 1000', () => {
  assert.equal(SUPABASE_DEFAULT_PAGE_SIZE, 1000);
});

test('fetchAllSupabasePages: single short page returns as-is', async () => {
  const calls = [];
  const rows = await fetchAllSupabasePages(async (from, pageSize) => {
    calls.push({ from, pageSize });
    return ['a', 'b'];
  }, 10);
  assert.deepEqual(rows, ['a', 'b']);
  assert.deepEqual(calls, [{ from: 0, pageSize: 10 }]);
});

test('fetchAllSupabasePages: empty first page', async () => {
  const rows = await fetchAllSupabasePages(async () => [], 5);
  assert.deepEqual(rows, []);
});

test('fetchAllSupabasePages: concatenates full pages until short page', async () => {
  const pages = {
    0: [1, 2, 3],
    3: [4, 5, 6],
    6: [7],
  };
  const rows = await fetchAllSupabasePages(async (from) => pages[from] ?? [], 3);
  assert.deepEqual(rows, [1, 2, 3, 4, 5, 6, 7]);
});

test('fetchAllSupabasePages: uses default page size when omitted', async () => {
  let seen;
  await fetchAllSupabasePages(async (from, pageSize) => {
    seen = pageSize;
    return [];
  });
  assert.equal(seen, SUPABASE_DEFAULT_PAGE_SIZE);
});
