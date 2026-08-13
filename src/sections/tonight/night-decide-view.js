'use client';

import PropTypes from 'prop-types';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useTranslate } from 'src/locales';
import { SPACE, touchTargetSx } from 'src/theme/spacing';
import { useNightAnalytics } from 'src/libs/analytics/night-analytics';
import { lockListDecideSession } from 'src/libs/lists/actions/decide-actions';
import {
  joinNight,
  fetchNight,
  castNightVote,
  fetchNightDecide,
} from 'src/libs/lists/actions/night-actions';
import {
  decideErrorMessage,
  getOrCreateVoterKey,
  persistCachedSession,
} from 'src/libs/lists/list-decide-client';

import DecideSessionPanel from 'src/sections/lists/decide-session-panel';

// ----------------------------------------------------------------------

const CARD_SX = { p: SPACE.md, borderRadius: 2 };

/**
 * Map Night place rows into list-item shape for DecideSessionPanel.
 * @param {unknown} places
 * @param {string} unnamedPlace
 */
function mapNightPlacesToItems(places, unnamedPlace) {
  return (Array.isArray(places) ? places : []).map((p) => ({
    restaurant_id: p?.restaurant_id,
    restaurants: {
      id: p?.restaurant_id,
      name: p?.name || unnamedPlace,
      maps_link: p?.maps_link || null,
      restaurant_images: p?.photo ? [{ url: p.photo, sort_order: 0 }] : [],
    },
  }));
}

/**
 * Tonight Night page: shortlist + who’s coming + Decide; join gates voting only.
 */
export default function NightDecideView({ nightId }) {
  const { t } = useTranslate();
  const analytics = useNightAnalytics();
  const openedTracked = useRef(false);
  const voterKeyRef = useRef(null);

  const [night, setNight] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [voterKey, setVoterKey] = useState('');

  useEffect(() => {
    const key = getOrCreateVoterKey();
    voterKeyRef.current = key;
    setVoterKey(key);
  }, []);

  const applyNight = useCallback((nextNight) => {
    if (!nextNight) return;
    setNight(nextNight);
    const { decide } = nextNight;
    if (decide) {
      setSession(decide);
      persistCachedSession(decide);
    }
    setErr(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { night: next, error } = await fetchNight(nightId);
      if (cancelled) return;
      setLoading(false);
      if (error || !next) {
        setErr(error || 'night_not_found');
        return;
      }
      applyNight(next);
      if (!openedTracked.current) {
        openedTracked.current = true;
        analytics.trackNightOpen({ night_id: String(next.night_id || nightId) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nightId, applyNight, analytics]);

  const guests = useMemo(
    () => (Array.isArray(night?.guests) ? night.guests : []),
    [night?.guests]
  );
  const hasJoined = useMemo(
    () => Boolean(voterKey) && guests.some((g) => String(g?.guest_key) === String(voterKey)),
    [guests, voterKey]
  );

  const items = useMemo(
    () => mapNightPlacesToItems(night?.places, t('pages.lists.decide_unnamed_place')),
    [night?.places, t]
  );

  const handleJoin = useCallback(async () => {
    if (joinBusy) return;
    const key = voterKeyRef.current || getOrCreateVoterKey();
    voterKeyRef.current = key;
    setVoterKey(key);
    setJoinBusy(true);
    setErr(null);
    const { night: next, error } = await joinNight({
      nightId,
      guestKey: key,
      displayName,
    });
    setJoinBusy(false);
    if (error || !next) {
      setErr(error || 'unknown');
      return;
    }
    applyNight(next);
    analytics.trackNightJoin({ night_id: String(next.night_id || nightId) });
  }, [joinBusy, nightId, displayName, applyNight, analytics]);

  const refreshSession = useCallback(async () => {
    const { slice, error } = await fetchNightDecide(nightId);
    if (error) {
      setErr(error);
      return null;
    }
    const decide = slice?.decide;
    if (decide) {
      setSession(decide);
      persistCachedSession(decide);
    }
    if (slice) {
      setNight((prev) =>
        prev
          ? {
              ...prev,
              guest_count: slice.guest_count ?? prev.guest_count,
              guests: Array.isArray(slice.guests) ? slice.guests : prev.guests,
              decide: decide || prev.decide,
            }
          : prev
      );
    }
    return decide || null;
  }, [nightId]);

  const castVoteFn = useCallback(
    async ({ restaurantId, voterKey: key, vote }) =>
      castNightVote({
        nightId,
        restaurantId,
        guestKey: key,
        vote,
      }),
    [nightId]
  );

  const lockFn = useCallback(
    async ({ sessionId, lockToken, winnerRestaurantId }) =>
      lockListDecideSession({
        sessionId,
        lockToken,
        winnerRestaurantId,
      }),
    []
  );

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: SPACE.xl, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress color="primary" />
      </Container>
    );
  }

  if (!night) {
    return (
      <Container maxWidth="sm" sx={{ py: SPACE.xl }}>
        <Card variant="outlined" sx={CARD_SX}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('pages.tonight.not_found_title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: SPACE.xs }}>
            {decideErrorMessage(err || 'night_not_found', t)}
          </Typography>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: SPACE.lg }}>
      <Stack spacing={SPACE.md}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {night.title || t('pages.tonight.default_title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: SPACE.xxs }}>
            {t('pages.tonight.subtitle')}
          </Typography>
        </Box>

        {err ? (
          <Typography variant="body2" color="error">
            {decideErrorMessage(err, t)}
          </Typography>
        ) : null}

        {!hasJoined ? (
          <Card variant="outlined" sx={CARD_SX}>
            <Stack spacing={SPACE.sm}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t('pages.tonight.join_title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('pages.tonight.join_hint')}
              </Typography>
              <TextField
                fullWidth
                size="small"
                label={t('pages.tonight.display_name_label')}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={joinBusy}
                inputProps={{ maxLength: 80 }}
              />
              <Button
                fullWidth
                size="large"
                variant="contained"
                color="primary"
                onClick={handleJoin}
                disabled={joinBusy || !displayName.trim()}
                sx={touchTargetSx}
              >
                {t('pages.tonight.join_cta')}
              </Button>
            </Stack>
          </Card>
        ) : null}

        <Card variant="outlined" sx={CARD_SX}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: SPACE.xs }}>
            {t('pages.tonight.whos_coming', { count: guests.length })}
          </Typography>
          {guests.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('pages.tonight.whos_coming_empty')}
            </Typography>
          ) : (
            <Stack spacing={SPACE.xxs}>
              {guests.map((g) => (
                <Typography key={String(g.guest_key)} variant="body2">
                  {g.display_name}
                </Typography>
              ))}
            </Stack>
          )}
        </Card>

        <DecideSessionPanel
          listId={String(night.list_id)}
          nightId={String(night.night_id || nightId)}
          items={items}
          isOwner={Boolean(night.is_owner)}
          listName={night.title}
          session={session}
          setSession={setSession}
          refreshSession={refreshSession}
          syncUrl={false}
          showStart={false}
          castVoteFn={castVoteFn}
          lockFn={lockFn}
          votingEnabled={hasJoined}
          analyticsProps={{ night_id: String(night.night_id || nightId) }}
        />
      </Stack>
    </Container>
  );
}

NightDecideView.propTypes = {
  nightId: PropTypes.string.isRequired,
};
