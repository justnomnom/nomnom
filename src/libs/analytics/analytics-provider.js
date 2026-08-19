'use client';

import PropTypes from 'prop-types';
import React, { useRef, useMemo, useContext, createContext } from 'react';

import { gtmUtils } from 'src/libs/gtm/gtm-utils';
import { useAnalytics as usePostHogAnalytics } from 'src/libs/posthog/posthog-provider';

// Create Analytics context
const AnalyticsContext = createContext(null);

const EVENT_SCHEMAS = {
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
  // Discover AI search now hands the query off to the Map (which runs the search and emits the
  // `map_ai_search_*` events). `home_locality_id` is optional here since a query can be submitted
  // before a home market resolves; the `*_failed`/`*_completed` discover variants are no longer
  // emitted from this surface.
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
  // Discover location events
  discover_market_from_location_failed: { required: [] },
  discover_market_from_location_updated: { required: [] },
  discover_market_from_location_denied: { required: [] },
  // Checkout CTAs and paywall
  live_list_cta_clicked: { required: ['list_id'] },
  snapshot_cta_clicked: { required: ['list_id'] },
  freemium_paywall_shown: { required: ['list_id'] },
  // Creator
  creator_follow_login_redirected: { required: ['creator_id'] },
  // Homepage CTAs
  homepage_view_dashboard: { required: [] },
  homepage_start_plan_generation: { required: [] },
  homepage_signup_cta: { required: [] },
  // Onboarding
  onboarding_step_viewed: { required: ['step', 'step_key'] },
  onboarding_completed: { required: ['path', 'from_step'] },
  // Page views
  list_viewed: { required: ['list_id'] },
  creator_profile_viewed: { required: ['creator_id'] },
  // Sharing the list itself (no Table involved yet).
  list_share_copied: { required: ['list_id'] },
  /**
   * Table — one funnel now that Share → Decide and Plan Tonight are the same object:
   * started → share_copied → open → vote_cast → result_locked. Everything keys off
   * `table_id`; `list_id` is only guaranteed at start time, so it is never required.
   */
  table_started: { required: ['table_id', 'list_id'] },
  table_share_copied: { required: ['table_id'] },
  table_open: { required: ['table_id'] },
  table_named: { required: ['table_id'] },
  table_place_added: { required: ['table_id', 'restaurant_id'] },
  table_vote_cast: { required: ['table_id', 'restaurant_id', 'vote'] },
  table_result_shown: { required: ['table_id', 'restaurant_id'] },
  table_result_locked: { required: ['table_id'] },
  table_result_reply_shared: { required: ['table_id', 'restaurant_id'] },
  // Discover feature promos (Table / Roulette)
  discover_promo_clicked: { required: ['promo'] },
  // Landing half of the Table promo: `?table=1` sends users to the lists hub, which can
  // only point at the next step. Without these, the funnel is measurable at the click and
  // blind at the destination.
  table_hint_shown: { required: [] },
  table_hint_dismissed: { required: [] },
  // List management
  list_created: { required: ['list_id'] },
  list_details_saved: { required: ['list_id'] },
  list_visibility_changed: { required: ['list_id', 'visibility'] },
  list_deleted: { required: ['list_id'] },
  list_place_removed: { required: ['list_id', 'restaurant_id'] },
  // Restaurant
  restaurant_detail_viewed: { required: ['restaurant_id', 'surface'] },
  restaurant_feed_impression: { required: ['restaurant_id'] },
  restaurant_maps_clicked: { required: ['restaurant_id', 'surface'] },
  restaurant_phone_clicked: { required: ['restaurant_id', 'surface'] },
  restaurant_photo_viewed: { required: ['restaurant_id', 'surface'] },
  restaurant_share_clicked: { required: ['restaurant_id', 'surface'] },
  restaurant_save_intent: { required: ['restaurant_id'] },
  restaurant_saved: { required: ['restaurant_id'] },
  restaurant_unsaved: { required: ['restaurant_id'] },
  // Roulette
  roulette_spin_started: { required: [] },
  roulette_spin_completed: { required: ['restaurant_id'] },
  roulette_spin_empty_pool: { required: [] },
  tool_signup_click: { required: ['source'] },
  // Settings: account deletion
  account_deletion_started: { required: [] },
  account_deletion_completed: { required: [] },
  account_deletion_failed: { required: [] },
  // Settings: profile
  profile_updated: { required: [] },
  profile_update_failed: { required: ['reason'] },
  avatar_uploaded: { required: [] },
  avatar_removed: { required: [] },
  avatar_upload_failed: { required: ['reason'] },
  // Settings: appearance / preferences / billing
  appearance_mode_changed: { required: ['mode'] },
  tag_preferences_saved: { required: ['selected_count'] },
  tag_preferences_save_failed: { required: [] },
  stripe_connect_started: { required: ['status'] },
  stripe_connect_failed: { required: [] },
  // Saved view
  saved_view_opened: { required: [] },
  saved_filter_changed: { required: ['filter'] },
  // Feedback
  feedback_opened: { required: [] },
  // Notifications
  notification_open: { required: [] },
  notification_click: { required: ['type'] },
};

const EVENT_DEDUPE_RULES = {
  map_filters_updated: { windowMs: 1500, samePayloadOnly: true },
};

function stableSerialize(value) {
  if (value == null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableSerialize(value[k])}`).join(',')}}`;
}

function stripUndefinedProperties(properties) {
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    return {};
  }
  const out = {};
  Object.entries(properties).forEach(([k, v]) => {
    if (v !== undefined) out[k] = v;
  });
  return out;
}

function isMissingRequiredProperty(value) {
  return (
    value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
  );
}

function applySchemaGuardrails(eventName, properties) {
  const schema = EVENT_SCHEMAS[eventName];
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

function shouldDedupeEvent(eventName, properties, dedupeStateMap) {
  const rule = EVENT_DEDUPE_RULES[eventName];
  if (!rule) return false;

  const now = Date.now();
  const cacheKey = rule.samePayloadOnly ? `${eventName}|${stableSerialize(properties)}` : eventName;
  const previousTs = dedupeStateMap.get(cacheKey);
  dedupeStateMap.set(cacheKey, now);

  dedupeStateMap.forEach((ts, k) => {
    if (now - ts > rule.windowMs * 3) dedupeStateMap.delete(k);
  });

  return typeof previousTs === 'number' && now - previousTs < rule.windowMs;
}

/**
 * Global Analytics Provider that combines PostHog, GTM, and Google Analytics tracking
 * Provides unified tracking functions that call all providers
 */
export function AnalyticsProvider({ children }) {
  const posthogAnalytics = usePostHogAnalytics();
  const gtmAnalytics = gtmUtils;
  const dedupeStateRef = useRef(new Map());

  const analytics = useMemo(
    () => ({
      // Form submission tracking - calls PostHog and GTM
      trackFormSubmit: (formName, properties = {}) => {
        // PostHog form tracking
        if (posthogAnalytics.trackPHFormSubmit) {
          posthogAnalytics.trackPHFormSubmit(formName, properties);
        }

        // GTM form tracking - delegate to provider (emits GA4 'form_submit')
        if (gtmAnalytics.trackFormSubmission) {
          gtmAnalytics.trackFormSubmission(formName, properties);
        }

        // GA removed; GTM handles GA via tags
      },

      // Error tracking — PostHog Error Tracking (`captureException`) + GTM
      trackError: (error, context = {}) => {
        if (posthogAnalytics.trackPHError) {
          posthogAnalytics.trackPHError(error, context);
        }

        // GTM: emit custom error event
        if (gtmAnalytics.trackGTMEvent) {
          gtmAnalytics.trackGTMEvent('error', {
            error_message: error?.message,
            error_stack: error?.stack,
            page_location: typeof window !== 'undefined' ? window.location.href : '',
            page_title: typeof window !== 'undefined' ? document.title : '',
            ...context,
          });
        }
      },

      // User authentication tracking - calls PostHog and GTM
      trackSignIn: (method, userId, properties = {}) => {
        // PostHog sign in tracking
        if (posthogAnalytics.trackPHSignIn) {
          posthogAnalytics.trackPHSignIn(method, userId);
        }

        // GTM: emit custom login event
        if (gtmAnalytics.trackGTMEvent) {
          gtmAnalytics.trackGTMEvent('login', {
            method,
            user_id: userId,
            page_location: typeof window !== 'undefined' ? window.location.href : '',
            page_title: typeof window !== 'undefined' ? document.title : '',
            ...properties,
          });
        }
      },

      // User sign out tracking - calls PostHog and GTM
      trackSignOut: (properties = {}) => {
        // PostHog sign out tracking
        if (posthogAnalytics.trackPHSignOut) {
          posthogAnalytics.trackPHSignOut();
        }

        // GTM: emit custom logout event
        if (gtmAnalytics.trackGTMEvent) {
          gtmAnalytics.trackGTMEvent('logout', {
            page_location: typeof window !== 'undefined' ? window.location.href : '',
            page_title: typeof window !== 'undefined' ? document.title : '',
            ...properties,
          });
        }
      },

      // User signup tracking - calls PostHog and GTM
      trackSignup: (source, properties = {}) => {
        // PostHog signup tracking (do not call identify with non-user IDs)
        if (posthogAnalytics.trackPH) {
          posthogAnalytics.trackPH('signup_started', {
            source,
            ...properties,
          });
        }

        // GTM signup click tracking - delegate to provider (emits GA4 'signup_click')
        if (gtmAnalytics.trackSignup) {
          gtmAnalytics.trackSignup(source, properties);
        }

        // GA removed; GTM handles GA via tags
      },

      // User signup completion - GA4 sign_up (requires 'method' param)
      trackSignupComplete: (method, properties = {}) => {
        // PostHog signup completion (do not identify using signup method)
        if (posthogAnalytics.trackPH) {
          posthogAnalytics.trackPH('signup_completed', {
            method,
            ...properties,
          });
        }

        // GTM: emit GA4 'sign_up' with required 'method' param
        if (gtmAnalytics.trackGTMEvent) {
          gtmAnalytics.trackGTMEvent('sign_up', {
            method,
            ...properties,
          });
        }
      },

      // Custom event tracking - calls PostHog and GTM
      trackEvent: (eventName, properties = {}) => {
        const sanitizedProperties = applySchemaGuardrails(
          eventName,
          stripUndefinedProperties(properties)
        );
        if (shouldDedupeEvent(eventName, sanitizedProperties, dedupeStateRef.current)) {
          return;
        }

        // PostHog custom event tracking
        if (posthogAnalytics.trackPH) {
          posthogAnalytics.trackPH(eventName, sanitizedProperties);
        }

        // GTM custom event tracking
        if (gtmAnalytics.trackGTMEvent) {
          gtmAnalytics.trackGTMEvent(eventName, sanitizedProperties);
        }

        // GA removed; GTM handles GA via tags
      },

      // User identification - PostHog specific
      identifyUser: (userId, properties = {}) => {
        if (posthogAnalytics.identifyPH) {
          posthogAnalytics.identifyPH(userId, properties);
        }
      },

      // User properties - PostHog specific
      setUserProperties: (properties) => {
        if (posthogAnalytics.setPHUserProperties) {
          posthogAnalytics.setPHUserProperties(properties);
        }
      },

      // Reset user - PostHog specific
      resetUser: () => {
        if (posthogAnalytics.resetPH) {
          posthogAnalytics.resetPH();
        }
      },

      // Feature flags - PostHog specific
      getFeatureFlag: (flagName) => {
        if (posthogAnalytics.getPHFeatureFlag) {
          return posthogAnalytics.getPHFeatureFlag(flagName);
        }
        return false;
      },

      // Groups - PostHog specific (creator / list / etc.)
      setGroup: (groupType, groupKey, groupProperties = {}) => {
        if (posthogAnalytics.setPHGroup) {
          posthogAnalytics.setPHGroup(groupType, groupKey, groupProperties);
        }
      },

      // Utility functions
      isInitialized: () => {
        const posthogInitialized = posthogAnalytics.isPHInitialized
          ? posthogAnalytics.isPHInitialized()
          : false;
        const gtmEnabled = gtmAnalytics.isEnabled || false;
        return { posthog: posthogInitialized, gtm: gtmEnabled };
      },

      // Get individual provider instances for advanced usage
      getPostHogInstance: () =>
        posthogAnalytics.getPHInstance ? posthogAnalytics.getPHInstance() : null,
    }),
    [posthogAnalytics, gtmAnalytics]
  );

  return <AnalyticsContext.Provider value={analytics}>{children}</AnalyticsContext.Provider>;
}

AnalyticsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Custom hook to use global analytics
 * Provides unified tracking functions that work with PostHog, GTM, and Google Analytics
 */
export function useAnalytics() {
  const context = useContext(AnalyticsContext);

  if (!context) {
    console.warn('useAnalytics must be used within an AnalyticsProvider');
    // Return mock functions if provider is not found
    return {
      trackFormSubmit: () => {},
      trackError: () => {},
      trackSignIn: () => {},
      trackSignOut: () => {},
      trackSignup: () => {},
      trackSignupComplete: () => {},
      trackEvent: () => {},
      identifyUser: () => {},
      setUserProperties: () => {},
      resetUser: () => {},
      getFeatureFlag: () => false,
      setGroup: () => {},
      isInitialized: () => ({ posthog: false, gtm: false }),
      getPostHogInstance: () => null,
    };
  }

  return context;
}
