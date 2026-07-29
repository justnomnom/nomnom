'use client';

import { useMemo } from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Popper from '@mui/material/Popper';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import ClickAwayListener from '@mui/material/ClickAwayListener';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { Z_INDEX } from 'src/theme/spacing';

import Iconify from 'src/components/iconify';

function pickPhotoUrl(row) {
  const meta = row?.metadata ?? {};
  return (
    row?.photo_url ||
    meta?.photo_url ||
    meta?.cover_image_url ||
    meta?.image_url ||
    (Array.isArray(meta?.images) && meta.images[0]) ||
    null
  );
}

function highlightMatch(name, query) {
  const n = String(name ?? '');
  const q = String(query ?? '').trim();
  if (!q) return n;
  const lowerName = n.toLowerCase();
  const lowerQ = q.toLowerCase();
  const idx = lowerName.indexOf(lowerQ);
  if (idx < 0) return n;
  return (
    <>
      {n.slice(0, idx)}
      <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>
        {n.slice(idx, idx + q.length)}
      </Box>
      {n.slice(idx + q.length)}
    </>
  );
}

function LocationRow({ row, query, onPick }) {
  const region = row?.region ? String(row.region) : '';
  return (
    <MenuItem
      onMouseDown={(e) => {
        e.preventDefault();
      }}
      onClick={() => onPick(row)}
      sx={{
        py: 1,
        gap: 1.25,
        alignItems: 'center',
        borderRadius: 1,
      }}
    >
      <Avatar
        variant="rounded"
        sx={{
          width: 36,
          height: 36,
          flexShrink: 0,
          bgcolor: 'action.hover',
          color: 'text.secondary',
        }}
      >
        <Iconify icon={ic.mapPointBold} width={18} />
      </Avatar>
      <Stack sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {highlightMatch(row?.label, query)}
        </Typography>
        {region ? (
          <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
            {region}
          </Typography>
        ) : null}
      </Stack>
    </MenuItem>
  );
}

function SuggestionRow({ row, query, onPick }) {
  const photo = pickPhotoUrl(row);
  const address = row?.address ? String(row.address) : '';
  return (
    <MenuItem
      onMouseDown={(e) => {
        // Avoid blurring the input before the click handler runs.
        e.preventDefault();
      }}
      onClick={() => onPick(row)}
      sx={{
        py: 1,
        gap: 1.25,
        alignItems: 'center',
        borderRadius: 1,
      }}
    >
      <Avatar
        src={photo || undefined}
        alt={row?.name ?? ''}
        variant="rounded"
        sx={{ width: 36, height: 36, flexShrink: 0, bgcolor: 'action.hover' }}
      >
        <Iconify icon={ic.searchLinear} width={18} />
      </Avatar>
      <Stack sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {highlightMatch(row?.name, query)}
        </Typography>
        {address ? (
          <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
            {address}
          </Typography>
        ) : null}
      </Stack>
    </MenuItem>
  );
}

/**
 * Google Maps-style typeahead suggestions for the map search input.
 *
 * Renders two sections — restaurants already in the current viewport, then matches elsewhere
 * in Portugal. The two-section split mirrors what users expect from Maps: "here's what's
 * already visible; here's what else exists that matches."
 */
export default function MapSearchSuggestions({
  open,
  anchorEl,
  query,
  inViewRows,
  elsewhereRows,
  locationRows,
  loading,
  onPick,
  onPickLocation,
  onClose,
  width,
}) {
  const { t } = useTranslate();

  const hasInView = inViewRows && inViewRows.length > 0;
  const hasElsewhere = elsewhereRows && elsewhereRows.length > 0;
  const hasLocations = !!onPickLocation && locationRows && locationRows.length > 0;
  const hasAny = hasInView || hasElsewhere || hasLocations;
  const trimmedQuery = String(query ?? '').trim();

  const popperModifiers = useMemo(
    () => [
      { name: 'offset', options: { offset: [0, 6] } },
      { name: 'preventOverflow', options: { padding: 8 } },
    ],
    []
  );

  if (!open || !anchorEl) return null;

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement="bottom-start"
      modifiers={popperModifiers}
      style={{ zIndex: Z_INDEX.searchTypeahead, width: width ?? anchorEl?.clientWidth }}
    >
      <ClickAwayListener onClickAway={onClose}>
        <Box
          role="listbox"
          aria-label={t('pages.dashboard.map.typeahead_aria')}
          sx={(theme) => ({
            mt: 0,
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: theme.palette.background.paper,
            boxShadow: theme.customShadows?.dropdown ?? theme.shadows[8],
            border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
            maxHeight: 'min(60vh, 480px)',
            display: 'flex',
            flexDirection: 'column',
          })}
        >
          {loading && !hasAny ? (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ p: 1.5, color: 'text.secondary' }}
            >
              <CircularProgress size={16} />
              <Typography variant="body2">
                {t('pages.dashboard.map.typeahead_searching')}
              </Typography>
            </Stack>
          ) : null}

          {!loading && !hasAny && trimmedQuery ? (
            <Box sx={{ p: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                {t('pages.dashboard.map.typeahead_no_results')}
              </Typography>
            </Box>
          ) : null}

          <Box sx={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {hasLocations ? (
              <>
                <Typography
                  variant="overline"
                  sx={{
                    display: 'block',
                    px: 1.5,
                    pt: 1,
                    color: 'text.secondary',
                    letterSpacing: 0.4,
                  }}
                >
                  {t('pages.dashboard.map.typeahead_locations')}
                </Typography>
                <MenuList dense sx={{ py: 0.5 }}>
                  {locationRows.map((row) => (
                    <LocationRow
                      key={`loc:${row.id}`}
                      row={row}
                      query={trimmedQuery}
                      onPick={onPickLocation}
                    />
                  ))}
                </MenuList>
              </>
            ) : null}

            {hasLocations && (hasInView || hasElsewhere) ? <Divider sx={{ my: 0.5 }} /> : null}

            {hasInView ? (
              <>
                <Typography
                  variant="overline"
                  sx={{
                    display: 'block',
                    px: 1.5,
                    pt: 1,
                    color: 'text.secondary',
                    letterSpacing: 0.4,
                  }}
                >
                  {t('pages.dashboard.map.typeahead_in_view')}
                </Typography>
                <MenuList dense sx={{ py: 0.5 }}>
                  {inViewRows.map((row) => (
                    <SuggestionRow
                      key={`v:${row.id}`}
                      row={row}
                      query={trimmedQuery}
                      onPick={onPick}
                    />
                  ))}
                </MenuList>
              </>
            ) : null}

            {hasInView && hasElsewhere ? <Divider sx={{ my: 0.5 }} /> : null}

            {hasElsewhere ? (
              <>
                <Typography
                  variant="overline"
                  sx={{
                    display: 'block',
                    px: 1.5,
                    pt: 1,
                    color: 'text.secondary',
                    letterSpacing: 0.4,
                  }}
                >
                  {t('pages.dashboard.map.typeahead_elsewhere')}
                </Typography>
                <MenuList dense sx={{ py: 0.5 }}>
                  {elsewhereRows.map((row) => (
                    <SuggestionRow
                      key={`e:${row.id}`}
                      row={row}
                      query={trimmedQuery}
                      onPick={onPick}
                    />
                  ))}
                </MenuList>
              </>
            ) : null}
          </Box>
        </Box>
      </ClickAwayListener>
    </Popper>
  );
}

const suggestionRowShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  name: PropTypes.string,
  address: PropTypes.string,
  latitude: PropTypes.number,
  longitude: PropTypes.number,
  metadata: PropTypes.object,
  photo_url: PropTypes.string,
});

const locationRowShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  label: PropTypes.string,
  region: PropTypes.string,
});

SuggestionRow.propTypes = {
  row: suggestionRowShape.isRequired,
  query: PropTypes.string,
  onPick: PropTypes.func.isRequired,
};

LocationRow.propTypes = {
  row: locationRowShape.isRequired,
  query: PropTypes.string,
  onPick: PropTypes.func.isRequired,
};

MapSearchSuggestions.propTypes = {
  open: PropTypes.bool,
  anchorEl: PropTypes.any,
  query: PropTypes.string,
  inViewRows: PropTypes.arrayOf(suggestionRowShape),
  elsewhereRows: PropTypes.arrayOf(suggestionRowShape),
  locationRows: PropTypes.arrayOf(locationRowShape),
  loading: PropTypes.bool,
  onPick: PropTypes.func.isRequired,
  onPickLocation: PropTypes.func,
  onClose: PropTypes.func.isRequired,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};
