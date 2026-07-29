import Stripe from 'stripe';

/** @type {Stripe | null} */
let stripeSingleton = null;

/**
 * Server-only Stripe client. Returns null when `STRIPE_SECRET_KEY` is unset.
 * @returns {Stripe | null}
 */
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeSingleton) {
    // Pin to the API version bundled with this SDK (see Stripe.API_VERSION).
    stripeSingleton = new Stripe(key, { apiVersion: Stripe.API_VERSION });
  }
  return stripeSingleton;
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
