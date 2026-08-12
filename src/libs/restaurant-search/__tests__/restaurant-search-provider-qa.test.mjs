/**
 * Frontend QA — restaurant search AI provider resolution.
 */
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { resolveRestaurantSearchProvider } from '../restaurant-search-llm.js';

let saved;
beforeEach(() => {
  saved = process.env.RESTAURANT_SEARCH_AI_PROVIDER;
  delete process.env.RESTAURANT_SEARCH_AI_PROVIDER;
});
afterEach(() => {
  if (saved !== undefined) process.env.RESTAURANT_SEARCH_AI_PROVIDER = saved;
  else delete process.env.RESTAURANT_SEARCH_AI_PROVIDER;
});

test('defaults to openai when env unset', () => {
  assert.equal(resolveRestaurantSearchProvider(null), 'openai');
  assert.equal(resolveRestaurantSearchProvider(undefined), 'openai');
});

test('honors allowed override over env', () => {
  process.env.RESTAURANT_SEARCH_AI_PROVIDER = 'anthropic';
  assert.equal(resolveRestaurantSearchProvider('qwen'), 'qwen');
  assert.equal(resolveRestaurantSearchProvider('google'), 'google');
});

test('invalid override falls back to env, then openai', () => {
  process.env.RESTAURANT_SEARCH_AI_PROVIDER = 'google';
  assert.equal(resolveRestaurantSearchProvider('nope'), 'google');
  process.env.RESTAURANT_SEARCH_AI_PROVIDER = 'invalid-env';
  assert.equal(resolveRestaurantSearchProvider(null), 'openai');
});
