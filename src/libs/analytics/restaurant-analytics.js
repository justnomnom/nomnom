'use client';

import { useMemo } from 'react';

import { useAnalytics } from 'src/libs/analytics/analytics-provider';

/**
 * Restaurant analytics — PostHog + GTM via `trackEvent`.
 *
 * Property contract (use snake_case on the wire):
 * - restaurant_id: string (UUID for Supabase rows; content hub uses `content-hub:...`)
 * - restaurant_name: string
 * - surface: 'content_hub' | 'dashboard' | 'map_sheet' | 'discover_feed' | 'public'
 * - country_slug, city_slug, content_slug: optional (content hub)
 * - market_label, category_key: optional (discover feed impression)
 * - list_ids: optional string[] (save applied)
 */

export const RESTAURANT_EVENTS = {
  DETAIL_VIEWED: 'restaurant_detail_viewed',
  FEED_IMPRESSION: 'restaurant_feed_impression',
  MAPS_CLICKED: 'restaurant_maps_clicked',
  PHONE_CLICKED: 'restaurant_phone_clicked',
  PHOTO_VIEWED: 'restaurant_photo_viewed',
  SHARE_CLICKED: 'restaurant_share_clicked',
  SAVE_INTENT: 'restaurant_save_intent',
  SAVED: 'restaurant_saved',
  UNSAVED: 'restaurant_unsaved',
};

/** @typedef {'content_hub'|'dashboard'|'map_sheet'|'discover_feed'|'public'} RestaurantSurface */

export const RESTAURANT_SURFACE = {
  CONTENT_HUB: 'content_hub',
  DASHBOARD: 'dashboard',
  MAP_SHEET: 'map_sheet',
  DISCOVER_FEED: 'discover_feed',
  PUBLIC: 'public',
};

export function useRestaurantAnalytics() {
  const { trackEvent } = useAnalytics();

  return useMemo(
    () => ({
      /**
       * @param {object} p
       * @param {string} p.restaurant_id
       * @param {string} p.restaurant_name
       * @param {RestaurantSurface|string} p.surface
       * @param {string} [p.country_slug]
       * @param {string} [p.city_slug]
       * @param {string} [p.content_slug]
       */
      trackDetailViewed: (p) => trackEvent(RESTAURANT_EVENTS.DETAIL_VIEWED, p),

      /**
       * @param {object} p
       * @param {string} p.restaurant_id
       * @param {string} [p.market_label]
       * @param {string} [p.category_key]
       */
      trackFeedImpression: (p) => trackEvent(RESTAURANT_EVENTS.FEED_IMPRESSION, p),

      /**
       * @param {object} p
       * @param {string} p.restaurant_id
       * @param {RestaurantSurface|string} p.surface
       */
      trackMapsClicked: (p) => trackEvent(RESTAURANT_EVENTS.MAPS_CLICKED, p),

      /**
       * @param {object} p
       * @param {string} p.restaurant_id
       * @param {RestaurantSurface|string} p.surface
       */
      trackPhoneClicked: (p) => trackEvent(RESTAURANT_EVENTS.PHONE_CLICKED, p),

      /**
       * @param {object} p
       * @param {string} p.restaurant_id
       * @param {RestaurantSurface|string} p.surface
       * @param {number} [p.index] - zero-based gallery index opened
       */
      trackPhotoViewed: (p) => trackEvent(RESTAURANT_EVENTS.PHOTO_VIEWED, p),

      /**
       * @param {object} p
       * @param {string} p.restaurant_id
       * @param {RestaurantSurface|string} p.surface
       */
      trackShareClicked: (p) => trackEvent(RESTAURANT_EVENTS.SHARE_CLICKED, p),

      /**
       * @param {object} p
       * @param {string} p.restaurant_id
       */
      trackSaveIntent: (p) => trackEvent(RESTAURANT_EVENTS.SAVE_INTENT, p),

      /**
       * @param {object} p
       * @param {string} p.restaurant_id
       * @param {string[]} [p.list_ids]
       */
      trackSaved: (p) => trackEvent(RESTAURANT_EVENTS.SAVED, p),

      /**
       * @param {object} p
       * @param {string} p.restaurant_id
       * @param {string[]} [p.list_ids]
       */
      trackUnsaved: (p) => trackEvent(RESTAURANT_EVENTS.UNSAVED, p),
    }),
    [trackEvent]
  );
}
