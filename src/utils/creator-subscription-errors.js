const PREFIX = 'pages.dashboard.settings.my_subscriptions.error_';

/** Creator subscription action/load error codes → `pages.dashboard.settings.my_subscriptions.*` keys */
export const CREATOR_SUBSCRIPTION_ERROR_I18N = {
  unauthorized: `${PREFIX}unauthorized`,
  load_failed: `${PREFIX}load_failed`,
  stripe_not_configured: `${PREFIX}stripe_not_configured`,
  invalid_id: `${PREFIX}invalid_id`,
  not_found: `${PREFIX}not_found`,
  forbidden: `${PREFIX}forbidden`,
  not_cancellable: `${PREFIX}not_cancellable`,
  invalid_row: `${PREFIX}invalid_row`,
  stripe_cancel_failed: `${PREFIX}stripe_cancel_failed`,
  // Billing portal (POST /api/stripe/billing-portal) shares this surface's error display.
  invalid_json: `${PREFIX}generic`,
  portal_session_failed: `${PREFIX}portal_session_failed`,
};

const CREATOR_SUBSCRIPTION_ERROR_GENERIC = `${PREFIX}generic`;

/** Maps creator subscription action/load error codes to localized user-facing copy. */
export function translateCreatorSubscriptionError(t, code) {
  const key = CREATOR_SUBSCRIPTION_ERROR_I18N[code] || CREATOR_SUBSCRIPTION_ERROR_GENERIC;
  return t(key);
}
