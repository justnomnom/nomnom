'use client';

import PropTypes from 'prop-types';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { ic } from 'src/assets/icons';
import { SPACE } from 'src/theme/spacing';
import { useLocales, useTranslate } from 'src/locales';
import { useTableAnalytics } from 'src/libs/analytics/table-analytics';
import { searchRestaurantsForPicker } from 'src/libs/lists/actions/items-actions';
import { fetchTable, addTablePlace, fetchTableDecide } from 'src/libs/lists/actions/table-actions';
import {
  readTableNamed,
  readCachedTable,
  summarizeGuests,
  tableErrorMessage,
  persistCachedTable,
  getOrCreateGuestKey,
  tableAddSearchState,
  guestHasDisplayName,
  formatTableWhenLabel,
} from 'src/libs/lists/table-client';

import Iconify from 'src/components/iconify';

import SettingsSelectionRow from 'src/sections/profile/settings-selection-row';

import TableVotePanel from './table-vote-panel';

// ----------------------------------------------------------------------

const CARD_SX = { p: SPACE.md, borderRadius: 2 };

/**
 * Map Table place rows into list-item shape for TableVotePanel.
 * @param {unknown} places
 * @param {string} unnamedPlace
 */
function mapPlacesToItems(places, unnamedPlace) {
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
 * Catalog search so anyone at an open table can widen the shortlist.
 * @param {{ existingIds: Set<string>, busy?: boolean, onPick: (restaurantId: string) => Promise<boolean> }} props
 */
function TableAddPlaceSearch({ existingIds, busy, onPick }) {
  const { t } = useTranslate();
  const unnamedPlace = t('pages.table.unnamed_place');
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

  const searchState = tableAddSearchState({
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
          {t('pages.table.add_place_title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('pages.table.add_place_hint')}
        </Typography>
        <TextField
          fullWidth
          size="small"
          label={t('pages.table.add_place_search_label')}
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
            {t('pages.table.add_place_empty')}
          </Typography>
        ) : null}
        {searchState === 'already_at_table' ? (
          <Typography variant="body2" color="text.secondary">
            {t('pages.table.add_place_already')}
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

TableAddPlaceSearch.propTypes = {
  existingIds: PropTypes.instanceOf(Set).isRequired,
  busy: PropTypes.bool,
  onPick: PropTypes.func.isRequired,
};

/**
 * Table page: shortlist + who's at the table + voting.
 *
 * An open table sends unnamed guests to `/table/[id]/join`. Settled tables skip
 * the gate so anyone with the link can see the winner.
 */
export default function TableView({ tableId }) {
  const { t } = useTranslate();
  const { currentLang } = useLocales();
  const router = useRouter();
  const analytics = useTableAnalytics();
  const openedTracked = useRef(false);
  const guestKeyRef = useRef(null);

  const [table, setTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [addBusy, setAddBusy] = useState(false);
  const [guestKey, setGuestKey] = useState('');

  useEffect(() => {
    const key = getOrCreateGuestKey();
    guestKeyRef.current = key;
    setGuestKey(key);
  }, []);

  const applyTable = useCallback((next) => {
    if (!next) return;
    setTable(next);
    setErr(null);
  }, []);

  /**
   * Cache whatever is on screen, in one place rather than at every call site. Seeded from
   * sessionStorage below, so a revisit or an auth remount paints the last known table
   * instead of a spinner over an empty page.
   */
  useEffect(() => {
    if (table) persistCachedTable(table);
  }, [table]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = readCachedTable(tableId);
      if (cached?.table_id) {
        setTable(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }
      const { table: next, error } = await fetchTable(tableId);
      if (cancelled) return;
      setLoading(false);
      if (error || !next) {
        // A table that is gone must not keep rendering from the cache behind an error
        // line; anything else (a blip) keeps the last known state on screen.
        if (!error || error === 'table_not_found') setTable(null);
        setErr(error || 'table_not_found');
        return;
      }
      applyTable(next);
      if (!openedTracked.current) {
        openedTracked.current = true;
        analytics.trackTableOpen({ table_id: String(next.table_id || tableId) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tableId, applyTable, analytics]);

  const guests = useMemo(() => (Array.isArray(table?.guests) ? table.guests : []), [table?.guests]);
  const guestSummary = useMemo(() => summarizeGuests(guests), [guests]);
  const hasNamed = Boolean(
    guestKey && (readTableNamed(tableId) || guestHasDisplayName(guests, guestKey))
  );
  const session = table?.decide || null;
  const locked = session?.status === 'locked';

  useEffect(() => {
    if (loading || !table || !guestKey) return;
    if (!locked && !hasNamed) {
      router.replace(paths.tableJoin(tableId));
    }
  }, [loading, table, guestKey, locked, hasNamed, router, tableId]);

  const whenLabel = formatTableWhenLabel(table?.starts_at, t, {
    locale: currentLang.adapterLocale,
  });

  const existingIds = useMemo(
    () =>
      new Set(
        (Array.isArray(table?.places) ? table.places : [])
          .filter((place) => place?.restaurant_id)
          .map((place) => String(place.restaurant_id))
      ),
    [table?.places]
  );

  const items = useMemo(
    () => mapPlacesToItems(table?.places, t('pages.table.unnamed_place')),
    [table?.places, t]
  );

  const handleAddPlace = useCallback(
    async (restaurantId) => {
      if (addBusy || !restaurantId) return false;
      const key = guestKeyRef.current || getOrCreateGuestKey();
      guestKeyRef.current = key;
      setGuestKey(key);
      setAddBusy(true);
      setErr(null);
      const { table: next, error } = await addTablePlace({
        tableId,
        restaurantId,
        guestKey: key,
      });
      setAddBusy(false);
      if (error || !next) {
        setErr(error || 'unknown');
        return false;
      }
      applyTable(next);
      analytics.trackPlaceAdded({
        table_id: String(next.table_id || tableId),
        restaurant_id: String(restaurantId),
      });
      return true;
    },
    [addBusy, tableId, applyTable, analytics]
  );

  const refreshSession = useCallback(async () => {
    const { slice, error } = await fetchTableDecide(tableId);
    if (error) {
      setErr(error);
      return null;
    }
    if (!slice) return null;
    setTable((prev) =>
      prev
        ? {
            ...prev,
            guest_count: slice.guest_count ?? prev.guest_count,
            guests: Array.isArray(slice.guests) ? slice.guests : prev.guests,
            places: Array.isArray(slice.places) ? slice.places : prev.places,
            decide: slice.decide || prev.decide,
          }
        : prev
    );
    return slice.decide || null;
  }, [tableId]);

  if (loading || (!locked && table && (!guestKey || !hasNamed))) {
    return (
      <Container maxWidth="sm" sx={{ py: SPACE.xl, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress color="primary" />
      </Container>
    );
  }

  if (!table) {
    return (
      <Container maxWidth="sm" sx={{ py: SPACE.xl }}>
        <Card variant="outlined" sx={CARD_SX}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('pages.table.not_found_title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: SPACE.xs }}>
            {tableErrorMessage(err || 'table_not_found', t)}
          </Typography>
        </Card>
      </Container>
    );
  }

  const whosAtTable = (() => {
    if (guestSummary.count === 0) return t('pages.table.whos_at_table_empty');
    const parts = [...guestSummary.names];
    if (guestSummary.anonymous > 0) {
      parts.push(t('pages.table.anon_suffix', { count: guestSummary.anonymous }));
    }
    return `${t('pages.table.whos_at_table', { count: guestSummary.count })} · ${parts.join(', ')}`;
  })();

  return (
    <Container maxWidth="sm" sx={{ py: SPACE.lg }}>
      <Stack spacing={SPACE.md}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            {table.title || t('pages.table.default_title')}
          </Typography>
          {whenLabel ? (
            <Stack direction="row" spacing={SPACE.xxs} alignItems="center" sx={{ mt: SPACE.xxs }}>
              <Iconify
                icon={ic.clockCircleOutline}
                width={16}
                sx={{ color: 'text.secondary', flexShrink: 0 }}
              />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {whenLabel}
              </Typography>
            </Stack>
          ) : null}
          <Typography variant="body2" color="text.secondary" sx={{ mt: SPACE.xxs }}>
            {t('pages.table.subtitle')}
          </Typography>
          {/* Who's at the table reads as social proof under the title, not as a section
              card competing with the vote panel for the same visual weight. */}
          <Typography variant="body2" color="text.secondary" sx={{ mt: SPACE.xs }}>
            {whosAtTable}
          </Typography>
        </Box>

        {err ? (
          <Typography variant="body2" color="error">
            {tableErrorMessage(err, t)}
          </Typography>
        ) : null}

        <TableVotePanel
          tableId={String(table.table_id || tableId)}
          listId={String(table.list_id || '')}
          items={items}
          isOwner={Boolean(table.is_owner)}
          title={table.title}
          session={session}
          guestKey={guestKey}
          named={hasNamed}
          whenLabel={whenLabel || null}
          onTableUpdate={applyTable}
          refreshSession={refreshSession}
        />

        {!locked && hasNamed ? (
          <TableAddPlaceSearch existingIds={existingIds} busy={addBusy} onPick={handleAddPlace} />
        ) : null}
      </Stack>
    </Container>
  );
}

TableView.propTypes = {
  tableId: PropTypes.string.isRequired,
};
