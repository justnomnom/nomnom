import { alpha } from '@mui/material/styles';
import { fabClasses } from '@mui/material/Fab';

import { RADIUS } from '../../spacing';
import { hoverable } from '../hoverable';
import { PRIMARY_ON_FILL_TEXT } from '../../palette';

// ----------------------------------------------------------------------

const COLORS = ['primary', 'secondary', 'info', 'success', 'warning', 'error'];

// ----------------------------------------------------------------------

export function fab(theme) {
  const lightMode = theme.palette.mode === 'light';

  const rootStyles = (ownerState) => {
    const defaultColor = ownerState.color === 'default';

    const inheritColor = ownerState.color === 'inherit';

    const circularVariant = ownerState.variant === 'circular';

    const extendedVariant = ownerState.variant === 'extended';

    const outlinedVariant = ownerState.variant === 'outlined';

    const outlinedExtendedVariant = ownerState.variant === 'outlinedExtended';

    const softVariant = ownerState.variant === 'soft';

    const softExtendedVariant = ownerState.variant === 'softExtended';

    const defaultStyle = {
      ...((circularVariant || extendedVariant) && {
        ...((defaultColor || inheritColor) && {
          boxShadow: theme.customShadows.z8,
          ...hoverable({
            boxShadow: theme.customShadows.z12,
          }),
        }),
        ...(inheritColor && {
          backgroundColor: theme.palette.text.primary,
          color: lightMode ? theme.palette.common.white : theme.palette.grey[800],
          ...hoverable({
            backgroundColor: lightMode ? theme.palette.grey[700] : theme.palette.grey[400],
          }),
        }),
      }),
      ...((outlinedVariant || outlinedExtendedVariant) && {
        boxShadow: 'none',
        backgroundColor: 'transparent',
        ...((defaultColor || inheritColor) && {
          border: `solid 2px ${alpha(theme.palette.grey[500], 0.32)}`,
        }),
        ...(defaultColor && {
          ...(!lightMode && {
            color: theme.palette.text.secondary,
          }),
        }),

        ...hoverable({
          borderColor: 'currentColor',
          boxShadow: `0 0 0 1px currentColor`,
          backgroundColor: theme.palette.action.hover,
        }),
      }),
      ...((softVariant || softExtendedVariant) && {
        boxShadow: 'none',
        ...(defaultColor && {
          color: theme.palette.text.primary,
          backgroundColor: theme.palette.grey[200],
          ...hoverable({
            backgroundColor: theme.palette.grey[300],
          }),
        }),
        ...(inheritColor && {
          backgroundColor: alpha(theme.palette.grey[500], 0.08),
          ...hoverable({
            backgroundColor: alpha(theme.palette.grey[500], 0.24),
          }),
        }),
      }),
    };

    const colorStyle = COLORS.map((color) => ({
      ...(ownerState.color === color && {
        ...((circularVariant || extendedVariant) && {
          boxShadow: theme.customShadows[color],
          ...(color === 'primary' && {
            color: PRIMARY_ON_FILL_TEXT,
          }),
          ...hoverable({
            boxShadow:
              color === 'primary' ? theme.customShadows.primaryHover : theme.customShadows.z16,
            backgroundColor: theme.palette[color].dark,
          }),
        }),
        ...((outlinedVariant || outlinedExtendedVariant) && {
          color: theme.palette[color].main,
          border: `solid 2px ${alpha(theme.palette[color].main, 0.48)}`,
          ...hoverable({
            backgroundColor: alpha(theme.palette[color].main, 0.08),
          }),
        }),
        ...((softVariant || softExtendedVariant) && {
          color: theme.palette[color][lightMode ? 'dark' : 'light'],
          backgroundColor: alpha(theme.palette[color].main, 0.16),
          ...hoverable({
            backgroundColor: alpha(theme.palette[color].main, 0.32),
          }),
        }),
      }),
    }));

    const disabledState = {
      [`&.${fabClasses.disabled}`]: {
        ...((outlinedVariant || outlinedExtendedVariant) && {
          backgroundColor: 'transparent',
          border: `solid 1px ${theme.palette.action.disabledBackground}`,
        }),
      },
    };

    const size = {
      ...((extendedVariant || outlinedExtendedVariant || softExtendedVariant) && {
        width: 'auto',
        '& svg': {
          marginRight: theme.spacing(1),
        },
        ...(ownerState.size === 'small' && {
          height: 34,
          minHeight: 34,
          borderRadius: 17,
          padding: theme.spacing(0, 1),
        }),
        ...(ownerState.size === 'medium' && {
          height: 40,
          minHeight: 40,
          borderRadius: 20,
          padding: theme.spacing(0, 2),
        }),
        ...(ownerState.size === 'large' && {
          height: 48,
          minHeight: 48,
          borderRadius: RADIUS.loose,
          padding: theme.spacing(0, 2),
        }),
      }),
    };

    return [defaultStyle, ...colorStyle, disabledState, size];
  };

  return {
    MuiFab: {
      styleOverrides: {
        root: ({ ownerState }) => rootStyles(ownerState),
      },
    },
  };
}
