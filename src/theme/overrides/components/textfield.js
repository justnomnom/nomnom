import { alpha } from '@mui/material/styles';
import { inputBaseClasses } from '@mui/material/InputBase';
import { inputLabelClasses } from '@mui/material/InputLabel';
import { filledInputClasses } from '@mui/material/FilledInput';
import { outlinedInputClasses } from '@mui/material/OutlinedInput';

import { RADIUS } from '../../spacing';

// ----------------------------------------------------------------------

export function textField(theme) {
  const color = {
    focused: theme.palette.primary.main,
    active: theme.palette.text.secondary,
    placeholder: theme.palette.text.disabled,
  };

  const font = {
    label: theme.typography.body1,
    value: theme.typography.body2,
  };

  const ring = alpha(theme.palette.primary.main, 0.2);

  return {
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginTop: theme.spacing(1),
        },
      },
    },

    MuiFormLabel: {
      styleOverrides: {
        root: {
          ...font.value,
          color: color.placeholder,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          [`&.${inputLabelClasses.shrink}`]: {
            ...font.label,
            fontWeight: 600,
            color: color.active,
            [`&.${inputLabelClasses.focused}`]: {
              color: color.focused,
            },
            [`&.${inputLabelClasses.error}`]: {
              color: theme.palette.error.main,
            },
            [`&.${inputLabelClasses.disabled}`]: {
              color: theme.palette.text.disabled,
            },
            [`&.${inputLabelClasses.filled}`]: {
              transform: 'translate(12px, 6px) scale(0.75)',
            },
          },
        },
      },
    },

    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: RADIUS.loose,
          [`&.${inputBaseClasses.disabled}`]: {
            '& svg': {
              color: theme.palette.text.disabled,
            },
          },
        },
        input: {
          ...font.value,
          [theme.breakpoints.down('sm')]: {
            // 16px+ on small screens avoids iOS zoom on focus
            fontSize: '1rem',
          },
          '&::placeholder': {
            opacity: 1,
            color: color.placeholder,
          },
        },
      },
    },

    MuiInput: {
      styleOverrides: {
        underline: {
          '&:before': {
            borderBottomColor: alpha(theme.palette.grey[500], 0.32),
          },
          '&:after': {
            borderBottomColor: color.focused,
          },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          [`&.${outlinedInputClasses.focused}`]: {
            boxShadow: `0 0 0 3px ${ring}`,
            [`& .${outlinedInputClasses.notchedOutline}`]: {
              borderColor: theme.palette.primary.main,
            },
          },
          [`&.${outlinedInputClasses.error}`]: {
            [`& .${outlinedInputClasses.notchedOutline}`]: {
              borderColor: theme.palette.error.main,
            },
          },
          [`&.${outlinedInputClasses.disabled}`]: {
            [`& .${outlinedInputClasses.notchedOutline}`]: {
              borderColor: theme.palette.action.disabledBackground,
            },
          },
        },
        notchedOutline: {
          borderWidth: 2,
          borderColor: theme.palette.grey[300],
          transition: theme.transitions.create(['border-color', 'box-shadow'], {
            duration: theme.transitions.duration.shortest,
          }),
        },
      },
    },

    MuiFilledInput: {
      styleOverrides: {
        root: {
          borderRadius: RADIUS.loose,
          backgroundColor: theme.palette.grey[200],
          '&:hover': {
            backgroundColor: alpha(theme.palette.grey[500], 0.14),
          },
          [`&.${filledInputClasses.focused}`]: {
            backgroundColor: theme.palette.grey[200],
          },
          [`&.${filledInputClasses.error}`]: {
            backgroundColor: alpha(theme.palette.error.main, 0.08),
            [`&.${filledInputClasses.focused}`]: {
              backgroundColor: alpha(theme.palette.error.main, 0.12),
            },
          },
          [`&.${filledInputClasses.disabled}`]: {
            backgroundColor: theme.palette.action.disabledBackground,
          },
        },
      },
    },
  };
}
