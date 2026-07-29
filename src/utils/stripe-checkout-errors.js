/** `/api/stripe/checkout/list` error codes → `pages.lists.*` keys */
export const STRIPE_CHECKOUT_ERROR_I18N = {
  invalid_list_id: 'pages.lists.paid_checkout_error_invalid_list_id',
  missing_list_id: 'pages.lists.paid_checkout_error_missing_list_id',
  invalid_json: 'pages.lists.paid_checkout_error_invalid_json',
  unauthorized: 'pages.lists.paid_checkout_error_unauthorized',
  list_load_failed: 'pages.lists.paid_checkout_error_list_load_failed',
  list_not_monetized: 'pages.lists.paid_checkout_error_list_not_monetized',
  owner_load_failed: 'pages.lists.paid_checkout_error_owner_load_failed',
  creator_not_ready: 'pages.lists.paid_checkout_error_creator_not_ready',
  cannot_subscribe_own_list: 'pages.lists.paid_checkout_error_cannot_subscribe_own_list',
  already_subscribed: 'pages.lists.paid_checkout_error_already_subscribed',
  checkout_session_failed: 'pages.lists.paid_checkout_error_checkout_session_failed',
  no_session_url: 'pages.lists.paid_checkout_error_no_session_url',
  stripe_not_configured: 'pages.lists.paid_checkout_error_stripe_not_configured',
  checkout_failed: 'pages.lists.paid_checkout_error_generic',
  already_purchased: 'pages.lists.paid_checkout_error_already_purchased',
};

/** Maps Stripe list checkout API error codes to localized user-facing copy. */
export function translateStripeCheckoutError(t, code) {
  const key = STRIPE_CHECKOUT_ERROR_I18N[code] || 'pages.lists.paid_checkout_error_generic';
  return t(key);
}
