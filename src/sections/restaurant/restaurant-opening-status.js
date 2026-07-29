'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useTranslate } from 'src/locales';

// ----------------------------------------------------------------------

/**
 * "Open · closes 23:00" / "Closed · opens 19:00" for a restaurant.
 *
 * Takes the derived `openingStatus` object that the server attaches to restaurant rows
 * (`src/libs/restaurant/opening-hours.js`), never raw hours — `slim-restaurant-card-metadata`
 * strips `hours_parsed` from every payload on purpose, so the resolution happens server-side.
 *
 * Renders nothing when the status is absent, which is what unknown or unparseable hours
 * resolve to. A restaurant whose ingest failed should show no claim about its hours rather
 * than an incorrect one.
 */
export default function RestaurantOpeningStatus({ openingStatus, sx }) {
  const { t } = useTranslate();
  if (!openingStatus?.status) return null;

  const base = 'pages.dashboard.restaurant';
  const { status, closesAt, opensAt } = openingStatus;

  if (status === 'permanently_closed' || status === 'temporarily_closed') {
    return (
      <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 700, color: 'error.main', ...sx }}>
        {t(`${base}.hours_${status}`)}
      </Typography>
    );
  }

  const isOpen = status === 'open';
  const detail = isOpen
    ? closesAt && t(`${base}.hours_closes_at`, { time: closesAt })
    : opensAt && t(`${base}.hours_opens_at`, { time: opensAt });

  return (
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.5, ...sx }}>
      <Box
        component="span"
        aria-hidden
        sx={{
          width: 8,
          height: 8,
          flexShrink: 0,
          borderRadius: '50%',
          bgcolor: isOpen ? 'success.main' : 'text.disabled',
        }}
      />
      <Typography
        variant="body2"
        sx={{ fontWeight: 700, color: isOpen ? 'success.main' : 'text.secondary' }}
      >
        {t(`${base}.${isOpen ? 'hours_open' : 'hours_closed'}`)}
      </Typography>
      {detail ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          · {detail}
        </Typography>
      ) : null}
    </Stack>
  );
}

RestaurantOpeningStatus.propTypes = {
  /** `{ status, closesAt?, opensAt? }` from `openingStatusForRow()`. */
  openingStatus: PropTypes.shape({
    status: PropTypes.oneOf(['open', 'closed', 'permanently_closed', 'temporarily_closed']),
    closesAt: PropTypes.string,
    opensAt: PropTypes.string,
  }),
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.func]),
};
