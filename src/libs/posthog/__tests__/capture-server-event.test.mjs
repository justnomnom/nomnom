import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  captureServerEvent,
  resolveServerAnalyticsDistinctId,
} from '../capture-server-event.js';

describe('resolveServerAnalyticsDistinctId', () => {
  test('prefers subscriber, then buyer, then user id', () => {
    assert.equal(
      resolveServerAnalyticsDistinctId({
        subscriber_user_id: 'sub',
        buyer_user_id: 'buyer',
        user_id: 'user-1',
      }).distinctId,
      'sub'
    );
    assert.equal(
      resolveServerAnalyticsDistinctId({
        buyer_user_id: 'buyer',
        user_id: 'user-1',
      }).distinctId,
      'buyer'
    );
    assert.equal(resolveServerAnalyticsDistinctId({ user_id: 'user-1' }).distinctId, 'user-1');
  });

  test('ignores list_id and uses explicit fallback when present', () => {
    const resolved = resolveServerAnalyticsDistinctId({ list_id: 'list' }, 'explicit-user');
    assert.equal(resolved.distinctId, 'explicit-user');
    assert.equal(resolved.processPersonProfile, true);
  });

  test('trims and ignores empty strings', () => {
    assert.equal(
      resolveServerAnalyticsDistinctId({ user_id: '  ', buyer_user_id: '  buyer  ' }).distinctId,
      'buyer'
    );
  });

  test('rejects pooled literals and falls back to unique anon id', () => {
    const resolved = resolveServerAnalyticsDistinctId({}, 'server');
    assert.match(resolved.distinctId, /^anon_/);
    assert.equal(resolved.processPersonProfile, false);

    const pooled = resolveServerAnalyticsDistinctId({ user_id: 'stripe_webhook' });
    assert.match(pooled.distinctId, /^anon_/);
    assert.equal(pooled.processPersonProfile, false);
  });

  test('never uses list_id as distinct_id', () => {
    const resolved = resolveServerAnalyticsDistinctId({ list_id: 'list-only' });
    assert.notEqual(resolved.distinctId, 'list-only');
    assert.match(resolved.distinctId, /^anon_/);
  });
});

describe('captureServerEvent', () => {
  test('no-ops without throwing when PostHog integration flag is off', async () => {
    const previousFetch = globalThis.fetch;
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return new Response('{}', { status: 200 });
    };

    try {
      const attempted = await captureServerEvent('snapshot_checkout_redirected', {
        list_id: 'list-1',
        user_id: 'user-1',
      });
      assert.equal(attempted, false);
      assert.equal(fetchCalled, false);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  test('rejects empty event names without throwing', async () => {
    assert.equal(await captureServerEvent(''), false);
    assert.equal(await captureServerEvent('   '), false);
  });
});
