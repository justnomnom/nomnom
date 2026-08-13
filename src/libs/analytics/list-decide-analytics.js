'use client';

import { useMemo } from 'react';

import { useAnalytics } from 'src/libs/analytics/analytics-provider';

// ----------------------------------------------------------------------

export const LIST_DECIDE_EVENTS = {
  SHARE_COPIED: 'list_share_copied',
  DECIDE_OPEN: 'list_decide_open',
  VOTE_CAST: 'list_vote_cast',
  ROULETTE_SPIN: 'list_roulette_spin',
  RESULT_SHOWN: 'list_result_shown',
  RESULT_LOCKED: 'list_result_locked',
};

/**
 * PostHog helpers for the Share → Decide funnel on public lists.
 */
export function useListDecideAnalytics() {
  const { trackEvent } = useAnalytics();

  return useMemo(
    () => ({
      trackShareCopied: (p) => trackEvent(LIST_DECIDE_EVENTS.SHARE_COPIED, p),
      trackDecideOpen: (p) => trackEvent(LIST_DECIDE_EVENTS.DECIDE_OPEN, p),
      trackVoteCast: (p) => trackEvent(LIST_DECIDE_EVENTS.VOTE_CAST, p),
      trackRouletteSpin: (p) => trackEvent(LIST_DECIDE_EVENTS.ROULETTE_SPIN, p),
      trackResultShown: (p) => trackEvent(LIST_DECIDE_EVENTS.RESULT_SHOWN, p),
      trackResultLocked: (p) => trackEvent(LIST_DECIDE_EVENTS.RESULT_LOCKED, p),
    }),
    [trackEvent]
  );
}
