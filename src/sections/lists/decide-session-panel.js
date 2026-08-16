'use client';

import PropTypes from 'prop-types';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useShareLink } from 'src/hooks/use-share-link';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { SPACE, tabularNumsSx, touchTargetSx } from 'src/theme/spacing';
import { useListDecideAnalytics } from 'src/libs/analytics/list-decide-analytics';
import { buildDecideWinnerReplyText } from 'src/libs/lists/build-decide-winner-reply-text';
import { rankDecideTallies, canStartListDecide, pickDecideWinnerId } from 'src/libs/lists/list-decide-tally';
import {
  castListDecideVote,
  lockListDecideSession,
  fetchListDecideSession,
} from 'src/libs/lists/actions/decide-actions';
import {
  readMyVotes,
  readLockToken,
  persistMyVote,
  decideErrorMessage,
  getOrCreateVoterKey,
  canLockDecideSession,
  persistCachedSession,
  lockedWinnerRestaurantId,
  mapListItemsToDecidePlaces,
} from 'src/libs/lists/list-decide-client';

import Iconify from 'src/components/iconify';
import { ScrollableChipRow } from 'src/components/horizontal-scroll-row';
import ShareFeedbackSnackbar from 'src/components/share/share-feedback-snackbar';
import { scrollableChipPillButtonSx } from 'src/components/scrollable-chip-select';

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
/**
 * Vote button styling. Neutral at rest so nothing looks pre-chosen; filled in the
 * semantic colour once it is *your* vote, which is the only signal telling you how
 * you voted (the decide payload carries aggregate tallies only).
 * @param {boolean} mine
 * @param {'success' | 'error'} tone
 */
function voteButtonSx(mine, tone) {
  return (theme) => ({
    color: mine ? theme.palette[tone].darker : theme.palette.text.secondary,
    bgcolor: mine ? alpha(theme.palette[tone].main, 0.16) : 'transparent',
    transition: theme.transitions.create(['background-color', 'color'], {
      duration: theme.transitions.duration.shorter,
    }),
    '&:hover': {
      bgcolor: mine
        ? alpha(theme.palette[tone].main, 0.24)
        : alpha(theme.palette.text.primary, 0.06),
    },
  });
}

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
 * Shared vote / spin / lock / winner / poll UI for list Decide and Tonight.
 */
export default function DecideSessionPanel({
  listId,
  nightId = null,
  items,
  isOwner,
  listName,
  ownerUsername,
  listSlug,
  session: sessionProp,
  setSession: setSessionProp,
  refreshSession: refreshSessionProp,
  syncUrl = true,
  showStart = true,
  onStart,
  castVoteFn = castListDecideVote,
  lockFn = lockListDecideSession,
  fetchSessionFn = fetchListDecideSession,
  analyticsProps = null,
  votingEnabled = true,
}) {
  const { t } = useTranslate();
  const theme = useTheme();
  const analytics = useListDecideAnalytics();
  const {
    share: shareLink,
    feedback: shareFeedback,
    dismissFeedback: dismissShareFeedback,
  } = useShareLink({
    copiedKey: nightId ? 'pages.tonight.link_copied' : 'pages.lists.decide_share_copied',
    messageCopiedKey: 'pages.lists.decide_reply_copied',
    failedKey: 'pages.lists.decide_reply_failed',
  });

  const [internalSession, setInternalSession] = useState(null);
  const controlled = typeof setSessionProp === 'function';
  const session = controlled ? sessionProp : internalSession;
  const setSession = controlled ? setSessionProp : setInternalSession;

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [roulettePickId, setRoulettePickId] = useState(null);
  const [myVotes, setMyVotes] = useState(/** @type {Record<string, 1 | -1>} */ ({}));
  const resultTracked = useRef(false);
  const voterKeyRef = useRef(null);

  const extras = useMemo(() => {
    const base = analyticsProps && typeof analyticsProps === 'object' ? { ...analyticsProps } : {};
    if (nightId && !base.night_id) base.night_id = nightId;
    return base;
  }, [analyticsProps, nightId]);

  const placeRows = useMemo(
    () => mapListItemsToDecidePlaces(items, t('pages.lists.decide_unnamed_place')),
    [items, t]
  );

  const allowedIds = useMemo(() => {
    const raw = session?.allowed_restaurant_ids;
    if (!Array.isArray(raw) || raw.length === 0) return null;
    return new Set(raw.map((id) => String(id)));
  }, [session?.allowed_restaurant_ids]);

  const effectivePlaceRows = useMemo(() => {
    if (!allowedIds) return placeRows;
    return placeRows.filter((p) => allowedIds.has(p.restaurantId));
  }, [placeRows, allowedIds]);

  const restaurantIds = useMemo(
    () => effectivePlaceRows.map((p) => p.restaurantId),
    [effectivePlaceRows]
  );
  const placeById = useMemo(
    () => new Map(effectivePlaceRows.map((p) => [p.restaurantId, p])),
    [effectivePlaceRows]
  );

  const sessionId = session?.session_id ? String(session.session_id) : null;
  const locked = session?.status === 'locked';
  const tallies = useMemo(() => session?.tallies || {}, [session?.tallies]);
  const ranked = useMemo(() => rankDecideTallies(tallies, restaurantIds), [tallies, restaurantIds]);
  const canStart = canStartListDecide(placeRows.length);
  const canLock = canLockDecideSession({
    sessionId,
    locked,
    isOwner,
    lockToken: sessionId ? readLockToken(sessionId) : null,
  });

  const syncSessionUrl = useCallback(
    (nextSessionId) => {
      if (!syncUrl || typeof window === 'undefined' || !nextSessionId) return;
      const url = new URL(window.location.href);
      url.searchParams.set('d', nextSessionId);
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    },
    [syncUrl]
  );

  const applySession = useCallback(
    (next) => {
      if (!next) return;
      setSession(next);
      persistCachedSession(next);
      setErr(null);
    },
    [setSession]
  );

  const refreshSession = useCallback(
    async (id) => {
      if (typeof refreshSessionProp === 'function') {
        return refreshSessionProp(id);
      }
      if (!id) return null;
      const { session: next, error } = await fetchSessionFn(id);
      if (error) {
        setErr(error);
        return null;
      }
      applySession(next);
      return next;
    },
    [refreshSessionProp, fetchSessionFn, applySession]
  );

  useEffect(() => {
    voterKeyRef.current = getOrCreateVoterKey();
  }, []);

  // Your own votes survive a reload; the 4s poll only refreshes aggregate tallies
  // and must not clear which way you voted.
  useEffect(() => {
    setMyVotes(readMyVotes(sessionId));
  }, [sessionId]);

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
      ...extras,
    });
  }, [locked, session, sessionId, listId, analytics, extras]);

  const handleStartDecide = useCallback(async () => {
    if (!showStart || !onStart || !isOwner || !canStart || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await onStart({
        applySession,
        syncSessionUrl,
        setBusy,
        setErr,
      });
    } finally {
      setBusy(false);
    }
  }, [showStart, onStart, isOwner, canStart, busy, applySession, syncSessionUrl]);

  const handleShareDecide = useCallback(async () => {
    if (!sessionId && !nightId) return;
    let url;
    if (nightId && typeof window !== 'undefined') {
      url = `${window.location.origin}${paths.tonight(nightId)}`;
    } else if (typeof window !== 'undefined') {
      url = window.location.href;
    } else {
      url = paths.listPublic(listId, { username: ownerUsername, slug: listSlug });
    }
    await shareLink({ url, title: listName || '' });
    analytics.trackShareCopied({ list_id: listId, session_id: sessionId, ...extras });
  }, [
    sessionId,
    nightId,
    shareLink,
    listName,
    listId,
    ownerUsername,
    listSlug,
    analytics,
    extras,
  ]);

  const handleVote = useCallback(
    async (restaurantId, vote) => {
      if (!votingEnabled || !sessionId || locked || busy) return;
      const voterKey = voterKeyRef.current || getOrCreateVoterKey();
      setBusy(true);
      const { session: next, error } = await castVoteFn({
        sessionId,
        restaurantId,
        voterKey,
        vote,
        nightId,
        guestKey: voterKey,
      });
      setBusy(false);
      if (error || !next) {
        setErr(error || 'unknown');
        return;
      }
      applySession(next);
      setMyVotes(persistMyVote(sessionId, restaurantId, vote));
      analytics.trackVoteCast({
        list_id: listId,
        session_id: sessionId,
        restaurant_id: restaurantId,
        vote,
        ...extras,
      });
    },
    [votingEnabled, sessionId, locked, busy, listId, analytics, applySession, castVoteFn, nightId, extras]
  );

  const handleRoulette = useCallback(() => {
    if (!restaurantIds.length || locked) return;
    const pick = restaurantIds[Math.floor(Math.random() * restaurantIds.length)];
    setRoulettePickId(pick);
    analytics.trackRouletteSpin({
      list_id: listId,
      session_id: sessionId,
      restaurant_id: pick,
      ...extras,
    });
  }, [restaurantIds, locked, analytics, listId, sessionId, extras]);

  const handleLock = useCallback(async () => {
    if (!sessionId || locked || busy) return;
    const lockToken = readLockToken(sessionId);
    const winnerGuess = pickDecideWinnerId(tallies, restaurantIds);
    setBusy(true);
    const { session: next, error } = await lockFn({
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
      ...extras,
    });
  }, [sessionId, locked, busy, tallies, restaurantIds, listId, analytics, applySession, lockFn, extras]);

  const handleReplyShare = useCallback(async () => {
    const winnerIdNow = lockedWinnerRestaurantId(session);
    const place = winnerIdNow ? placeById.get(winnerIdNow) : null;
    if (!place?.restaurantId || typeof window === 'undefined') return;
    const restaurantUrl = `${window.location.origin}${paths.restaurantPublic(place.restaurantId)}`;
    const text = buildDecideWinnerReplyText({
      lead: t('pages.lists.decide_reply_share_text', { name: place.name }),
      mapsLink: place.mapsLink,
    });
    await shareLink({ url: restaurantUrl, title: place.name || '', text });
    analytics.trackResultReplyShared({
      list_id: listId,
      session_id: sessionId,
      restaurant_id: place.restaurantId,
      ...extras,
    });
  }, [session, placeById, shareLink, t, analytics, listId, sessionId, extras]);

  const winnerId = lockedWinnerRestaurantId(session);
  const winner = winnerId ? placeById.get(winnerId) : null;
  const roulettePlace = roulettePickId ? placeById.get(roulettePickId) : null;
  const hideStart = !showStart;
  let decideHint = t('pages.lists.decide_intro');
  if (locked) decideHint = t('pages.lists.decide_locked_hint');
  else if (session) decideHint = t('pages.lists.decide_open_hint');

  if (!canStart && !session) {
    return (
      <Card variant="outlined" sx={CARD_SX}>
        <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700, mb: SPACE.xxs }}>
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
              <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>
                {t('pages.lists.decide_title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {decideHint}
              </Typography>
            </Box>
            {busy ? <CircularProgress size={20} color="primary" /> : null}
          </Stack>

          {err ? (
            <Typography variant="body2" color="error">
              {decideErrorMessage(err, t)}
            </Typography>
          ) : null}

          {!hideStart && !session && isOwner ? (
            <Button
              fullWidth
              size="small"
              variant="contained"
              color="primary"
              onClick={handleStartDecide}
              disabled={busy || !canStart}
              sx={touchTargetSx}
            >
              {t('pages.lists.decide_start_cta')}
            </Button>
          ) : null}

          {!hideStart && !session && !isOwner ? (
            <Typography variant="body2" color="text.secondary">
              {t('pages.lists.decide_waiting_owner')}
            </Typography>
          ) : null}

          {session && winner ? (
            <Stack spacing={SPACE.sm} alignItems="center" sx={INNER_SURFACE_SX}>
              <DecidePlaceThumb name={winner.name} photo={winner.photo} size={WINNER_THUMB_SIZE} />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="overline" color="text.secondary">
                  {t('pages.lists.decide_going_here')}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, mt: SPACE.xxs }}>
                  {winner.name}
                </Typography>
              </Box>
              <Stack spacing={SPACE.sm} sx={{ width: 1 }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<Iconify icon={ic.shareLinear} width={20} />}
                  onClick={handleReplyShare}
                  disabled={busy}
                  sx={touchTargetSx}
                >
                  {t('pages.lists.decide_reply_cta')}
                </Button>
                <Stack direction="row" spacing={SPACE.xs} sx={{ width: 1 }}>
                  <Button
                    component={RouterLink}
                    href={paths.restaurantPublic(winner.restaurantId)}
                    variant="outlined"
                    size="medium"
                    fullWidth
                    sx={touchTargetSx}
                  >
                    {t('pages.lists.decide_view_place')}
                  </Button>
                  {winner.mapsLink ? (
                    <Button
                      href={winner.mapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outlined"
                      size="medium"
                      fullWidth
                      sx={touchTargetSx}
                    >
                      {t('pages.lists.decide_open_maps')}
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            </Stack>
          ) : null}

          {session && !locked && !votingEnabled ? (
            <Typography variant="body2" color="text.secondary">
              {t('pages.lists.decide_join_to_vote_hint')}
            </Typography>
          ) : null}

          {session && !locked ? (
            <>
              {/* These are actions, not filters: the two supporting ones keep the
                  compact neutral pill, while Lock winner is a real primary button
                  rather than a chip wearing the "selected filter" treatment. */}
              <ScrollableChipRow gap={1} sx={{ mx: 0, width: 1 }}>
                <Button
                  color="inherit"
                  disableElevation
                  startIcon={<Iconify icon={ic.shareLinear} width={18} />}
                  onClick={handleShareDecide}
                  disabled={busy}
                  sx={[scrollableChipPillButtonSx(theme), touchTargetSx]}
                >
                  {t('pages.lists.decide_share_link')}
                </Button>
                <Button
                  color="inherit"
                  disableElevation
                  onClick={handleRoulette}
                  disabled={busy || restaurantIds.length < 1}
                  sx={[scrollableChipPillButtonSx(theme), touchTargetSx]}
                >
                  {t('pages.lists.decide_spin')}
                </Button>
              </ScrollableChipRow>

              {/* Full width on its own row: as a pill in the scroll row it was pushed
                  off-screen on mobile, hiding the owner's completion action. */}
              {canLock ? (
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={handleLock}
                  disabled={busy}
                  sx={touchTargetSx}
                >
                  {t('pages.lists.decide_lock_cta')}
                </Button>
              ) : null}

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
                        <Typography variant="subtitle2" component="h3" noWrap sx={{ fontWeight: 700 }}>
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
                      {/* Both buttons rest neutral and fill in only for *your* vote.
                          Upvote used to be hardcoded color="primary", so it looked
                          already-chosen before you touched it and never changed after. */}
                      <IconButton
                        aria-label={t('pages.lists.decide_upvote_aria', { name: place.name })}
                        aria-pressed={myVotes[row.restaurantId] === 1}
                        onClick={() => handleVote(row.restaurantId, 1)}
                        disabled={busy || !votingEnabled}
                        size="small"
                        sx={[touchTargetSx, voteButtonSx(myVotes[row.restaurantId] === 1, 'success')]}
                      >
                        <Iconify icon={ic.likeBold} width={20} />
                      </IconButton>
                      <IconButton
                        aria-label={t('pages.lists.decide_downvote_aria', { name: place.name })}
                        aria-pressed={myVotes[row.restaurantId] === -1}
                        onClick={() => handleVote(row.restaurantId, -1)}
                        disabled={busy || !votingEnabled}
                        size="small"
                        sx={[touchTargetSx, voteButtonSx(myVotes[row.restaurantId] === -1, 'error')]}
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

DecideSessionPanel.propTypes = {
  listId: PropTypes.string.isRequired,
  nightId: PropTypes.string,
  items: PropTypes.array,
  isOwner: PropTypes.bool,
  listName: PropTypes.string,
  ownerUsername: PropTypes.string,
  listSlug: PropTypes.string,
  session: PropTypes.object,
  setSession: PropTypes.func,
  refreshSession: PropTypes.func,
  syncUrl: PropTypes.bool,
  showStart: PropTypes.bool,
  onStart: PropTypes.func,
  castVoteFn: PropTypes.func,
  lockFn: PropTypes.func,
  fetchSessionFn: PropTypes.func,
  analyticsProps: PropTypes.object,
  votingEnabled: PropTypes.bool,
};
