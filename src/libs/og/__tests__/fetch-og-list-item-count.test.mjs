/**
 * OG list item count never throws; blank ids and missing Supabase config return 0.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fetchOgListItemCount } from '../fetch-og-list-item-count.js';

test('fetchOgListItemCount: non-string / blank id → 0 without querying', async () => {
  assert.equal(await fetchOgListItemCount(null), 0);
  assert.equal(await fetchOgListItemCount(''), 0);
  assert.equal(await fetchOgListItemCount(12), 0);
});
