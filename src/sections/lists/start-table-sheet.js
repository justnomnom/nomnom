'use client';

import PropTypes from 'prop-types';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';

import { useShareLink } from 'src/hooks/use-share-link';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { SPACE, tabularNumsSx, touchTargetSx } from 'src/theme/spacing';
import { startTable } from 'src/libs/lists/actions/table-actions';
import { useTableAnalytics } from 'src/libs/analytics/table-analytics';
import { searchRestaurantsForPicker } from 'src/libs/lists/actions/items-actions';
import {
  tablePickerRows,
  persistLockToken,
  tableErrorMessage,
  toggleSelectedIds,
  mapListItemsToPlaces,
  filterTablePickerRows,
  tableSelectedPickerRows,
} from 'src/libs/lists/table-client';

import Iconify from 'src/components/iconify';
import { ResponsiveSheet } from 'src/components/sheet-shell';
import ShareFeedbackSnackbar from 'src/components/share/share-feedback-snackbar';

import SettingsSelectionRow from 'src/sections/profile/settings-selection-row';

// ----------------------------------------------------------------------

const TITLE_ID = 'start-table-title';
const DESC_ID = 'start-table-desc';
const MIN_PLACES = 3;

/**
 * Map a catalog search hit into a picker row.
 * @param {{ id?: string, name?: string, address?: string | null }} hit
 * @param {string} unnamedPlace
 * @returns {{ restaurantId: string, name: string, label: string, mapsLink: null, photo: null } | null}
 */
function catalogHitToPlace(hit, unnamedPlace) {
  const id = hit?.id ? String(hit.id) : '';
  if (!id) return null;
  const name = hit.name || unnamedPlace;
  const address = typeof hit.address === 'string' ? hit.address.trim() : '';
  return {
    restaurantId: id,
    name,
    label: address ? `${name} · ${address}` : name,
    mapsLink: null,
    photo: null,
  };
}

/**
 * Owner sheet to start a Table (at least 3 places) and copy the share link.
 * Places can come from the current list or from a catalog search of any restaurant.
 */
export default function StartTableSheet({ open, onClose, listId, items, isOwner }) {
  const { t } = useTranslate();
  const analytics = useTableAnalytics();
  const unnamedPlace = t('pages.table.unnamed_place');
  const {
    copyLink,
    feedback: shareFeedback,
    dismissFeedback: dismissShareFeedback,
  } = useShareLink({
    copiedKey: 'pages.table.link_copied',
    failedKey: 'pages.table.link_copy_failed',
  });

  const placeRows = useMemo(
    () => mapListItemsToPlaces(items, unnamedPlace),
    [items, unnamedPlace]
  );
  const listIdSet = useMemo(() => new Set(placeRows.map((p) => p.restaurantId)), [placeRows]);

  const [title, setTitle] = useState(() => t('pages.table.default_title'));
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [extraById, setExtraById] = useState(() => ({}));
  const [searchQ, setSearchQ] = useState('');
  const [searchHits, setSearchHits] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;
    setTitle(t('pages.table.default_title'));
    setSelectedIds(new Set());
    setExtraById({});
    setSearchQ('');
    setSearchHits([]);
    setErr(null);
  }, [open, t]);

  useEffect(() => {
    if (!open) return undefined;
    const q = searchQ.trim();
    if (q.length < 2) {
      setSearchHits([]);
      return undefined;
    }
    let cancelled = false;
    const tmr = setTimeout(() => {
      searchRestaurantsForPicker(q, 15).then(({ restaurants }) => {
        if (!cancelled) setSearchHits(restaurants ?? []);
      });
    }, 320);
    return () => {
      cancelled = true;
      clearTimeout(tmr);
    };
  }, [open, searchQ]);

  const selectedCount = selectedIds.size;
  const canSubmit = isOwner && selectedCount >= MIN_PLACES && !busy;
  const isSearching = searchQ.trim().length >= 2;

  const extraRows = useMemo(
    () =>
      Object.values(extraById).filter(
        (p) => selectedIds.has(p.restaurantId) && !listIdSet.has(p.restaurantId)
      ),
    [extraById, selectedIds, listIdSet]
  );

  const selectedPickerRows = useMemo(
    () => tableSelectedPickerRows(placeRows, extraRows, selectedIds),
    [placeRows, extraRows, selectedIds]
  );

  const pickerRows = useMemo(() => {
    const listVisible = isSearching ? filterTablePickerRows(placeRows, searchQ) : placeRows;
    const merged = tablePickerRows(listVisible, extraRows);
    const shownIds = new Set(merged.map((p) => p.restaurantId));
    const catalogRows = isSearching
      ? searchHits
          .map((hit) => catalogHitToPlace(hit, unnamedPlace))
          .filter((p) => p && !shownIds.has(p.restaurantId) && !listIdSet.has(p.restaurantId))
      : [];
    return [...merged, ...catalogRows];
  }, [extraRows, listIdSet, isSearching, placeRows, searchQ, searchHits, unnamedPlace]);

  /** Toggle a picker row, keeping catalog extras in extraById. */
  const handleToggle = useCallback(
    (place) => {
      const restaurantId = place?.restaurantId;
      if (!restaurantId || busy) return;
      const wasSelected = selectedIds.has(restaurantId);

      setSelectedIds((prev) => toggleSelectedIds(prev, restaurantId));

      if (listIdSet.has(restaurantId)) return;

      setExtraById((map) => {
        if (wasSelected) {
          if (!(restaurantId in map)) return map;
          const copy = { ...map };
          delete copy[restaurantId];
          return copy;
        }
        return {
          ...map,
          [restaurantId]: {
            restaurantId,
            name: place.name || unnamedPlace,
            label: place.label || place.name || unnamedPlace,
            mapsLink: null,
            photo: null,
          },
        };
      });
    },
    [busy, listIdSet, unnamedPlace, selectedIds]
  );

  const handleClose = useCallback(() => {
    if (busy) return;
    onClose?.();
  }, [busy, onClose]);

  const handleCreate = useCallback(async () => {
    if (!canSubmit) return;
    setBusy(true);
    setErr(null);
    const restaurantIds = [...selectedIds];
    const { table, error } = await startTable({
      listId,
      restaurantIds,
      title: title.trim() || t('pages.table.default_title'),
    });
    if (error || !table?.table_id) {
      setBusy(false);
      setErr(error || 'unknown');
      return;
    }
    if (table.lock_token) {
      persistLockToken(String(table.table_id), String(table.lock_token));
    }
    const analyticsProps = {
      table_id: String(table.table_id),
      list_id: String(table.list_id || listId),
    };
    analytics.trackTableStarted(analyticsProps);
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}${paths.table(table.table_id)}`
        : paths.table(table.table_id);
    await copyLink(url);
    analytics.trackShareCopied(analyticsProps);
    setBusy(false);
    onClose?.();
  }, [canSubmit, selectedIds, listId, title, t, analytics, copyLink, onClose]);

  const sheetTitle = (
    <Typography
      id={TITLE_ID}
      variant="subtitle1"
      component="h2"
      sx={{ fontWeight: 800, flex: 1, minWidth: 0, lineHeight: 1.3, m: 0 }}
    >
      {t('pages.lists.start_table_title')}
    </Typography>
  );

  const footer = (
    <Stack spacing={SPACE.sm} sx={{ width: 1 }}>
      <Button
        fullWidth
        size="large"
        variant="contained"
        color="primary"
        onClick={handleCreate}
        disabled={!canSubmit}
        sx={touchTargetSx}
      >
        {t('pages.lists.start_table_create')}
      </Button>
      <Button fullWidth size="large" variant="outlined" onClick={handleClose} disabled={busy}>
        {t('pages.lists.start_table_cancel')}
      </Button>
    </Stack>
  );

  const showEmptyHint = !isSearching && placeRows.length === 0 && extraRows.length === 0;
  const showSearchEmpty = isSearching && pickerRows.length === 0 && selectedPickerRows.length === 0;
  const otherPickerRows = pickerRows.filter((place) => !selectedIds.has(place.restaurantId));

  /**
   * Renders one selectable restaurant row. Pointer down is stopped so the sheet swipe
   * dismiss does not steal the tap.
   * @param {{ restaurantId: string, name: string, label?: string }} place
   */
  const renderPickerRow = (place) => (
    <Box key={place.restaurantId} onPointerDown={(event) => event.stopPropagation()}>
      <SettingsSelectionRow
        multiSelect
        selected={selectedIds.has(place.restaurantId)}
        onClick={() => handleToggle(place)}
        icon={ic.shopBold}
        label={place.label || place.name}
      />
    </Box>
  );

  return (
    <>
      <ResponsiveSheet
        open={open}
        onClose={handleClose}
        titleId={TITLE_ID}
        descId={DESC_ID}
        title={sheetTitle}
        footer={footer}
        closeDisabled={busy}
      >
        <Typography id={DESC_ID} variant="body2" color="text.secondary">
          {t('pages.lists.start_table_hint', { min: MIN_PLACES })}
        </Typography>

        <TextField
          fullWidth
          size="small"
          label={t('pages.lists.start_table_name_label')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
          inputProps={{ maxLength: 80 }}
        />

        {err ? (
          <Typography variant="body2" color="error">
            {tableErrorMessage(err, t)}
          </Typography>
        ) : null}

        {selectedPickerRows.length > 0 ? (
          <Stack spacing={SPACE.xs}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 700, ...tabularNumsSx }}
            >
              {t('pages.lists.start_table_picks')}
              {' · '}
              {t('pages.lists.start_table_selected', { count: selectedCount })}
            </Typography>
            {selectedPickerRows.map(renderPickerRow)}
          </Stack>
        ) : (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, ...tabularNumsSx }}
          >
            {t('pages.lists.start_table_selected', { count: selectedCount })}
          </Typography>
        )}

        <Stack spacing={SPACE.sm}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t('pages.lists.start_table_from_list')}
          </Typography>
          <TextField
            fullWidth
            size="small"
            autoFocus
            label={t('pages.lists.start_table_search_label')}
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
          {showEmptyHint ? (
            <Typography variant="body2" color="text.secondary">
              {t('pages.lists.start_table_empty_list')}
            </Typography>
          ) : null}
          {showSearchEmpty ? (
            <Typography variant="body2" color="text.secondary">
              {t('pages.lists.start_table_search_empty')}
            </Typography>
          ) : null}
          <Stack spacing={SPACE.xs} sx={{ maxHeight: 320, overflow: 'auto' }}>
            {otherPickerRows.map(renderPickerRow)}
          </Stack>
        </Stack>
      </ResponsiveSheet>

      <ShareFeedbackSnackbar feedback={shareFeedback} onClose={dismissShareFeedback} />
    </>
  );
}

StartTableSheet.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  listId: PropTypes.string.isRequired,
  items: PropTypes.array,
  isOwner: PropTypes.bool,
};
