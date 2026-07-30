'use client';

import PropTypes from 'prop-types';
import React, { useState, useEffect, useContext, createContext } from 'react';

import {
  setGroup,
  resetUser,
  trackEvent,
  initPostHog,
  identifyUser,
  getFeatureFlag,
  getPostHogClient,
  setUserProperties,
  captureException,
} from 'src/libs/posthog/posthog-service';

// Create PostHog context
const PostHogContext = createContext(null);

// PostHog Provider component
export function PostHogProvider({ children }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize PostHog on client-side only
    if (typeof window !== 'undefined') {
      initPostHog();
      setIsInitialized(true);
    }
  }, []);

  const analytics = React.useMemo(
    () => ({
      // Core tracking functions
      trackPH: trackEvent,
      identifyPH: identifyUser,
      resetPH: resetUser,
      setPHUserProperties: setUserProperties,
      getPHFeatureFlag: getFeatureFlag,
      setPHGroup: setGroup,

      // Common event tracking helpers
      trackPHFormSubmit: (formName, properties = {}) => {
        trackEvent('form_submit', { form_name: formName, ...properties });
      },

      trackPHError: (error, context = {}) => {
        captureException(error, context);
      },

      trackPHSignIn: (method, userId) => {
        trackEvent('user_signed_in', { method });
        if (userId) {
          identifyUser(userId);
        }
      },

      trackPHSignOut: () => {
        trackEvent('user_signed_out');
        resetUser();
      },

      // Utility functions
      isPHInitialized: () => isInitialized,
      getPHInstance: () => getPostHogClient(),
    }),
    [isInitialized]
  );

  return <PostHogContext.Provider value={analytics}>{children}</PostHogContext.Provider>;
}

PostHogProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// Custom hook to use PostHog analytics
export function useAnalytics() {
  const context = useContext(PostHogContext);

  if (!context) {
    console.warn('useAnalytics must be used within a PostHogProvider');
    // Return mock functions if provider is not found
    return {
      trackPH: () => {},
      identifyPH: () => {},
      resetPH: () => {},
      setPHUserProperties: () => {},
      getPHFeatureFlag: () => false,
      setPHGroup: () => {},
      // trackPHPageView removed - PostHog handles page views automatically
      trackPHFormSubmit: () => {},
      trackPHError: () => {},
      trackPHSignIn: () => {},
      trackPHSignOut: () => {},
      isPHInitialized: () => false,
      getPHInstance: () => null,
    };
  }

  return context;
}

// HOC for tracking page views automatically - DEPRECATED
// PostHog now handles page views automatically, no manual tracking needed
export function withPageTracking(WrappedComponent, pageName) {
  // Return the component as-is since PostHog handles page views automatically
  return WrappedComponent;
}
