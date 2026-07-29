import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translateStripeCheckoutError } from '../stripe-checkout-errors.js';

const t = (key) => key;

test('maps known Stripe checkout error codes', () => {
  assert.equal(
    translateStripeCheckoutError(t, 'already_subscribed'),
    'pages.lists.paid_checkout_error_already_subscribed'
  );
  assert.equal(
    translateStripeCheckoutError(t, 'creator_not_ready'),
    'pages.lists.paid_checkout_error_creator_not_ready'
  );
});

test('unknown Stripe checkout codes use generic fallback', () => {
  assert.equal(
    translateStripeCheckoutError(t, 'unknown_code'),
    'pages.lists.paid_checkout_error_generic'
  );
});
