import type { FC } from 'react';

/** Props for `RestaurantDetailView` (implemented in `.js`; types for TS consumers). */
export type RestaurantDetailViewProps = {
  restaurant: Record<string, unknown>;
  savedListIds?: string[];
  followCircle?: unknown;
  mapSheetMode?: boolean;
  onClose?: () => void;
  onSaveSheetApplied?: () => void;
  reviews?: unknown[];
  listMentions?: unknown[];
  /** Map sheet: true while async reviews + list-mentions fetch is in flight. */
  mentionsFeedLoading?: boolean;
  /** Map sheet: true while the tag catalog fetch is in flight — renders skeleton chips instead of slug-prettified labels. */
  tagsLoading?: boolean;
  myUserId?: string | null;
  onReviewSaved?: () => void;
  showListsAndReviews?: boolean;
  dashboardFixedBottomNav?: boolean;
  analyticsSurface?: 'content_hub' | 'dashboard' | null;
  analyticsContext?: {
    country_slug?: string;
    city_slug?: string;
    content_slug?: string;
  } | null;
};

declare const RestaurantDetailView: FC<RestaurantDetailViewProps>;
export default RestaurantDetailView;
