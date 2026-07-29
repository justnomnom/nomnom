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
        user_id: 'user',
      }),
      'sub'
    );
    assert.equal(
      resolveServerAnalyticsDistinctId({
        buyer_user_id: 'buyer',
        user_id: 'user',
      }),
      'buyer'
    );
    assert.equal(resolveServerAnalyticsDistinctId({ user_id: 'user' }), 'user');
  });

  test('uses list_id before explicit fallback', () => {
    assert.equal(
      resolveServerAnalyticsDistinctId({ list_id: 'list' }, 'explicit'),
      'list'
    );
    assert.equal(resolveServerAnalyticsDistinctId({}, 'explicit'), 'explicit');
  });

  test('trims and ignores empty strings', () => {
    assert.equal(
      resolveServerAnalyticsDistinctId({ user_id: '  ', list_id: '  list  ' }),
      'list'
    );
  });

  test('falls back to server when nothing usable is present', () => {
    assert.equal(resolveServerAnalyticsDistinctId({}), 'server');
    assert.equal(resolveServerAnalyticsDistinctId({ user_id: 42 }), 'server');
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
