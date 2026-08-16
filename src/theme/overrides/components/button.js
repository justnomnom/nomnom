import { alpha } from '@mui/material/styles';
import { buttonClasses } from '@mui/material/Button';

import { hoverable } from '../hoverable';
import { PRIMARY_ON_FILL_TEXT } from '../../palette';

// ----------------------------------------------------------------------

const COLORS = ['primary', 'secondary', 'info', 'success', 'warning', 'error'];

// ----------------------------------------------------------------------

export function button(theme) {
  const lightMode = theme.palette.mode === 'light';

  const rootStyles = (ownerState) => {
    const inheritColor = ownerState.color === 'inherit';

    const containedVariant = ownerState.variant === 'contained';

    const outlinedVariant = ownerState.variant === 'outlined';

    const textVariant = ownerState.variant === 'text';

    const softVariant = ownerState.variant === 'soft';

    const smallSize = ownerState.size === 'small';

    const mediumSize = ownerState.size === 'medium';

    const largeSize = ownerState.size === 'large';

    const defaultStyle = {
      ...(inheritColor && {
        ...(containedVariant && {
          color: lightMode ? theme.palette.common.white : theme.palette.grey[800],
          backgroundColor: lightMode ? theme.palette.grey[800] : theme.palette.common.white,
          boxShadow: theme.customShadows.z8,
          ...hoverable({
            backgroundColor: lightMode ? theme.palette.grey[700] : theme.palette.grey[400],
            boxShadow: theme.customShadows.z12,
          }),
        }),
        ...(outlinedVariant && {
          borderColor: alpha(theme.palette.grey[500], 0.32),
          ...hoverable({
            backgroundColor: theme.palette.action.hover,
          }),
        }),
        ...(textVariant && {
          ...hoverable({
            backgroundColor: theme.palette.action.hover,
          }),
        }),
        ...(softVariant && {
          color: theme.palette.text.primary,
          backgroundColor: alpha(theme.palette.grey[500], 0.08),
          ...hoverable({
            backgroundColor: alpha(theme.palette.grey[500], 0.24),
          }),
        }),
      }),
      ...(outlinedVariant && {
        borderWidth: 2,
        ...hoverable({
          borderColor: 'currentColor',
          boxShadow: `0 0 0 1px currentColor`,
        }),
      }),
    };

    const colorStyle = COLORS.map((color) => ({
      ...(ownerState.color === color && {
        ...(containedVariant && {
          boxShadow: theme.customShadows[color],
          ...(color === 'primary' && {
            color: PRIMARY_ON_FILL_TEXT,
          }),
          ...hoverable({
            boxShadow:
              color === 'primary' ? theme.customShadows.primaryHover : theme.customShadows.z16,
          }),
        }),
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
      [`&.${buttonClasses.disabled}`]: {
        ...(softVariant && {
          backgroundColor: theme.palette.action.disabledBackground,
        }),
        ...(containedVariant && {
          boxShadow: 'none',
        }),
      },
    };

    const size = {
      ...(smallSize && {
        height: 30,
        fontSize: 13,
        paddingLeft: 8,
        paddingRight: 8,
        ...(textVariant && {
          paddingLeft: 4,
          paddingRight: 4,
        }),
      }),
      ...(mediumSize && {
        paddingLeft: 12,
        paddingRight: 12,
        ...(textVariant && {
          paddingLeft: 8,
          paddingRight: 8,
        }),
      }),
      ...(largeSize && {
        height: 48,
        fontSize: 15,
        paddingLeft: 16,
        paddingRight: 16,
        ...(textVariant && {
          paddingLeft: 10,
          paddingRight: 10,
        }),
      }),
    };

    const loadingSoft = softVariant && {
      [`&.${buttonClasses.loadingPositionStart} .${buttonClasses.loadingIndicator}`]: {
        left: 10,
      },
      [`&.${buttonClasses.loadingPositionEnd} .${buttonClasses.loadingIndicator}`]: {
        right: smallSize ? 10 : 14,
      },
    };

    return [defaultStyle, ...colorStyle, disabledState, size, loadingSoft].filter(Boolean);
  };

  return {
    MuiButton: {
      styleOverrides: {
        root: ({ ownerState }) => rootStyles(ownerState),
      },
    },
  };
}
