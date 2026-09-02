/**
 * Product analytics event contracts. Required props must be non-empty (not null/undefined/'').
 * Keep this module React-free so Node unit tests can lock the catalog.
 */

export const ANALYTICS_EVENT_SCHEMAS = {
  signup_started: { required: ['source'] },
  signup_completed: { required: ['method'] },
  signup_form_viewed: { required: [] },
  signup_form_started: { required: ['source'] },
  signup_field_blurred: { required: ['field'] },
  signup_verify_viewed: { required: ['flow'] },
  signup_session_ready: { required: ['method'] },
  password_reset_completed: { required: [] },
  live_list_checkout_started: { required: ['list_id'] },
  live_list_checkout_failed: { required: ['list_id', 'error_code'] },
  live_list_checkout_redirected: { required: ['list_id'] },
  snapshot_checkout_started: { required: ['list_id'] },
  snapshot_checkout_failed: { required: ['list_id', 'error_code'] },
  snapshot_checkout_redirected: { required: ['list_id'] },
  list_checkout_returned: { required: ['list_id', 'checkout_status'] },
  snapshot_checkout_verified: { required: ['list_id'] },
  snapshot_checkout_verify_failed: { required: ['list_id'] },
  creator_checkout_returned: { required: ['creator_id', 'checkout_status'] },
  creator_subscription_checkout_started: { required: ['creator_id', 'list_id', 'viewer_id'] },
  creator_subscription_checkout_failed: { required: ['creator_id', 'list_id', 'error_code'] },
  creator_subscription_checkout_redirected: { required: ['creator_id', 'list_id', 'viewer_id'] },
  creator_subscription_cancel_started: { required: ['creator_id', 'subscription_row_id'] },
  creator_subscription_cancel_failed: { required: ['creator_id', 'subscription_row_id'] },
  creator_subscription_cancel_completed: { required: ['creator_id', 'subscription_row_id'] },
  creator_follow_toggled: { required: ['creator_id', 'follow'] },
  creator_follow_toggle_failed: { required: ['creator_id', 'follow'] },
  discover_ai_search_submitted: { required: ['query_length'] },
  discover_search_ai_changed: { required: ['mode'] },
  discover_search_suggestion_picked: { required: ['restaurant_id'] },
  discover_feed_load_more: { required: ['next_limit'] },
  discover_vibe_opened_map: { required: ['vibe_key'] },
  discover_map_filters_opened: { required: [] },
  discover_market_changed: { required: ['market_id'] },
  discover_market_change_failed: { required: ['market_id'] },
  map_chip_selected: { required: ['chip'] },
  map_ai_search_submitted: { required: ['query_length', 'sort_mode'] },
  map_ai_search_failed: { required: ['sort_mode'] },
  map_ai_search_completed: { required: ['results_count', 'sort_mode'] },
  map_filters_updated: { required: ['selected_tag_count', 'min_rating', 'sort_mode'] },
  map_marker_selected: { required: ['restaurant_id'] },
  map_list_spot_selected: { required: ['restaurant_id'] },
  map_marker_deselected: { required: ['restaurant_id'] },
  map_list_spot_deselected: { required: ['restaurant_id'] },
  map_more_filters_opened: { required: [] },
  map_search_this_area_tapped: { required: [] },
  map_search_suggestion_picked: { required: ['restaurant_id'] },
  map_search_location_picked: { required: ['locality_id'] },
  map_search_ai_changed: { required: ['mode'] },
  discover_market_from_location_failed: { required: [] },
  discover_market_from_location_updated: { required: [] },
  discover_market_from_location_denied: { required: [] },
  live_list_cta_clicked: { required: ['list_id'] },
  snapshot_cta_clicked: { required: ['list_id'] },
  freemium_paywall_shown: { required: ['list_id'] },
  creator_follow_login_redirected: { required: ['creator_id'] },
  homepage_view_dashboard: { required: [] },
  homepage_start_plan_generation: { required: [] },
  homepage_signup_cta: { required: [] },
  onboarding_step_viewed: { required: ['step', 'step_key'] },
  onboarding_completed: { required: ['path', 'from_step'] },
  list_viewed: { required: ['list_id'] },
  creator_profile_viewed: { required: ['creator_id'] },
  list_share_copied: { required: ['list_id'] },
  table_started: { required: ['table_id', 'list_id'] },
  table_share_copied: { required: ['table_id'] },
  table_open: { required: ['table_id'] },
  table_named: { required: ['table_id'] },
  table_place_added: { required: ['table_id', 'restaurant_id'] },
  table_vote_cast: { required: ['table_id', 'restaurant_id', 'vote'] },
  table_result_shown: { required: ['table_id', 'restaurant_id'] },
  table_result_locked: { required: ['table_id'] },
  table_result_reply_shared: { required: ['table_id', 'restaurant_id'] },
  discover_promo_clicked: { required: ['promo'] },
  table_hint_shown: { required: [] },
  table_hint_dismissed: { required: [] },
  list_created: { required: ['list_id'] },
  list_details_saved: { required: ['list_id'] },
  list_visibility_changed: { required: ['list_id', 'visibility'] },
  list_deleted: { required: ['list_id'] },
  list_place_removed: { required: ['list_id', 'restaurant_id'] },
  restaurant_detail_viewed: { required: ['restaurant_id', 'surface'] },
  restaurant_feed_impression: { required: ['restaurant_id'] },
  restaurant_maps_clicked: { required: ['restaurant_id', 'surface'] },
  restaurant_phone_clicked: { required: ['restaurant_id', 'surface'] },
  restaurant_photo_viewed: { required: ['restaurant_id', 'surface'] },
  restaurant_share_clicked: { required: ['restaurant_id', 'surface'] },
  restaurant_save_intent: { required: ['restaurant_id'] },
  restaurant_saved: { required: ['restaurant_id'] },
  restaurant_unsaved: { required: ['restaurant_id'] },
  roulette_spin_started: { required: [] },
  roulette_spin_completed: { required: ['restaurant_id'] },
  roulette_spin_empty_pool: { required: [] },
  tool_signup_click: { required: ['source'] },
  account_deletion_started: { required: [] },
  account_deletion_completed: { required: [] },
  account_deletion_failed: { required: [] },
  profile_updated: { required: [] },
  profile_update_failed: { required: ['reason'] },
  avatar_uploaded: { required: [] },
  avatar_removed: { required: [] },
  avatar_upload_failed: { required: ['reason'] },
  appearance_mode_changed: { required: ['mode'] },
  tag_preferences_saved: { required: ['selected_count'] },
  tag_preferences_save_failed: { required: [] },
  stripe_connect_started: { required: ['status'] },
  stripe_connect_failed: { required: [] },
  saved_view_opened: { required: [] },
  saved_filter_changed: { required: ['filter'] },
  feedback_opened: { required: [] },
  notification_open: { required: [] },
  notification_click: { required: ['type'] },
};

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isMissingRequiredProperty(value) {
  return (
    value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
  );
}

/**
 * Marks events that omit required properties instead of dropping them.
 *
 * @param {string} eventName
 * @param {Record<string, unknown>} properties
 * @returns {Record<string, unknown>}
 */
export function applyAnalyticsSchemaGuardrails(eventName, properties) {
  const schema = ANALYTICS_EVENT_SCHEMAS[eventName];
  if (!schema?.required?.length) return properties;

  const missing = schema.required.filter((key) => isMissingRequiredProperty(properties[key]));
  if (!missing.length) return properties;

  if (process.env.NODE_ENV === 'development') {
    console.warn(`[analytics] missing required props for "${eventName}": ${missing.join(', ')}`);
  }

  return {
    ...properties,
    _schema_missing_required: missing.join(','),
  };
}
