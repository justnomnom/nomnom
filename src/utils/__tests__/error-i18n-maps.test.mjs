import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CREATOR_SUBSCRIPTION_ERROR_I18N,
  translateCreatorSubscriptionError,
} from '../creator-subscription-errors.js';
import {
  STRIPE_CHECKOUT_ERROR_I18N,
  translateStripeCheckoutError,
} from '../stripe-checkout-errors.js';

const t = (key) => key;

test('translateCreatorSubscriptionError: known codes + generic fallback', () => {
  for (const [code, key] of Object.entries(CREATOR_SUBSCRIPTION_ERROR_I18N)) {
    assert.equal(translateCreatorSubscriptionError(t, code), key);
  }
  assert.equal(
    translateCreatorSubscriptionError(t, 'totally_unknown'),
    'pages.dashboard.settings.my_subscriptions.error_generic'
  );
  assert.equal(
    translateCreatorSubscriptionError(t, null),
    'pages.dashboard.settings.my_subscriptions.error_generic'
  );
});

test('translateStripeCheckoutError: known codes + generic fallback', () => {
  for (const [code, key] of Object.entries(STRIPE_CHECKOUT_ERROR_I18N)) {
    assert.equal(translateStripeCheckoutError(t, code), key);
  }
  assert.equal(
    translateStripeCheckoutError(t, 'mystery'),
    'pages.lists.paid_checkout_error_generic'
  );
  assert.equal(
    translateStripeCheckoutError(t, undefined),
    'pages.lists.paid_checkout_error_generic'
  );
});
