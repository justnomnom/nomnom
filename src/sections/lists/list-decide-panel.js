'use client';

import PropTypes from 'prop-types';
import { useRef, useState, useEffect, useCallback, useLayoutEffect } from 'react';

import {
  createListDecideSession,
  fetchListDecideSession,
} from 'src/libs/lists/actions/decide-actions';
import {
  getOrCreateVoterKey,
  persistCachedSession,
  persistLockToken,
  readCachedSession,
  resolveDecideSessionId,
} from 'src/libs/lists/list-decide-client';
import { useListDecideAnalytics } from 'src/libs/analytics/list-decide-analytics';

import DecideSessionPanel from 'src/sections/lists/decide-session-panel';

// ----------------------------------------------------------------------

/**
 * Share → Decide panel for a public list: start + ?d= URL sync, then shared session UI.
 *
 * Two-session note: list Decide and Night-linked sessions coexist. This panel only loads a
 * session from ?d= (or idle/start when absent) — it does not auto-fetch a Night session.
 */
export default function ListDecidePanel({
  listId,
  listName,
  items,
  isOwner,
  ownerUsername,
  listSlug,
  initialSessionId,
}) {
  const analytics = useListDecideAnalytics();
  const [session, setSession] = useState(null);
  const openedTracked = useRef(false);
  const loadGenRef = useRef(0);

  const syncSessionUrl = useCallback((nextSessionId) => {
    if (typeof window === 'undefined' || !nextSessionId) return;
    const url = new URL(window.location.href);
    url.searchParams.set('d', nextSessionId);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const applySession = useCallback((next) => {
    if (!next) return;
    setSession(next);
    persistCachedSession(next);
  }, []);

  useEffect(() => {
    getOrCreateVoterKey();
  }, []);

  // Restore cached session before paint so auth remounts do not flash the idle CTA.
  useLayoutEffect(() => {
    const fromUrl = resolveDecideSessionId(initialSessionId);
    if (!fromUrl) return;
    const cached = readCachedSession(fromUrl);
    if (cached) setSession(cached);
  }, [initialSessionId]);

  useEffect(() => {
    const fromUrl = resolveDecideSessionId(initialSessionId);
    if (!fromUrl) return undefined;
    const gen = ++loadGenRef.current;
    (async () => {
      const { session: next, error } = await fetchListDecideSession(fromUrl);
      if (loadGenRef.current !== gen || error || !next) return;
      applySession(next);
      syncSessionUrl(String(next.session_id));
      if (!openedTracked.current) {
        openedTracked.current = true;
        analytics.trackDecideOpen({
          list_id: listId,
          session_id: String(next.session_id),
          status: next.status,
        });
      }
    })();
    return undefined;
  }, [initialSessionId, applySession, syncSessionUrl, analytics, listId]);

  const handleStart = useCallback(
    async ({ applySession: apply, syncSessionUrl: sync, setErr }) => {
      if (!isOwner) return;
      const { session: created, error } = await createListDecideSession(listId);
      if (error || !created?.session_id) {
        setErr?.(error || 'unknown');
        return;
      }
      if (created.lock_token) {
        persistLockToken(String(created.session_id), String(created.lock_token));
      }
      const { session: refreshed } = await fetchListDecideSession(String(created.session_id));
      const next = refreshed || created;
      if (!next?.session_id) {
        setErr?.('unknown');
        return;
      }
      apply(next);
      sync(String(next.session_id || created.session_id));
      openedTracked.current = true;
      analytics.trackDecideOpen({
        list_id: listId,
        session_id: String(next.session_id || created.session_id),
        status: next.status || 'open',
      });
    },
    [isOwner, listId, analytics]
  );

  return (
    <DecideSessionPanel
      listId={listId}
      listName={listName}
      items={items}
      isOwner={isOwner}
      ownerUsername={ownerUsername}
      listSlug={listSlug}
      session={session}
      setSession={setSession}
      syncUrl
      showStart
      onStart={handleStart}
    />
  );
}

ListDecidePanel.propTypes = {
  listId: PropTypes.string.isRequired,
  listName: PropTypes.string,
  items: PropTypes.array,
  isOwner: PropTypes.bool,
  ownerUsername: PropTypes.string,
  listSlug: PropTypes.string,
  initialSessionId: PropTypes.string,
};
