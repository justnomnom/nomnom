import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import {
  resolveRestaurantSearchProvider,
  RESTAURANT_SEARCH_AI_PROVIDERS,
  getRestaurantSearchLanguageModel,
} from '../restaurant-search-llm.js';

let saved;
beforeEach(() => {
  saved = {
    RESTAURANT_SEARCH_AI_PROVIDER: process.env.RESTAURANT_SEARCH_AI_PROVIDER,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };
  delete process.env.RESTAURANT_SEARCH_AI_PROVIDER;
  delete process.env.OPENAI_API_KEY;
});
afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

test('resolveRestaurantSearchProvider: allowlist', () => {
  assert.deepEqual([...RESTAURANT_SEARCH_AI_PROVIDERS].sort(), [
    'anthropic',
    'google',
    'openai',
    'qwen',
  ]);
  assert.equal(resolveRestaurantSearchProvider('google'), 'google');
  assert.equal(resolveRestaurantSearchProvider('nope'), 'openai');
});

test('getRestaurantSearchLanguageModel: openai requires key', () => {
  assert.throws(() => getRestaurantSearchLanguageModel({ providerOverride: 'openai' }), /OPENAI/);
});

test('getRestaurantSearchLanguageModel: qwen unsupported via SDK path', () => {
  assert.throws(() => getRestaurantSearchLanguageModel({ providerOverride: 'qwen' }), /Unsupported/);
});
