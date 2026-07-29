import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translateCreatorSubscriptionError } from '../creator-subscription-errors.js';

const t = (key) => key;

test('maps known creator subscription error codes', () => {
  assert.equal(
    translateCreatorSubscriptionError(t, 'not_cancellable'),
    'pages.dashboard.settings.my_subscriptions.error_not_cancellable'
  );
  assert.equal(
    translateCreatorSubscriptionError(t, 'stripe_cancel_failed'),
    'pages.dashboard.settings.my_subscriptions.error_stripe_cancel_failed'
  );
});

test('unknown creator subscription codes use generic fallback', () => {
  assert.equal(
    translateCreatorSubscriptionError(t, 'unknown_code'),
    'pages.dashboard.settings.my_subscriptions.error_generic'
  );
});

test('empty code uses generic fallback', () => {
  assert.equal(
    translateCreatorSubscriptionError(t, null),
    'pages.dashboard.settings.my_subscriptions.error_generic'
  );
});
