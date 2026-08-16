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
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { SPACE, touchTargetSx } from 'src/theme/spacing';
import { useNightAnalytics } from 'src/libs/analytics/night-analytics';
import { lockListDecideSession } from 'src/libs/lists/actions/decide-actions';
import { searchRestaurantsForPicker } from 'src/libs/lists/actions/items-actions';
import {
  joinNight,
  fetchNight,
  addNightPlace,
  castNightVote,
  fetchNightDecide,
} from 'src/libs/lists/actions/night-actions';
import {
  decideErrorMessage,
  getOrCreateVoterKey,
  persistCachedSession,
  tonightAddSearchState,
} from 'src/libs/lists/list-decide-client';

import Iconify from 'src/components/iconify';

import DecideSessionPanel from 'src/sections/lists/decide-session-panel';
import SettingsSelectionRow from 'src/sections/profile/settings-selection-row';

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
 * Catalog search so anyone who joined can add a restaurant while the night is open.
 * @param {{ existingIds: Set<string>, busy?: boolean, onPick: (restaurantId: string) => Promise<boolean> }} props
 */
function TonightAddPlaceSearch({ existingIds, busy, onPick }) {
  const { t } = useTranslate();
  const unnamedPlace = t('pages.lists.decide_unnamed_place');
  const [searchQ, setSearchQ] = useState('');
  const [searchHits, setSearchHits] = useState([]);
  const [searchPending, setSearchPending] = useState(false);

  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) {
      setSearchHits([]);
      setSearchPending(false);
      return undefined;
    }
    setSearchPending(true);
    setSearchHits([]);
    let cancelled = false;
    const tmr = setTimeout(() => {
      searchRestaurantsForPicker(q, 15).then(({ restaurants }) => {
        if (cancelled) return;
        setSearchHits(restaurants ?? []);
        setSearchPending(false);
      });
    }, 320);
    return () => {
      cancelled = true;
      clearTimeout(tmr);
    };
  }, [searchQ]);

  const searchState = tonightAddSearchState({
    query: searchQ,
    hits: searchHits,
    existingIds,
    pending: searchPending,
  });
  const rows = useMemo(() => {
    if (searchState !== 'results') return [];
    return (Array.isArray(searchHits) ? searchHits : [])
      .map((hit) => {
        const id = hit?.id ? String(hit.id) : '';
        if (!id || existingIds.has(id)) return null;
        const name = hit.name || unnamedPlace;
        const address = typeof hit.address === 'string' ? hit.address.trim() : '';
        return { id, label: address ? `${name} · ${address}` : name };
      })
      .filter(Boolean);
  }, [searchState, searchHits, existingIds, unnamedPlace]);

  return (
    <Card variant="outlined" sx={CARD_SX}>
      <Stack spacing={SPACE.sm}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t('pages.tonight.add_place_title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('pages.tonight.add_place_hint')}
        </Typography>
        <TextField
          fullWidth
          size="small"
          label={t('pages.tonight.add_place_search_label')}
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          disabled={busy}
          inputProps={{ autoComplete: 'off' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon={ic.searchLinear} width={18} sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
        {searchState === 'empty' ? (
          <Typography variant="body2" color="text.secondary">
            {t('pages.tonight.add_place_empty')}
          </Typography>
        ) : null}
        {searchState === 'already_on_night' ? (
          <Typography variant="body2" color="text.secondary">
            {t('pages.tonight.add_place_already')}
          </Typography>
        ) : null}
        {rows.length > 0 ? (
          <Stack spacing={SPACE.xxs}>
            {rows.map((row) => (
              <SettingsSelectionRow
                key={row.id}
                selected={false}
                onClick={async () => {
                  if (busy) return;
                  const ok = await onPick(row.id);
                  if (!ok) return;
                  setSearchQ('');
                  setSearchHits([]);
                }}
                icon={ic.shopBold}
                label={row.label}
              />
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}

TonightAddPlaceSearch.propTypes = {
  existingIds: PropTypes.instanceOf(Set).isRequired,
  busy: PropTypes.bool,
  onPick: PropTypes.func.isRequired,
};

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
  const [addBusy, setAddBusy] = useState(false);
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
  const sessionLocked = session?.status === 'locked';
  const existingIds = useMemo(() => {
    const ids = new Set();
    for (const place of Array.isArray(night?.places) ? night.places : []) {
      if (place?.restaurant_id) ids.add(String(place.restaurant_id));
    }
    return ids;
  }, [night?.places]);

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

  const handleAddPlace = useCallback(
    async (restaurantId) => {
      if (addBusy || !restaurantId) return false;
      const key = voterKeyRef.current || getOrCreateVoterKey();
      voterKeyRef.current = key;
      setVoterKey(key);
      setAddBusy(true);
      setErr(null);
      const { night: next, error } = await addNightPlace({
        nightId,
        restaurantId,
        guestKey: key,
      });
      setAddBusy(false);
      if (error || !next) {
        setErr(error || 'unknown');
        return false;
      }
      applyNight(next);
      analytics.trackNightPlaceAdded({
        night_id: String(next.night_id || nightId),
        restaurant_id: String(restaurantId),
      });
      return true;
    },
    [addBusy, nightId, applyNight, analytics]
  );

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
              places: Array.isArray(slice.places) ? slice.places : prev.places,
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
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            {night.title || t('pages.tonight.default_title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: SPACE.xxs }}>
            {t('pages.tonight.subtitle')}
          </Typography>
          {/* Who's coming reads as social proof under the title, not as a section
              card competing with Join and Decide for the same visual weight. */}
          <Typography variant="body2" color="text.secondary" sx={{ mt: SPACE.xs }}>
            {guests.length === 0
              ? t('pages.tonight.whos_coming_empty')
              : `${t('pages.tonight.whos_coming', { count: guests.length })} · ${guests
                  .map((g) => g.display_name)
                  .join(', ')}`}
          </Typography>
        </Box>

        {err ? (
          <Typography variant="body2" color="error">
            {decideErrorMessage(err, t)}
          </Typography>
        ) : null}

        {hasJoined && !sessionLocked ? (
          <TonightAddPlaceSearch existingIds={existingIds} busy={addBusy} onPick={handleAddPlace} />
        ) : null}

        {/* Join sits directly above the shortlist it unlocks, so the name field is
            adjacent to the disabled vote controls instead of two sections away. */}
        {!hasJoined ? (
          <Card variant="outlined" sx={CARD_SX}>
            <Stack spacing={SPACE.sm}>
              <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>
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
