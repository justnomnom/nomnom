'use client';

import PropTypes from 'prop-types';
import { useRef, useMemo, useState, useEffect, useCallback, useLayoutEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useShareLink } from 'src/hooks/use-share-link';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { SPACE, tabularNumsSx, touchTargetSx } from 'src/theme/spacing';
import {
  castListDecideVote,
  lockListDecideSession,
  fetchListDecideSession,
  createListDecideSession,
} from 'src/libs/lists/actions/decide-actions';
import { canStartListDecide, pickDecideWinnerId, rankDecideTallies } from 'src/libs/lists/list-decide-tally';
import {
  canLockDecideSession,
  decideErrorMessage,
  getOrCreateVoterKey,
  lockedWinnerRestaurantId,
  mapListItemsToDecidePlaces,
  persistCachedSession,
  persistLockToken,
  readCachedSession,
  readLockToken,
  resolveDecideSessionId,
} from 'src/libs/lists/list-decide-client';
import { useListDecideAnalytics } from 'src/libs/analytics/list-decide-analytics';

import Iconify from 'src/components/iconify';
import ShareFeedbackSnackbar from 'src/components/share/share-feedback-snackbar';

// ----------------------------------------------------------------------

const POLL_MS = 4000;
const PLACE_THUMB_SIZE = 40;
const WINNER_THUMB_SIZE = 48;
const CARD_SX = { p: SPACE.md, borderRadius: 2 };
const INNER_SURFACE_SX = {
  p: SPACE.md,
  borderRadius: 1,
  bgcolor: 'background.neutral',
  textAlign: 'center',
};
const VOTE_ROW_SX = {
  py: SPACE.xs,
  px: SPACE.sm,
  borderRadius: 1,
  bgcolor: 'background.neutral',
  minWidth: 0,
};

/**
 * Circular place thumb with a first-letter fallback when no photo is set.
 */
function DecidePlaceThumb({ name, photo, size }) {
  const fallback = String(name || '')
    .trim()
    .charAt(0)
    .toUpperCase() || '?';
  return (
    <Avatar src={photo || undefined} alt="" sx={{ width: size, height: size, flexShrink: 0 }}>
      {fallback}
    </Avatar>
  );
}

DecidePlaceThumb.propTypes = {
  name: PropTypes.string,
  photo: PropTypes.string,
  size: PropTypes.number.isRequired,
};

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
    () => mapListItemsToDecidePlaces(items, t('pages.lists.decide_unnamed_place')),
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
  const loadGenRef = useRef(0);

  const sessionId = session?.session_id ? String(session.session_id) : null;
  const locked = session?.status === 'locked';
  const tallies = session?.tallies || {};
  const ranked = useMemo(() => rankDecideTallies(tallies, restaurantIds), [tallies, restaurantIds]);
  const canStart = canStartListDecide(placeRows.length);
  const canLock = canLockDecideSession({
    sessionId,
    locked,
    isOwner,
    lockToken: sessionId ? readLockToken(sessionId) : null,
  });

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
    setErr(null);
  }, []);

  const refreshSession = useCallback(
    async (id) => {
      if (!id) return null;
      const { session: next, error } = await fetchListDecideSession(id);
      if (error) {
        setErr(error);
        return null;
      }
      applySession(next);
      return next;
    },
    [applySession]
  );

  useEffect(() => {
    voterKeyRef.current = getOrCreateVoterKey();
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
      const next = await refreshSession(fromUrl);
      if (loadGenRef.current !== gen || !next) return;
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
    if (!next?.session_id) {
      setBusy(false);
      setErr('unknown');
      return;
    }
    applySession(next);
    setBusy(false);
    syncSessionUrl(String(next.session_id || created.session_id));
    openedTracked.current = true;
    analytics.trackDecideOpen({
      list_id: listId,
      session_id: String(next.session_id || created.session_id),
      status: next.status || 'open',
    });
  }, [isOwner, canStart, busy, listId, syncSessionUrl, analytics, refreshSession, applySession]);

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
      applySession(next);
      analytics.trackVoteCast({
        list_id: listId,
        session_id: sessionId,
        restaurant_id: restaurantId,
        vote,
      });
    },
    [sessionId, locked, busy, listId, analytics, applySession]
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
    applySession(next);
    analytics.trackResultLocked({
      list_id: listId,
      session_id: sessionId,
      restaurant_id: next.winner_restaurant_id ? String(next.winner_restaurant_id) : null,
    });
  }, [sessionId, locked, busy, tallies, restaurantIds, listId, analytics, applySession]);

  const winnerId = lockedWinnerRestaurantId(session);
  const winner = winnerId ? placeById.get(winnerId) : null;
  const roulettePlace = roulettePickId ? placeById.get(roulettePickId) : null;

  if (!canStart && !session) {
    return (
      <Card variant="outlined" sx={CARD_SX}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: SPACE.xxs }}>
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
      <Card variant="outlined" sx={CARD_SX}>
        <Stack spacing={SPACE.sm}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={SPACE.xs}>
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
            {busy ? <CircularProgress size={20} color="primary" /> : null}
          </Stack>

          {err ? (
            <Typography variant="body2" color="error">
              {decideErrorMessage(err, t)}
            </Typography>
          ) : null}

          {!session && isOwner ? (
            <Button
              fullWidth
              size="small"
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
            <Stack spacing={SPACE.sm} alignItems="center" sx={INNER_SURFACE_SX}>
              <DecidePlaceThumb name={winner.name} photo={winner.photo} size={WINNER_THUMB_SIZE} />
              <Box>
                <Typography variant="overline" color="text.secondary">
                  {t('pages.lists.decide_going_here')}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, mt: SPACE.xxs }}>
                  {winner.name}
                </Typography>
              </Box>
              <Stack
                direction="row"
                spacing={SPACE.xs}
                justifyContent="center"
                flexWrap="wrap"
                useFlexGap
              >
                <Button
                  component={RouterLink}
                  href={paths.restaurantPublic(winner.restaurantId)}
                  variant="contained"
                  color="primary"
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
            </Stack>
          ) : null}

          {session && !locked ? (
            <>
              <Stack direction="row" spacing={SPACE.xs} flexWrap="wrap" useFlexGap>
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
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {t('pages.lists.decide_spin_result', { name: roulettePlace.name })}
                </Typography>
              ) : null}

              <Stack spacing={SPACE.xs}>
                {ranked.map((row) => {
                  const place = placeById.get(row.restaurantId);
                  if (!place) return null;
                  return (
                    <Stack
                      key={row.restaurantId}
                      direction="row"
                      alignItems="center"
                      spacing={SPACE.sm}
                      sx={VOTE_ROW_SX}
                    >
                      <DecidePlaceThumb name={place.name} photo={place.photo} size={PLACE_THUMB_SIZE} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                          {place.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={tabularNumsSx}>
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
                        sx={touchTargetSx}
                      >
                        <Iconify icon={ic.likeBold} width={20} />
                      </IconButton>
                      <IconButton
                        aria-label={t('pages.lists.decide_downvote_aria', { name: place.name })}
                        onClick={() => handleVote(row.restaurantId, -1)}
                        disabled={busy}
                        size="small"
                        sx={touchTargetSx}
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
