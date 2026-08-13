'use client';

import { useMemo } from 'react';

import { useAnalytics } from 'src/libs/analytics/analytics-provider';

// ----------------------------------------------------------------------

export const NIGHT_EVENTS = {
  CREATED: 'night_created',
  SHARE_COPIED: 'night_share_copied',
  OPEN: 'night_open',
  JOIN: 'night_join',
};

/**
 * PostHog helpers for Tonight Night lifecycle (Decide action events reuse list_* + night_id).
 */
export function useNightAnalytics() {
  const { trackEvent } = useAnalytics();

  return useMemo(
    () => ({
      trackNightCreated: (p) => trackEvent(NIGHT_EVENTS.CREATED, p),
      trackNightShareCopied: (p) => trackEvent(NIGHT_EVENTS.SHARE_COPIED, p),
      trackNightOpen: (p) => trackEvent(NIGHT_EVENTS.OPEN, p),
      trackNightJoin: (p) => trackEvent(NIGHT_EVENTS.JOIN, p),
    }),
    [trackEvent]
  );
}
