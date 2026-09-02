/**
 * NL restaurant search: cheap input gates before LLM/RPC (empty query, provider, bbox, auth).
 */
import assert from 'node:assert/strict';
import { describe, mock, test } from 'node:test';

/** @type {object | null} */
let authUser = { id: '11111111-1111-4111-8111-111111111111' };
/** @type {{ tags: Array<{ slug: string }>, error: string | null }} */
let catalogResult = { tags: [{ slug: 'wine' }], error: null };
/** @type {(args: object) => Promise<object>} */
let mapPlanImpl = async () => {
  throw new Error('LLM should not run in gate tests');
};
/** @type {(args: object) => Promise<Array<object>>} */
let executeImpl = async () => [];
/** @type {(args: object) => Promise<Array<object>>} */
let lastResortImpl = async () => [];
const executeCalls = [];

mock.module('src/libs/supabase/supabase-server-client.js', {
  exports: {
    createSupabaseServerClient: async () => ({}),
    getSupabaseAuthUser: async () => ({
      data: { user: authUser },
      error: authUser ? null : new Error('no session'),
    }),
  },
});

mock.module('src/auth/actions/location-actions.js', {
  exports: {
    fetchRestaurantTagsCatalog: async () => catalogResult,
  },
});

mock.module('src/libs/sentry/sentry-service.js', {
  exports: {
    logInfo() {},
    logWarn() {},
    setUser() {},
    logError() {},
    setConversationId() {},
    setIsolationAttributes() {},
  },
});

mock.module('src/libs/restaurant-search/restaurant-search-agent.js', {
  exports: {
    mapUserQueryToSearchPlan: (args) => mapPlanImpl(args),
    executeSearchPlan: (args) => {
      executeCalls.push(args);
      return executeImpl(args);
    },
    fetchLastResortRestaurants: (args) => lastResortImpl(args),
  },
});

const { searchRestaurantsFromNaturalLanguage } = await import(
  '../actions/restaurant-search-agent-actions.js'
);

const empty = { restaurants: [], plan: null, error: 'empty_query', usedFallback: false };

describe('searchRestaurantsFromNaturalLanguage gates', { concurrency: false }, () => {
  test('empty / blank query', async () => {
    assert.deepEqual(
      await searchRestaurantsFromNaturalLanguage({
        query: '',
        scope: { type: 'locality', localityId: 'x' },
      }),
      empty
    );
    assert.deepEqual(
      await searchRestaurantsFromNaturalLanguage({
        query: '   ',
        scope: { type: 'locality', localityId: 'x' },
      }),
      empty
    );
    assert.deepEqual(
      await searchRestaurantsFromNaturalLanguage({
        query: null,
        scope: { type: 'locality', localityId: 'x' },
      }),
      empty
    );
  });

  test('provider not on the allowlist', async () => {
    const out = await searchRestaurantsFromNaturalLanguage({
      query: 'cozy wine bar',
      scope: { type: 'locality', localityId: 'x' },
      provider: 'not-a-model',
    });
    assert.equal(out.error, 'invalid_provider');
    assert.deepEqual(out.restaurants, []);
  });

  test('unauthorized without a session', async () => {
    authUser = null;
    const out = await searchRestaurantsFromNaturalLanguage({
      query: 'pasta',
      scope: { type: 'locality', localityId: 'x' },
    });
    assert.equal(out.error, 'unauthorized');
    authUser = { id: '11111111-1111-4111-8111-111111111111' };
  });

  test('missing locality id', async () => {
    authUser = { id: '11111111-1111-4111-8111-111111111111' };
    const out = await searchRestaurantsFromNaturalLanguage({
      query: 'pasta',
      scope: { type: 'locality', localityId: '' },
    });
    assert.equal(out.error, 'missing_locality');
  });

  test('invalid bbox (non-finite, inverted, out of range)', async () => {
    authUser = { id: '11111111-1111-4111-8111-111111111111' };
    const bad = [
      { west: NaN, south: 38, east: -9, north: 39 },
      { west: -9, south: 39, east: -8, north: 38 },
      { west: -181, south: 38, east: -8, north: 39 },
      { west: -9, south: 38, east: -9, north: 39 },
    ];
    for (const bbox of bad) {
      const out = await searchRestaurantsFromNaturalLanguage({
        query: 'pasta',
        scope: { type: 'bbox', ...bbox },
      });
      assert.equal(out.error, 'invalid_bbox', JSON.stringify(bbox));
    }
  });

  test('catalog miss falls back to last-resort restaurants', async () => {
    catalogResult = { tags: [], error: null };
    lastResortImpl = async () => [{ id: 'r1', name: 'Nearby' }];
    const out = await searchRestaurantsFromNaturalLanguage({
      query: 'pasta',
      scope: { type: 'locality', localityId: 'x' },
    });
    assert.equal(out.error, null);
    assert.equal(out.usedFallback, true);
    assert.equal(out.restaurants[0].id, 'r1');
    catalogResult = { tags: [{ slug: 'wine' }], error: null };
  });

  test('happy path returns the plan and scoped matches', async () => {
    executeCalls.length = 0;
    const plan = { includeTags: ['wine'] };
    mapPlanImpl = async () => plan;
    executeImpl = async () => [{ id: 'r2', name: 'Wine bar' }];
    const out = await searchRestaurantsFromNaturalLanguage({
      query: 'cozy wine bar',
      scope: { type: 'locality', localityId: 'lisboa' },
      provider: 'openai',
    });
    assert.equal(out.error, null);
    assert.equal(out.usedFallback, false);
    assert.equal(out.plan, plan);
    assert.equal(out.restaurants[0].name, 'Wine bar');
    assert.equal(executeCalls.length, 1);
  });

  test('widens to fallback bbox when the primary scope is too sparse', async () => {
    executeCalls.length = 0;
    mapPlanImpl = async () => ({ includeTags: ['wine'] });
    executeImpl = async ({ scope }) => {
      if (scope.type === 'bbox' && scope.west === -9.2) {
        return [{ id: 'tight' }];
      }
      return [
        { id: 'a' },
        { id: 'b' },
        { id: 'c' },
        { id: 'd' },
        { id: 'e' },
      ];
    };
    const out = await searchRestaurantsFromNaturalLanguage({
      query: 'wine',
      scope: { type: 'bbox', west: -9.2, south: 38.7, east: -9.1, north: 38.8 },
      fallbackScope: { type: 'bbox', west: -9.5, south: 38.6, east: -8.9, north: 39.1 },
    });
    assert.equal(out.error, null);
    assert.equal(out.usedFallback, false);
    assert.equal(out.restaurants.length, 5);
    assert.equal(executeCalls.length, 2);
  });

  test('empty matches recover via last-resort fallback', async () => {
    mapPlanImpl = async () => ({ includeTags: ['wine'] });
    executeImpl = async () => [];
    lastResortImpl = async () => [{ id: 'fallback' }];
    const out = await searchRestaurantsFromNaturalLanguage({
      query: 'unicorn tapas',
      scope: { type: 'locality', localityId: 'x' },
    });
    assert.equal(out.error, null);
    assert.equal(out.usedFallback, true);
    assert.equal(out.restaurants[0].id, 'fallback');
  });
});
