'use client';

import PropTypes from 'prop-types';
import React, { useRef, useMemo, useContext, createContext } from 'react';

import { gtmUtils } from 'src/libs/gtm/gtm-utils';
import { useAnalytics as usePostHogAnalytics } from 'src/libs/posthog/posthog-provider';
import { applyAnalyticsSchemaGuardrails as applySchemaGuardrails } from 'src/libs/analytics/event-schemas';

// Create Analytics context
const AnalyticsContext = createContext(null);

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
