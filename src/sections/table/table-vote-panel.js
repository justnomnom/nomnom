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

import { useShareLink } from 'src/hooks/use-share-link';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { useTableAnalytics } from 'src/libs/analytics/table-analytics';
import { rankTallies, pickWinnerId } from 'src/libs/lists/table-tally';
import { SPACE, tabularNumsSx, touchTargetSx } from 'src/theme/spacing';
import { lockTable, castTableVote } from 'src/libs/lists/actions/table-actions';
import { buildWinnerReplyText } from 'src/libs/lists/build-table-winner-reply-text';
import {
  readMyVotes,
  canLockTable,
  readLockToken,
  persistMyVote,
  readLinkCopied,
  clearLinkCopied,
  tableErrorMessage,
  mapListItemsToPlaces,
  lockedWinnerRestaurantId,
} from 'src/libs/lists/table-client';

import Iconify from 'src/components/iconify';
import ShareFeedbackSnackbar from 'src/components/share/share-feedback-snackbar';
import { scrollableChipPillButtonSx } from 'src/components/scrollable-chip-select';

import TableRestaurantDetailSheet from './table-restaurant-detail-sheet';

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
 * you voted (the payload carries aggregate tallies only).
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

const PLACE_IDENTITY_BTN_SX = [
  touchTargetSx,
  {
    display: 'flex',
    alignItems: 'center',
    gap: SPACE.xs,
    flex: 1,
    minWidth: 0,
    border: 0,
    bgcolor: 'transparent',
    color: 'inherit',
    font: 'inherit',
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: 1,
    p: 0,
    '&:hover': { bgcolor: 'action.hover' },
  },
];

/**
 * Circular place thumb with a first-letter fallback when no photo is set.
 */
function PlaceThumb({ name, photo, size }) {
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

PlaceThumb.propTypes = {
  name: PropTypes.string,
  photo: PropTypes.string,
  size: PropTypes.number.isRequired,
};

/**
 * Thumb + name that opens the restaurant detail sheet. Vote buttons stay outside
 * so a tap on the name never casts a vote.
 */
function PlaceIdentityButton({ place, size, onOpen, children }) {
  const { t } = useTranslate();
  return (
    <Box
      component="button"
      type="button"
      onClick={() => onOpen(place)}
      aria-label={t('pages.table.place_details_aria', { name: place.name })}
      sx={PLACE_IDENTITY_BTN_SX}
    >
      <PlaceThumb name={place.name} photo={place.photo} size={size} />
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
      <Iconify icon={ic.chevronRightLinear} width={16} sx={{ color: 'text.disabled', flexShrink: 0 }} />
    </Box>
  );
}

PlaceIdentityButton.propTypes = {
  place: PropTypes.object.isRequired,
  size: PropTypes.number.isRequired,
  onOpen: PropTypes.func.isRequired,
  children: PropTypes.node,
};

/**
 * Vote / lock / winner / poll UI for a Table.
 *
 * Voting requires a named seat (`named`). The join page is the gate; this panel
 * still refuses a tap if that prop is missing so a stray mount cannot vote.
 */
export default function TableVotePanel({
  tableId,
  listId,
  items,
  isOwner,
  title,
  session,
  guestKey,
  named = false,
  whenLabel,
  onTableUpdate,
  refreshSession,
}) {
  const { t } = useTranslate();
  const theme = useTheme();
  const analytics = useTableAnalytics();
  const {
    share: shareLink,
    announceCopied,
    feedback: shareFeedback,
    dismissFeedback: dismissShareFeedback,
  } = useShareLink({
    copiedKey: 'pages.table.link_copied',
    messageCopiedKey: 'pages.table.reply_copied',
    failedKey: 'pages.table.reply_failed',
  });

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [detailPlace, setDetailPlace] = useState(/** @type {object | null} */ (null));
  const [myVotes, setMyVotes] = useState(/** @type {Record<string, 1 | -1>} */ ({}));
  /** Restaurant whose vote is in flight — only that row waits, not the whole panel. */
  const [pendingVoteId, setPendingVoteId] = useState(/** @type {string | null} */ (null));
  const resultTracked = useRef(false);

  const analyticsBase = useMemo(
    () => ({ list_id: listId, table_id: tableId }),
    [listId, tableId]
  );

  // table_places is the shortlist and the allowed set, so these rows need no
  // further filtering — the old allowed_restaurant_ids pass is gone with it.
  const placeRows = useMemo(
    () => mapListItemsToPlaces(items, t('pages.table.unnamed_place')),
    [items, t]
  );

  const restaurantIds = useMemo(() => placeRows.map((p) => p.restaurantId), [placeRows]);
  const placeById = useMemo(
    () => new Map(placeRows.map((p) => [p.restaurantId, p])),
    [placeRows]
  );

  const locked = session?.status === 'locked';
  const tallies = useMemo(() => session?.tallies || {}, [session?.tallies]);
  const ranked = useMemo(() => rankTallies(tallies, restaurantIds), [tallies, restaurantIds]);
  /**
   * Rows render in the fixed shortlist order, never re-sorted by score. Ranking the
   * list live meant a row moved the instant anyone voted — including on the 4s poll —
   * so you would aim at a restaurant and hit whichever one slid into its place.
   * `ranked` still decides the winner; a "Leading" badge carries that signal instead.
   */
  const displayRows = useMemo(
    () => restaurantIds.map((id) => ranked.find((r) => r.restaurantId === id)).filter(Boolean),
    [restaurantIds, ranked]
  );
  const hasAnyVote = useMemo(() => displayRows.some((r) => r.up > 0 || r.down > 0), [displayRows]);
  const leaderId = hasAnyVote ? (ranked[0]?.restaurantId ?? null) : null;
  const canLock = canLockTable({
    tableId,
    locked,
    isOwner,
    lockToken: tableId ? readLockToken(tableId) : null,
  });

  // Your own votes survive a reload; the 4s poll only refreshes aggregate tallies
  // and must not clear which way you voted.
  useEffect(() => {
    setMyVotes(readMyVotes(tableId));
  }, [tableId]);

  // Start-a-table copies the link then navigates here; replay the toast on arrival.
  // Clear the flag on a timeout so React Strict Mode remounts still see it.
  useEffect(() => {
    if (!tableId || !readLinkCopied(tableId)) return undefined;
    announceCopied();
    const id = window.setTimeout(() => clearLinkCopied(tableId), 0);
    return () => window.clearTimeout(id);
  }, [tableId, announceCopied]);

  useEffect(() => {
    if (!tableId || locked) return undefined;
    const tick = () => {
      refreshSession?.();
    };
    const onFocus = () => tick();
    const id = window.setInterval(tick, POLL_MS);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [tableId, locked, refreshSession]);

  useEffect(() => {
    if (!locked || !session?.winner_restaurant_id || resultTracked.current) return;
    resultTracked.current = true;
    analytics.trackResultShown({
      ...analyticsBase,
      restaurant_id: String(session.winner_restaurant_id),
    });
  }, [locked, session, analytics, analyticsBase]);

  const handleOpenPlace = useCallback((place) => {
    if (!place?.restaurantId) return;
    setDetailPlace(place);
  }, []);

  const handleClosePlace = useCallback(() => setDetailPlace(null), []);

  const handleShare = useCallback(async () => {
    if (!tableId || typeof window === 'undefined') return;
    const url = `${window.location.origin}${paths.table(tableId)}`;
    await shareLink({ url, title: title || '' });
    analytics.trackShareCopied(analyticsBase);
  }, [tableId, shareLink, title, analytics, analyticsBase]);

  const handleVote = useCallback(
    async (restaurantId, vote) => {
      if (!tableId || locked || !named) return;
      // Show your choice immediately. A vote is an upsert keyed by
      // (table, guest, restaurant), so re-tapping is safe and the server is
      // still the source of truth for the counts.
      setMyVotes((prev) => ({ ...prev, [String(restaurantId)]: vote }));
      setPendingVoteId(String(restaurantId));
      const { table, error } = await castTableVote({
        tableId,
        restaurantId,
        guestKey,
        vote,
      });
      setPendingVoteId((cur) => (cur === String(restaurantId) ? null : cur));
      if (error || !table) {
        // Roll the optimistic mark back so the row never claims a vote the server rejected.
        setMyVotes(readMyVotes(tableId));
        setErr(error || 'unknown');
        return;
      }
      setErr(null);
      onTableUpdate?.(table);
      setMyVotes(persistMyVote(tableId, restaurantId, vote));
      analytics.trackVoteCast({ ...analyticsBase, restaurant_id: restaurantId, vote });
    },
    [tableId, locked, named, guestKey, analytics, analyticsBase, onTableUpdate]
  );

  const handleLock = useCallback(async () => {
    if (!tableId || locked || busy) return;
    const lockToken = readLockToken(tableId);
    const winnerGuess = pickWinnerId(tallies, restaurantIds);
    setBusy(true);
    const { table, error } = await lockTable({
      tableId,
      lockToken,
      winnerRestaurantId: winnerGuess,
    });
    setBusy(false);
    if (error || !table) {
      setErr(error || 'unknown');
      return;
    }
    setErr(null);
    onTableUpdate?.(table);
    const winnerNow = table?.decide?.winner_restaurant_id;
    analytics.trackResultLocked({
      ...analyticsBase,
      restaurant_id: winnerNow ? String(winnerNow) : null,
    });
  }, [tableId, locked, busy, tallies, restaurantIds, analytics, analyticsBase, onTableUpdate]);

  const handleReplyShare = useCallback(async () => {
    const winnerIdNow = lockedWinnerRestaurantId(session);
    const place = winnerIdNow ? placeById.get(winnerIdNow) : null;
    if (!place?.restaurantId || typeof window === 'undefined') return;
    const restaurantUrl = `${window.location.origin}${paths.restaurantPublic(place.restaurantId)}`;
    const text = buildWinnerReplyText({
      lead: t('pages.table.reply_share_text', { name: place.name }),
      when: whenLabel,
      mapsLink: place.mapsLink,
    });
    await shareLink({ url: restaurantUrl, title: place.name || '', text });
    analytics.trackResultReplyShared({ ...analyticsBase, restaurant_id: place.restaurantId });
  }, [session, placeById, shareLink, t, analytics, analyticsBase, whenLabel]);

  const winnerId = lockedWinnerRestaurantId(session);
  const winner = winnerId ? placeById.get(winnerId) : null;

  return (
    <>
      <Card variant="outlined" sx={CARD_SX}>
        <Stack spacing={SPACE.sm}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={SPACE.xs}>
            <Box>
              <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>
                {t('pages.table.vote_title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t(locked ? 'pages.table.vote_locked_hint' : 'pages.table.vote_open_hint')}
              </Typography>
            </Box>
            {busy ? <CircularProgress size={20} color="primary" /> : null}
          </Stack>

          {err ? (
            <Typography variant="body2" color="error">
              {tableErrorMessage(err, t)}
            </Typography>
          ) : null}

          {winner ? (
            <Stack spacing={SPACE.sm} alignItems="center" sx={INNER_SURFACE_SX}>
              <PlaceThumb name={winner.name} photo={winner.photo} size={WINNER_THUMB_SIZE} />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="overline" color="text.secondary">
                  {t('pages.table.going_here')}
                </Typography>
                <Box
                  component="button"
                  type="button"
                  onClick={() => handleOpenPlace(winner)}
                  aria-label={t('pages.table.place_details_aria', { name: winner.name })}
                  sx={{
                    border: 0,
                    bgcolor: 'transparent',
                    color: 'inherit',
                    font: 'inherit',
                    cursor: 'pointer',
                    p: 0,
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="h6" component="span" sx={{ fontWeight: 700, mt: SPACE.xxs, display: 'block' }}>
                    {winner.name}
                  </Typography>
                </Box>
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
                  {t('pages.table.reply_cta')}
                </Button>
                <Stack direction="row" spacing={SPACE.xs} sx={{ width: 1 }}>
                  <Button
                    variant="outlined"
                    size="medium"
                    fullWidth
                    onClick={() => handleOpenPlace(winner)}
                    sx={touchTargetSx}
                  >
                    {t('pages.table.view_place')}
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
                      {t('pages.table.open_maps')}
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            </Stack>
          ) : null}

          {!locked ? (
            <>
              {/* Share stays a compact supporting pill. Settle is the primary
                  action, so it is a real contained button on its own row. */}
              <Button
                color="inherit"
                disableElevation
                startIcon={<Iconify icon={ic.shareLinear} width={18} />}
                onClick={handleShare}
                disabled={busy}
                sx={[scrollableChipPillButtonSx(theme), touchTargetSx]}
              >
                {t('pages.table.share_link')}
              </Button>

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
                  {t('pages.table.lock_cta')}
                </Button>
              ) : null}

              <Stack spacing={SPACE.xs}>
                {displayRows.map((row) => {
                  const place = placeById.get(row.restaurantId);
                  if (!place) return null;
                  const mine = myVotes[row.restaurantId];
                  return (
                    <Stack
                      key={row.restaurantId}
                      direction="row"
                      alignItems="center"
                      spacing={SPACE.xs}
                      sx={VOTE_ROW_SX}
                    >
                      <PlaceIdentityButton
                        place={place}
                        size={PLACE_THUMB_SIZE}
                        onOpen={handleOpenPlace}
                      >
                        <Typography variant="subtitle2" component="span" noWrap sx={{ fontWeight: 700, display: 'block' }}>
                          {place.name}
                        </Typography>
                        {/* Counts live next to the thumbs now, so this line carries the
                            status a number cannot: who is winning, and what you picked. */}
                        {(() => {
                          const isLeader = row.restaurantId === leaderId;
                          if (!isLeader && !mine) return null;
                          const label = isLeader
                            ? t('pages.table.leading')
                            : t(
                                mine === 1
                                  ? 'pages.table.you_voted_for'
                                  : 'pages.table.you_voted_against'
                              );
                          return (
                            <Typography
                              variant="caption"
                              sx={{
                                color: isLeader ? 'success.darker' : 'text.secondary',
                                fontWeight: isLeader ? 700 : 400,
                              }}
                            >
                              {label}
                            </Typography>
                          );
                        })()}
                      </PlaceIdentityButton>
                      {/* Each thumb carries its own count, so the score reads without
                          decoding "+3 / -0 · net 3". Both rest neutral and fill only for
                          *your* vote; only this row waits on its own request, so tapping
                          another restaurant mid-flight is no longer swallowed. */}
                      <Stack direction="row" alignItems="center" spacing={0.25}>
                        <IconButton
                          aria-label={t('pages.table.upvote_aria', { name: place.name })}
                          aria-pressed={mine === 1}
                          onClick={() => handleVote(row.restaurantId, 1)}
                          disabled={!named || pendingVoteId === row.restaurantId}
                          size="small"
                          sx={[touchTargetSx, voteButtonSx(mine === 1, 'success')]}
                        >
                          <Iconify icon={ic.likeBold} width={20} />
                        </IconButton>
                        <Typography
                          variant="subtitle2"
                          sx={[tabularNumsSx, { minWidth: 12, color: 'text.secondary' }]}
                        >
                          {row.up}
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={0.25}>
                        <IconButton
                          aria-label={t('pages.table.downvote_aria', { name: place.name })}
                          aria-pressed={mine === -1}
                          onClick={() => handleVote(row.restaurantId, -1)}
                          disabled={!named || pendingVoteId === row.restaurantId}
                          size="small"
                          sx={[touchTargetSx, voteButtonSx(mine === -1, 'error')]}
                        >
                          <Iconify icon={ic.dislikeBold} width={20} />
                        </IconButton>
                        <Typography
                          variant="subtitle2"
                          sx={[tabularNumsSx, { minWidth: 12, color: 'text.secondary' }]}
                        >
                          {row.down}
                        </Typography>
                      </Stack>
                    </Stack>
                  );
                })}
              </Stack>
            </>
          ) : null}
        </Stack>
      </Card>

      <ShareFeedbackSnackbar feedback={shareFeedback} onClose={dismissShareFeedback} />

      <TableRestaurantDetailSheet
        open={Boolean(detailPlace)}
        onClose={handleClosePlace}
        place={detailPlace}
      />
    </>
  );
}

TableVotePanel.propTypes = {
  tableId: PropTypes.string.isRequired,
  listId: PropTypes.string,
  items: PropTypes.array,
  isOwner: PropTypes.bool,
  title: PropTypes.string,
  session: PropTypes.object,
  guestKey: PropTypes.string,
  named: PropTypes.bool,
  whenLabel: PropTypes.string,
  onTableUpdate: PropTypes.func,
  refreshSession: PropTypes.func,
};
