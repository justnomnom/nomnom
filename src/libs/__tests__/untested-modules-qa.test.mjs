/**
 * Dedicated coverage for previously untested / filename-orphan modules.
 */
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { isValidAuthReturnPath } from '../../utils/auth-return-path.js';
import { normalizeListVisibility } from '../lists/list-visibility.js';
import { dedupeMapDropdownLists } from '../lists/dedupe-map-dropdown-lists.js';
import {
  resolveRestaurantSearchProvider,
  RESTAURANT_SEARCH_AI_PROVIDERS,
} from '../restaurant-search/restaurant-search-llm.js';
import { getSupabaseAuthCookiePrefix } from '../supabase/supabase-cookie-helpers.js';
import { htmlLangFromUiLocaleCookie, UI_LOCALE_COOKIE } from '../ui-locale.js';
import { isValidTagSlug, buildSlugToIdMap, resolveTagIds } from '../restaurant-ingest/about-tags-ai.js';
import { signatureDishLabelsFromConsensus } from '../restaurant-ingest/signature-dish-labels.js';

test('auth-return-path: relative ok; open redirect blocked', () => {
  assert.equal(isValidAuthReturnPath('/lists/x'), true);
  assert.equal(isValidAuthReturnPath('//evil'), false);
  assert.equal(isValidAuthReturnPath('https://x'), false);
  assert.equal(isValidAuthReturnPath(null), false);
});

test('list-visibility: unknown → private', () => {
  assert.equal(normalizeListVisibility('public'), 'public');
  assert.equal(normalizeListVisibility('nope'), 'private');
  assert.equal(normalizeListVisibility(null), 'private');
});

test('dedupe-map-dropdown-lists: non-array → []; dedupes string ids', () => {
  assert.deepEqual(dedupeMapDropdownLists(null), []);
  assert.deepEqual(
    dedupeMapDropdownLists([{ id: 1 }, { id: '1' }, { id: 2 }]).map((l) => l.id),
    ['1', '2']
  );
});

let savedProvider;
beforeEach(() => {
  savedProvider = process.env.RESTAURANT_SEARCH_AI_PROVIDER;
  delete process.env.RESTAURANT_SEARCH_AI_PROVIDER;
});
afterEach(() => {
  if (savedProvider === undefined) delete process.env.RESTAURANT_SEARCH_AI_PROVIDER;
  else process.env.RESTAURANT_SEARCH_AI_PROVIDER = savedProvider;
});

test('restaurant-search-llm: provider allowlist + fallback', () => {
  assert.ok(RESTAURANT_SEARCH_AI_PROVIDERS.includes('openai'));
  assert.equal(resolveRestaurantSearchProvider(null), 'openai');
  assert.equal(resolveRestaurantSearchProvider('anthropic'), 'anthropic');
  assert.equal(resolveRestaurantSearchProvider('bogus'), 'openai');
});

test('supabase-cookie-helpers + ui-locale: SSR defaults', () => {
  assert.equal(getSupabaseAuthCookiePrefix('https://proj.supabase.co'), 'sb-proj-');
  assert.equal(htmlLangFromUiLocaleCookie('pt'), 'pt');
  assert.equal(UI_LOCALE_COOKIE, 'ui_locale');
});

test('about-tags-ai pure helpers still wired', () => {
  assert.equal(isValidTagSlug('ramen'), true);
  const map = buildSlugToIdMap([{ id: '1', slug: 'ramen' }]);
  assert.deepEqual(resolveTagIds(map, ['ramen', 'x']), ['1']);
});

test('sync-signature re-export labels: empty consensus', () => {
  assert.deepEqual(signatureDishLabelsFromConsensus(null), []);
});
