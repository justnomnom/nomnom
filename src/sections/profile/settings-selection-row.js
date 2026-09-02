'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import CardActionArea from '@mui/material/CardActionArea';

import { ic } from 'src/assets/icons';
import { TOUCH_TARGET_SIZE } from 'src/theme/spacing';
import { readableAccent } from 'src/theme/readable-accent';

import Iconify from 'src/components/iconify';

import { HUB_ROW_MIN_HEIGHT } from 'src/sections/profile/view/settings-shell-shared';

/**
 * Tappable selection row used in Settings forms (Appearance, Language, etc.).
 * Single source of truth for the icon-tile + label + trailing-check/chevron pattern.
 * Same visual as `HubNavRow` for navigation, but with a `selected` state for
 * single-choice option lists.
 */
export default function SettingsSelectionRow({
  selected,
  onClick,
  icon,
  iconWidth = 20,
  iconColor = 'primary.main',
  iconSx,
  label,
  multiSelect = false,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <CardActionArea
      onClick={onClick}
      aria-pressed={selected}
      sx={{
        px: 2,
        py: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        minHeight: HUB_ROW_MIN_HEIGHT,
        borderRadius: '16px',
        bgcolor: isDark
          ? alpha(theme.palette.common.white, 0.05)
          : alpha(theme.palette.grey[500], 0.06),
        border: '2px solid',
        borderColor: selected ? 'primary.main' : 'transparent',
        WebkitTapHighlightColor: 'transparent',
        transition: theme.transitions.create(['border-color', 'background-color', 'box-shadow'], {
          duration: theme.transitions.duration.shorter,
        }),
        boxShadow: selected ? `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.2)}` : 'none',
        '&:hover': {
          bgcolor: isDark
            ? alpha(theme.palette.common.white, 0.08)
            : alpha(theme.palette.primary.main, 0.06),
        },
        '&:active': {
          bgcolor: isDark
            ? alpha(theme.palette.common.white, 0.1)
            : alpha(theme.palette.primary.main, 0.1),
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2} sx={{ minWidth: 0, flex: 1 }}>
        <Box
          sx={{
            width: TOUCH_TARGET_SIZE,
            height: TOUCH_TARGET_SIZE,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.paper',
            boxShadow: 1,
            color: iconColor === 'primary.main' ? (th) => readableAccent(th) : iconColor,
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <Iconify icon={icon} width={iconWidth} sx={iconSx} />
        </Box>
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, fontSize: '0.875rem', textAlign: 'left' }}
        >
          {label}
        </Typography>
      </Stack>
      {selected ? (
        <Iconify
          icon={ic.checkCircleBold}
          width={22}
          sx={{ color: readableAccent(theme), flexShrink: 0 }}
        />
      ) : (
        /* Multi-select rows rest on an empty check circle so the row reads as
           "tap to pick"; navigation-style lists keep the drill-in chevron. */
        <Iconify
          icon={multiSelect ? ic.checkCircleLinear : ic.chevronRightLinear}
          width={multiSelect ? 22 : 20}
          sx={{ color: multiSelect ? 'text.disabled' : 'text.secondary', flexShrink: 0 }}
        />
      )}
    </CardActionArea>
  );
}

SettingsSelectionRow.propTypes = {
  selected: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  icon: PropTypes.string.isRequired,
  iconWidth: PropTypes.number,
  iconColor: PropTypes.string,
  iconSx: PropTypes.object,
  label: PropTypes.node.isRequired,
  /** Rest on an empty check circle instead of a drill-in chevron. */
  multiSelect: PropTypes.bool,
};
