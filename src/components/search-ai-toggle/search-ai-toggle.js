'use client';

import PropTypes from 'prop-types';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { RADIUS, TOUCH_TARGET_SIZE } from 'src/theme/spacing';

import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

/**
 * Single-line search-mode switch that renders as the search input's end adornment, so the
 * places/AI toggle lives inside the bar instead of on a separate row.
 *
 * - `'places'` mode: an optional clear button plus a `✨ AI` ghost pill that flips the bar
 *   into the natural-language agent.
 * - `'ai'` mode: an exit button (back to places) plus a filled circular submit button.
 *
 * Presentational only — the consumer owns the `mode` state and the side effects of changing
 * it (clearing its own AI override, reopening the typeahead, analytics), passing the wiring in
 * via `onModeChange` / `onClear` / `onSubmit`. Shared by the map and discover search bars so
 * the two pages stay visually and behaviourally identical.
 *
 * @param {object} props
 * @param {'places' | 'ai'} props.mode Current search mode.
 * @param {(mode: 'places' | 'ai') => void} props.onModeChange Toggle handler (same one the page already owns).
 * @param {boolean} props.hasQuery Whether the input currently has text (drives the clear button + submit enable).
 * @param {() => void} [props.onClear] Clears the input text (places mode).
 * @param {() => void} [props.onSubmit] Hands the query to the AI agent (ai mode).
 * @param {boolean} [props.submitting] AI request in flight — shows a spinner and disables submit.
 */
export default function SearchAiToggleAdornment({
  mode,
  onModeChange,
  hasQuery,
  onClear,
  onSubmit,
  submitting = false,
}) {
  const { t } = useTranslate();
  const isAi = mode === 'ai';

  return (
    <InputAdornment position="end" sx={{ mr: 0.5 }}>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        {isAi ? (
          <>
            <IconButton
              size="small"
              onClick={() => onModeChange('places')}
              aria-label={t('pages.dashboard.map.search_ai_exit_aria')}
            >
              <Iconify icon={ic.closeLine} width={18} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => onSubmit?.()}
              disabled={submitting || !hasQuery}
              aria-label={t('pages.dashboard.discover.submit_search_aria')}
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
                '&.Mui-disabled': {
                  bgcolor: 'action.disabledBackground',
                  color: 'action.disabled',
                },
              }}
            >
              {submitting ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Iconify icon={ic.arrowRightBold} width={18} />
              )}
            </IconButton>
          </>
        ) : (
          <>
            {hasQuery ? (
              <IconButton size="small" onClick={() => onClear?.()} aria-label={t('common.clear')}>
                <Iconify icon={ic.closeLine} width={18} />
              </IconButton>
            ) : null}
            <Button
              size="small"
              color="inherit"
              disableElevation
              onClick={() => onModeChange('ai')}
              startIcon={<Iconify icon={ic.starsBold} width={16} />}
              aria-label={t('pages.dashboard.map.search_ai_enter_aria')}
              sx={{
                px: 1.25,
                minWidth: 0,
                minHeight: 32,
                borderRadius: RADIUS.pill,
                fontWeight: 600,
                color: 'text.secondary',
                border: (theme) => `1px solid ${theme.palette.divider}`,
                '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                // The visible pill stays compact so its border doesn't mirror the search
                // bar, but the tappable area must still meet the 44px minimum on touch.
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: '50%',
                  height: TOUCH_TARGET_SIZE,
                  transform: 'translateY(-50%)',
                },
              }}
            >
              {t('pages.dashboard.map.search_ai_label')}
            </Button>
          </>
        )}
      </Stack>
    </InputAdornment>
  );
}

SearchAiToggleAdornment.propTypes = {
  mode: PropTypes.oneOf(['places', 'ai']).isRequired,
  onModeChange: PropTypes.func.isRequired,
  hasQuery: PropTypes.bool,
  onClear: PropTypes.func,
  onSubmit: PropTypes.func,
  submitting: PropTypes.bool,
};
