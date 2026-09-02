'use client';

import PropTypes from 'prop-types';
import { useState, useCallback } from 'react';

import Menu from '@mui/material/Menu';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import { alpha, useTheme } from '@mui/material/styles';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { RADIUS } from 'src/theme/spacing';
import { readableAccent } from 'src/theme/readable-accent';

import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

/** Every sort mode the NomNom List supports, in display order. */
export const MAP_SHEET_SORT_MODES = ['relevance', 'distance', 'recent'];

const MODE_META = {
  relevance: { icon: ic.starsBold, labelKey: 'pages.dashboard.map.filter_sort_relevance' },
  distance: { icon: ic.compassBold, labelKey: 'pages.dashboard.map.filter_sort_distance' },
  recent: { icon: ic.clockCircleBold, labelKey: 'pages.dashboard.map.filter_sort_recent' },
};

/**
 * Single compact sort control: one pill button showing the active sort mode that opens a menu of
 * the available modes. Replaces the multi-pill row so the sheet header stays clean with just one
 * control, right-aligned. Owns no state — the consumer holds `sortMode` and reacts to
 * `onSortModeChange`, so surfaces bound to the same state stay in sync.
 */
export default function MapSheetSortMenu({
  sortMode,
  onSortModeChange,
  availableModes = MAP_SHEET_SORT_MODES,
  ariaLabel,
  sx,
}) {
  const { t } = useTranslate();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(/** @type {HTMLElement | null} */ (null));
  const open = Boolean(anchorEl);

  const handleOpen = useCallback((e) => setAnchorEl(e.currentTarget), []);
  const handleClose = useCallback(() => setAnchorEl(null), []);
  const handleSelect = useCallback(
    (mode) => {
      setAnchorEl(null);
      if (mode !== sortMode) onSortModeChange(mode);
    },
    [onSortModeChange, sortMode]
  );

  const activeMeta = MODE_META[sortMode] ?? MODE_META[availableModes[0]];
  const activeLabel = activeMeta ? t(activeMeta.labelKey) : '';

  const border =
    theme.palette.mode === 'light'
      ? alpha(theme.palette.text.primary, 0.12)
      : alpha(theme.palette.common.white, 0.14);

  return (
    <>
      <Button
        color="inherit"
        disableElevation
        onClick={handleOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel ?? t('pages.dashboard.map.filter_sheet_sort')}
        startIcon={activeMeta ? <Iconify icon={activeMeta.icon} width={16} /> : null}
        endIcon={
          <Iconify
            icon={ic.chevronDownFill}
            width={16}
            sx={{
              transition: theme.transitions.create('transform', {
                duration: theme.transitions.duration.shortest,
              }),
              transform: open ? 'rotate(180deg)' : 'none',
            }}
          />
        }
        sx={{
          flexShrink: 0,
          minWidth: 0,
          px: 1.25,
          py: 0.5,
          gap: 0.25,
          fontWeight: 800,
          fontSize: '0.75rem',
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          textTransform: 'none',
          color: 'text.primary',
          borderRadius: 999,
          border: `1px solid ${border}`,
          bgcolor: 'background.paper',
          '& .MuiButton-startIcon': { mr: 0.5, ml: -0.25 },
          '& .MuiButton-endIcon': { ml: 0.25, color: 'text.secondary' },
          '&:hover': {
            bgcolor:
              theme.palette.mode === 'light'
                ? alpha(theme.palette.text.primary, 0.05)
                : alpha(theme.palette.background.paper, 0.62),
            borderColor:
              theme.palette.mode === 'light'
                ? alpha(theme.palette.text.primary, 0.2)
                : alpha(theme.palette.common.white, 0.24),
          },
          ...sx,
        }}
      >
        {activeLabel}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          list: {
            dense: true,
            'aria-label': ariaLabel ?? t('pages.dashboard.map.filter_sheet_sort'),
          },
          paper: {
            sx: {
              mt: 0.5,
              minWidth: 200,
              borderRadius: `${RADIUS.loose}px`,
              boxShadow: theme.customShadows.dropdown,
            },
          },
        }}
      >
        {availableModes.map((mode) => {
          const meta = MODE_META[mode];
          if (!meta) return null;
          const selected = sortMode === mode;
          return (
            <MenuItem
              key={mode}
              selected={selected}
              onClick={() => handleSelect(mode)}
              sx={{
                borderRadius: `${RADIUS.base}px`,
                mx: 0.5,
                my: 0.15,
                py: 0.75,
                '&.Mui-selected': {
                  bgcolor: (tt) => alpha(tt.palette.primary.main, 0.1),
                  '&:hover': { bgcolor: (tt) => alpha(tt.palette.primary.main, 0.16) },
                },
              }}
            >
              <ListItemIcon sx={{ color: selected ? 'primary.main' : 'text.secondary' }}>
                <Iconify icon={meta.icon} width={18} />
              </ListItemIcon>
              <ListItemText
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: selected ? 800 : 600,
                  color: selected ? 'primary.main' : 'text.primary',
                }}
              >
                {t(meta.labelKey)}
              </ListItemText>
              {selected ? (
                <Iconify
                  icon={ic.checkmarkFill}
                  width={18}
                  sx={{ ml: 1, color: readableAccent(theme), flexShrink: 0 }}
                />
              ) : null}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

MapSheetSortMenu.propTypes = {
  sortMode: PropTypes.oneOf(MAP_SHEET_SORT_MODES),
  onSortModeChange: PropTypes.func.isRequired,
  availableModes: PropTypes.arrayOf(PropTypes.oneOf(MAP_SHEET_SORT_MODES)),
  ariaLabel: PropTypes.string,
  sx: PropTypes.object,
};
