'use client';

import PropTypes from 'prop-types';
import Skeleton from 'react-loading-skeleton';

import Stack from '@mui/material/Stack';

import { RADIUS } from 'src/theme/spacing';

// Keep in sync with `map-spot-sheet-inner.js` list row chrome.
export const MAP_SHEET_LIST_ROW_GALLERY_H = 88;
export const MAP_SHEET_LIST_ACTION_BTN = 32;

/** Skeleton blocks matching `MapSpotSheetListRow` (title row, gallery, tag chips). */
export default function MapSheetListPlaceRowsSkeleton({ count = 4, sx }) {
  return (
    <Stack spacing={1.1} sx={sx}>
      {Array.from({ length: count }, (_, i) => (
        <Stack key={i} direction="column" spacing={0.85} sx={{ py: 1.1 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            sx={{ pr: 0.5 }}
          >
            <Skeleton height={18} width={`${52 + (i % 3) * 6}%`} style={{ borderRadius: 6 }} />
            <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
              <Skeleton
                height={MAP_SHEET_LIST_ACTION_BTN}
                width={MAP_SHEET_LIST_ACTION_BTN}
                style={{ borderRadius: '50%' }}
              />
              <Skeleton
                height={MAP_SHEET_LIST_ACTION_BTN}
                width={MAP_SHEET_LIST_ACTION_BTN}
                style={{ borderRadius: '50%' }}
              />
            </Stack>
          </Stack>
          <Skeleton height={MAP_SHEET_LIST_ROW_GALLERY_H} style={{ borderRadius: 12 }} />
          <Skeleton height={22} width="88%" style={{ borderRadius: RADIUS.pill }} />
        </Stack>
      ))}
    </Stack>
  );
}

MapSheetListPlaceRowsSkeleton.propTypes = {
  count: PropTypes.number,
  sx: PropTypes.object,
};
