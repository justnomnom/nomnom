'use client';

import PropTypes from 'prop-types';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useShareLink } from 'src/hooks/use-share-link';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import {
  castListDecideVote,
  lockListDecideSession,
  fetchListDecideSession,
  createListDecideSession,
} from 'src/libs/lists/actions/decide-actions';
import { canStartListDecide, pickDecideWinnerId, rankDecideTallies } from 'src/libs/lists/list-decide-tally';
import { useListDecideAnalytics } from 'src/libs/analytics/list-decide-analytics';

import Iconify from 'src/components/iconify';
import ShareFeedbackSnackbar from 'src/components/share/share-feedback-snackbar';

// ----------------------------------------------------------------------

const VOTER_KEY_STORAGE = 'nomnom:list-decide-voter-key:v1';
const LOCK_TOKEN_PREFIX = 'nomnom:list-decide-lock:';
const POLL_MS = 4000;

/**
 * Stable anonymous voter id for guest decide votes.
 * @returns {string}
 */
function getOrCreateVoterKey() {
  if (typeof window === 'undefined') return 'ssr-placeholder-key';
  try {
    const existing = window.localStorage.getItem(VOTER_KEY_STORAGE);
    if (existing && existing.length >= 8) return existing;
    const next =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `vk-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VOTER_KEY_STORAGE, next);
    return next;
  } catch {
    return `vk-ephemeral-${Date.now()}`;
  }
}

/**
 * @param {string} sessionId
 * @param {string} lockToken
 */
function persistLockToken(sessionId, lockToken) {
  if (typeof window === 'undefined' || !sessionId || !lockToken) return;
  try {
    window.sessionStorage.setItem(`${LOCK_TOKEN_PREFIX}${sessionId}`, lockToken);
  } catch {
    // ignore
  }
}

/**
 * @param {string} sessionId
 * @returns {string | null}
 */
function readLockToken(sessionId) {
  if (typeof window === 'undefined' || !sessionId) return null;
  try {
    return window.sessionStorage.getItem(`${LOCK_TOKEN_PREFIX}${sessionId}`);
  } catch {
    return null;
  }
}

/**
 * Map server error codes to translation keys.
 * @param {string | null} code
 * @param {(k: string) => string} t
 */
function decideErrorMessage(code, t) {
  if (!code) return null;
  const key = `pages.lists.decide_error_${code}`;
  const translated = t(key);
  return translated === key ? t('pages.lists.decide_error_generic') : translated;
}

/**
 * Share → Decide panel for a public list: vote, optional spin, lock result.
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
  const { t } = useTranslate();
  const analytics = useListDecideAnalytics();
  const {
    share: shareLink,
    feedback: shareFeedback,
    dismissFeedback: dismissShareFeedback,
  } = useShareLink();

  const placeRows = useMemo(
    () =>
      (items || [])
        .map((item) => {
          const r = item?.restaurants || item?.restaurant || null;
          const id = r?.id || item?.restaurant_id;
          if (!id) return null;
          const images = Array.isArray(r?.restaurant_images) ? r.restaurant_images : [];
          const photo =
            images
              .toSorted((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .find((img) => img?.url)?.url || null;
          return {
            restaurantId: String(id),
            name: r?.name || t('pages.lists.decide_unnamed_place'),
            mapsLink: r?.maps_link || null,
            photo,
          };
        })
        .filter(Boolean),
    [items, t]
  );

  const restaurantIds = useMemo(() => placeRows.map((p) => p.restaurantId), [placeRows]);
  const placeById = useMemo(() => new Map(placeRows.map((p) => [p.restaurantId, p])), [placeRows]);

  const [session, setSession] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [roulettePickId, setRoulettePickId] = useState(null);
  const openedTracked = useRef(false);
  const resultTracked = useRef(false);
  const voterKeyRef = useRef(null);

  const sessionId = session?.session_id ? String(session.session_id) : null;
  const locked = session?.status === 'locked';
  const tallies = session?.tallies || {};
  const ranked = useMemo(() => rankDecideTallies(tallies, restaurantIds), [tallies, restaurantIds]);
  const canStart = canStartListDecide(placeRows.length);
  const canLock = Boolean(sessionId && !locked && (isOwner || readLockToken(sessionId)));

  const syncSessionUrl = useCallback((nextSessionId) => {
    if (typeof window === 'undefined' || !nextSessionId) return;
    const url = new URL(window.location.href);
    url.searchParams.set('d', nextSessionId);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const refreshSession = useCallback(async (id) => {
    if (!id) return null;
    const { session: next, error } = await fetchListDecideSession(id);
    if (error) {
      setErr(error);
      return null;
    }
    setSession(next);
    setErr(null);
    return next;
  }, []);

  useEffect(() => {
    voterKeyRef.current = getOrCreateVoterKey();
  }, []);

  useEffect(() => {
    if (!initialSessionId) return undefined;
    let cancelled = false;
    (async () => {
      const next = await refreshSession(initialSessionId);
      if (cancelled || !next) return;
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
    return () => {
      cancelled = true;
    };
  }, [initialSessionId, refreshSession, syncSessionUrl, analytics, listId]);

  useEffect(() => {
    if (!sessionId || locked) return undefined;
    const tick = () => {
      refreshSession(sessionId);
    };
    const onFocus = () => tick();
    const id = window.setInterval(tick, POLL_MS);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [sessionId, locked, refreshSession]);

  useEffect(() => {
    if (!locked || !session?.winner_restaurant_id || resultTracked.current) return;
    resultTracked.current = true;
    analytics.trackResultShown({
      list_id: listId,
      session_id: sessionId,
      restaurant_id: String(session.winner_restaurant_id),
    });
  }, [locked, session, sessionId, listId, analytics]);

  const handleStartDecide = useCallback(async () => {
    if (!isOwner || !canStart || busy) return;
    setBusy(true);
    setErr(null);
    const { session: created, error } = await createListDecideSession(listId);
    if (error || !created?.session_id) {
      setBusy(false);
      setErr(error || 'unknown');
      return;
    }
    if (created.lock_token) {
      persistLockToken(String(created.session_id), String(created.lock_token));
    }
    const next = (await refreshSession(String(created.session_id))) || created;
    setBusy(false);
    syncSessionUrl(String(next.session_id || created.session_id));
    openedTracked.current = true;
    analytics.trackDecideOpen({
      list_id: listId,
      session_id: String(next.session_id || created.session_id),
      status: next.status || 'open',
    });
  }, [isOwner, canStart, busy, listId, syncSessionUrl, analytics, refreshSession]);

  const handleShareDecide = useCallback(async () => {
    if (!sessionId) return;
    const url =
      typeof window !== 'undefined'
        ? window.location.href
        : paths.listPublic(listId, { username: ownerUsername, slug: listSlug });
    await shareLink({ url, title: listName || '' });
    analytics.trackShareCopied({ list_id: listId, session_id: sessionId });
  }, [sessionId, shareLink, listName, listId, ownerUsername, listSlug, analytics]);

  const handleVote = useCallback(
    async (restaurantId, vote) => {
      if (!sessionId || locked || busy) return;
      const voterKey = voterKeyRef.current || getOrCreateVoterKey();
      setBusy(true);
      const { session: next, error } = await castListDecideVote({
        sessionId,
        restaurantId,
        voterKey,
        vote,
      });
      setBusy(false);
      if (error || !next) {
        setErr(error || 'unknown');
        return;
      }
      setSession(next);
      analytics.trackVoteCast({
        list_id: listId,
        session_id: sessionId,
        restaurant_id: restaurantId,
        vote,
      });
    },
    [sessionId, locked, busy, listId, analytics]
  );

  const handleRoulette = useCallback(() => {
    if (!restaurantIds.length || locked) return;
    const pick = restaurantIds[Math.floor(Math.random() * restaurantIds.length)];
    setRoulettePickId(pick);
    analytics.trackRouletteSpin({
      list_id: listId,
      session_id: sessionId,
      restaurant_id: pick,
    });
  }, [restaurantIds, locked, analytics, listId, sessionId]);

  const handleLock = useCallback(async () => {
    if (!sessionId || locked || busy) return;
    const lockToken = readLockToken(sessionId);
    const winnerGuess = pickDecideWinnerId(tallies, restaurantIds);
    setBusy(true);
    const { session: next, error } = await lockListDecideSession({
      sessionId,
      lockToken,
      winnerRestaurantId: winnerGuess,
    });
    setBusy(false);
    if (error || !next) {
      setErr(error || 'unknown');
      return;
    }
    setSession(next);
    analytics.trackResultLocked({
      list_id: listId,
      session_id: sessionId,
      restaurant_id: next.winner_restaurant_id ? String(next.winner_restaurant_id) : null,
    });
  }, [sessionId, locked, busy, tallies, restaurantIds, listId, analytics]);

  const winnerId = locked
    ? session?.winner_restaurant_id
      ? String(session.winner_restaurant_id)
      : null
    : null;
  const winner = winnerId ? placeById.get(winnerId) : null;
  const roulettePlace = roulettePickId ? placeById.get(roulettePickId) : null;

  if (!canStart && !session) {
    return (
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          {t('pages.lists.decide_title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('pages.lists.decide_need_three')}
        </Typography>
      </Card>
    );
  }

  return (
    <>
      <Card variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t('pages.lists.decide_title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {locked
                  ? t('pages.lists.decide_locked_hint')
                  : session
                    ? t('pages.lists.decide_open_hint')
                    : t('pages.lists.decide_intro')}
              </Typography>
            </Box>
            {busy ? <CircularProgress size={20} /> : null}
          </Stack>

          {err ? (
            <Typography variant="body2" color="error">
              {decideErrorMessage(err, t)}
            </Typography>
          ) : null}

          {!session && isOwner ? (
            <Button
              variant="contained"
              color="primary"
              onClick={handleStartDecide}
              disabled={busy || !canStart}
            >
              {t('pages.lists.decide_start_cta')}
            </Button>
          ) : null}

          {!session && !isOwner ? (
            <Typography variant="body2" color="text.secondary">
              {t('pages.lists.decide_waiting_owner')}
            </Typography>
          ) : null}

          {session && winner ? (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'background.neutral',
                textAlign: 'center',
              }}
            >
              <Typography variant="overline" color="text.secondary">
                {t('pages.lists.decide_going_here')}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>
                {winner.name}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                justifyContent="center"
                sx={{ mt: 1.5 }}
                flexWrap="wrap"
              >
                <Button
                  component={RouterLink}
                  href={paths.restaurantPublic(winner.restaurantId)}
                  variant="contained"
                  size="small"
                >
                  {t('pages.lists.decide_view_place')}
                </Button>
                {winner.mapsLink ? (
                  <Button
                    href={winner.mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    size="small"
                  >
                    {t('pages.lists.decide_open_maps')}
                  </Button>
                ) : null}
              </Stack>
            </Box>
          ) : null}

          {session && !locked ? (
            <>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Iconify icon={ic.shareLinear} width={18} />}
                  onClick={handleShareDecide}
                  disabled={busy}
                >
                  {t('pages.lists.decide_share_link')}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleRoulette}
                  disabled={busy || restaurantIds.length < 1}
                >
                  {t('pages.lists.decide_spin')}
                </Button>
                {canLock ? (
                  <Button
                    variant="contained"
                    size="small"
                    color="primary"
                    onClick={handleLock}
                    disabled={busy}
                  >
                    {t('pages.lists.decide_lock_cta')}
                  </Button>
                ) : null}
              </Stack>

              {roulettePlace ? (
                <Typography variant="body2">
                  {t('pages.lists.decide_spin_result', { name: roulettePlace.name })}
                </Typography>
              ) : null}

              <Stack spacing={1}>
                {ranked.map((row) => {
                  const place = placeById.get(row.restaurantId);
                  if (!place) return null;
                  return (
                    <Stack
                      key={row.restaurantId}
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{
                        py: 0.75,
                        px: 1,
                        borderRadius: 1.5,
                        bgcolor: 'background.neutral',
                        minWidth: 0,
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                          {place.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('pages.lists.decide_tally', {
                            up: row.up,
                            down: row.down,
                            net: row.net,
                          })}
                        </Typography>
                      </Box>
                      <IconButton
                        aria-label={t('pages.lists.decide_upvote_aria', { name: place.name })}
                        onClick={() => handleVote(row.restaurantId, 1)}
                        disabled={busy}
                        size="small"
                        color="primary"
                      >
                        <Iconify icon={ic.likeBold} width={20} />
                      </IconButton>
                      <IconButton
                        aria-label={t('pages.lists.decide_downvote_aria', { name: place.name })}
                        onClick={() => handleVote(row.restaurantId, -1)}
                        disabled={busy}
                        size="small"
                      >
                        <Iconify icon={ic.dislikeBold} width={20} />
                      </IconButton>
                    </Stack>
                  );
                })}
              </Stack>
            </>
          ) : null}
        </Stack>
      </Card>

      <ShareFeedbackSnackbar feedback={shareFeedback} onClose={dismissShareFeedback} />
    </>
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
