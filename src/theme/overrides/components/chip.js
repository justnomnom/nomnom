import { alpha } from '@mui/material/styles';
import { chipClasses } from '@mui/material/Chip';

import { RADIUS } from '../../spacing';
import { hoverable } from '../hoverable';
import { PRIMARY_ON_FILL_TEXT } from '../../palette';
import { readableAccent } from '../../readable-accent';

// ----------------------------------------------------------------------

const COLORS = ['primary', 'secondary', 'info', 'success', 'warning', 'error'];

// ----------------------------------------------------------------------

export function chip(theme) {
  const lightMode = theme.palette.mode === 'light';

  const rootStyles = (ownerState) => {
    const defaultColor = ownerState.color === 'default';

    const filledVariant = ownerState.variant === 'filled';

    const outlinedVariant = ownerState.variant === 'outlined';

    const softVariant = ownerState.variant === 'soft';

    const defaultStyle = {
      [`& .${chipClasses.deleteIcon}`]: {
        opacity: 0.48,
        color: 'currentColor',
        ...hoverable({
          opacity: 1,
          color: 'currentColor',
        }),
      },

      ...(defaultColor && {
        [`& .${chipClasses.avatar}`]: {
          color: theme.palette.text.primary,
        },
        // FILLED
        ...(filledVariant && {
          color: lightMode ? theme.palette.common.white : theme.palette.grey[800],
          backgroundColor: theme.palette.text.primary,
          ...hoverable({
            backgroundColor: lightMode ? theme.palette.grey[700] : theme.palette.grey[100],
          }),
          [`& .${chipClasses.icon}`]: {
            color: lightMode ? theme.palette.common.white : theme.palette.grey[800],
          },
        }),
        // OUTLINED
        ...(outlinedVariant && {
          border: `solid 2px ${alpha(theme.palette.grey[500], 0.32)}`,
        }),
        // SOFT
        ...(softVariant && {
          color: theme.palette.text.primary,
          backgroundColor: alpha(theme.palette.grey[500], 0.16),
          ...hoverable({
            backgroundColor: alpha(theme.palette.grey[500], 0.32),
          }),
        }),
      }),
    };

    const colorStyle = COLORS.map((color) => ({
      ...(ownerState.color === color && {
        [`& .${chipClasses.avatar}`]: {
          color: theme.palette[color].lighter,
          backgroundColor: theme.palette[color].dark,
        },
        ...(filledVariant &&
          color === 'primary' && {
            color: PRIMARY_ON_FILL_TEXT,
          }),
        ...(outlinedVariant &&
          color === 'primary' && {
            color: readableAccent(theme),
            borderColor: alpha(readableAccent(theme), 0.48),
          }),
        // SOFT
        ...(softVariant && {
          color: theme.palette[color][lightMode ? 'dark' : 'light'],
          backgroundColor: alpha(theme.palette[color].main, 0.16),
          ...hoverable({
            backgroundColor: alpha(theme.palette[color].main, 0.32),
          }),
        }),
      }),
    }));

    const disabledState = {
      [`&.${chipClasses.disabled}`]: {
        opacity: 1,
        color: theme.palette.action.disabled,
        [`& .${chipClasses.icon}`]: {
          color: theme.palette.action.disabled,
        },
        [`& .${chipClasses.avatar}`]: {
          color: theme.palette.action.disabled,
          backgroundColor: theme.palette.action.disabledBackground,
        },
        // FILLED
        ...(filledVariant && {
          backgroundColor: theme.palette.action.disabledBackground,
        }),
        // OUTLINED
        ...(outlinedVariant && {
          borderColor: theme.palette.action.disabledBackground,
        }),
        // SOFT
        ...(softVariant && {
          backgroundColor: theme.palette.action.disabledBackground,
        }),
      },
    };

    return [
      defaultStyle,
      ...colorStyle,
      disabledState,
      {
        // Soft chips are the in-card "tag" pattern — 700 per the design system;
        // filled/outlined chips stay 600.
        fontWeight: softVariant ? 700 : 600,
        borderRadius: RADIUS.pill,
      },
    ];
  };

  return {
    MuiChip: {
      styleOverrides: {
        root: ({ ownerState }) => rootStyles(ownerState),
      },
    },
  };
}
