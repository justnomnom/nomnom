'use client';

import { GTM_API } from 'src/config-global';

// ----------------------------------------------------------------------

/**
 * Push data to GTM dataLayer
 */
export const pushToDataLayer = (event) => {
  if (!GTM_API.enabled || typeof window === 'undefined') {
    return;
  }

  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(event);
  } catch (error) {
    console.error('GTM pushToDataLayer error:', error);
  }
};

// ----------------------------------------------------------------------

/**
 * Track custom events to GTM
 */
export const trackGTMEvent = (eventName, parameters = {}) => {
  pushToDataLayer({
    event: eventName,
    ...parameters,
  });
};

/**
 * Track page views to GTM
 */
export const trackGTMPageView = (url, title) => {
  pushToDataLayer({
    event: 'page_view',
    page_location: url,
    page_title: title,
  });
};

/**
 * Track button clicks
 */
export const trackClick = (elementName, properties = {}) => {
  if (GTM_API.enabled) {
    trackGTMEvent('click', {
      event_category: 'engagement',
      event_label: elementName,
      page_location: typeof window !== 'undefined' ? window.location.href : '',
      page_title: typeof window !== 'undefined' ? document.title : '',
      ...properties,
    });
  }
};

/**
 * Track form submissions
 */
export const trackFormSubmission = (formName, properties = {}) => {
  if (GTM_API.enabled) {
    trackGTMEvent('form_submit', {
      event_category: 'form',
      event_label: formName,
      page_location: typeof window !== 'undefined' ? window.location.href : '',
      page_title: typeof window !== 'undefined' ? document.title : '',
      ...properties,
    });
  }
};

/**
 * Track signup events
 */
export const trackSignup = (source, properties = {}) => {
  if (GTM_API.enabled) {
    trackGTMEvent('signup_click', {
      event_category: 'engagement',
      event_label: source,
      page_location: typeof window !== 'undefined' ? window.location.href : '',
      page_title: typeof window !== 'undefined' ? document.title : '',
      ...properties,
    });
  }
};

/**
 * Track conversion events
 */
export const trackConversion = (conversionType, properties = {}) => {
  if (GTM_API.enabled) {
    trackGTMEvent('conversion', {
      event_category: 'conversion',
      event_label: conversionType,
      page_location: typeof window !== 'undefined' ? window.location.href : '',
      page_title: typeof window !== 'undefined' ? document.title : '',
      ...properties,
    });
  }
};

/**
 * Track feature usage
 */
export const trackFeatureUsage = (featureName, properties = {}) => {
  if (GTM_API.enabled) {
    trackGTMEvent('feature_usage', {
      event_category: 'feature',
      event_label: featureName,
      page_location: typeof window !== 'undefined' ? window.location.href : '',
      page_title: typeof window !== 'undefined' ? document.title : '',
      ...properties,
    });
  }
};

/**
 * GTM utility object that provides all tracking functions
 */
export const gtmUtils = {
  trackGTMEvent,
  trackGTMPageView,
  isEnabled: GTM_API.enabled,
  trackClick,
  trackFormSubmission,
  trackSignup,
  trackConversion,
  trackFeatureUsage,
};
