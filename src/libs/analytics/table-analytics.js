'use client';

import { useMemo } from 'react';

import { useAnalytics } from 'src/libs/analytics/analytics-provider';

// ----------------------------------------------------------------------

/**
 * One funnel now that Share → Decide and Plan Tonight are a single Table:
 * started → share_copied → open → vote_cast → result_locked.
 */
export const TABLE_EVENTS = {
  STARTED: 'table_started',
  SHARE_COPIED: 'table_share_copied',
  OPEN: 'table_open',
  NAMED: 'table_named',
  PLACE_ADDED: 'table_place_added',
  VOTE_CAST: 'table_vote_cast',
  RESULT_SHOWN: 'table_result_shown',
  RESULT_LOCKED: 'table_result_locked',
  RESULT_REPLY_SHARED: 'table_result_reply_shared',
};

/** PostHog helpers for the Table lifecycle. All events carry `table_id`. */
export function useTableAnalytics() {
  const { trackEvent } = useAnalytics();

  return useMemo(
    () => ({
      trackTableStarted: (p) => trackEvent(TABLE_EVENTS.STARTED, p),
      trackShareCopied: (p) => trackEvent(TABLE_EVENTS.SHARE_COPIED, p),
      trackTableOpen: (p) => trackEvent(TABLE_EVENTS.OPEN, p),
      trackTableNamed: (p) => trackEvent(TABLE_EVENTS.NAMED, p),
      trackPlaceAdded: (p) => trackEvent(TABLE_EVENTS.PLACE_ADDED, p),
      trackVoteCast: (p) => trackEvent(TABLE_EVENTS.VOTE_CAST, p),
      trackResultShown: (p) => trackEvent(TABLE_EVENTS.RESULT_SHOWN, p),
      trackResultLocked: (p) => trackEvent(TABLE_EVENTS.RESULT_LOCKED, p),
      trackResultReplyShared: (p) => trackEvent(TABLE_EVENTS.RESULT_REPLY_SHARED, p),
    }),
    [trackEvent]
  );
}
