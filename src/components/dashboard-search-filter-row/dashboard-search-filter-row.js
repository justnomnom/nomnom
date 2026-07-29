'use client';

import PropTypes from 'prop-types';
import { cloneElement, isValidElement } from 'react';

import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { ic } from 'src/assets/icons';
import { RADIUS } from 'src/theme/spacing';

import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

function sxToArray(sx) {
  if (!sx) return [];
  return Array.isArray(sx) ? sx : [sx];
}

function mergeFilterChild(filterEl, filterBaseSx) {
  if (!isValidElement(filterEl)) return filterEl;
  const prev = filterEl.props.sx;
  return cloneElement(filterEl, {
    sx: [filterBaseSx, ...sxToArray(prev)],
  });
}

export default function DashboardSearchFilterRow({
  value,
  onChange,
  placeholder,
  filter,
  variant,
  glassSx,
  /** When `variant` is `glass`, radius for the field + filter control (default: full pill). */
  glassBorderRadius = 999,
  TextFieldProps,
  stackProps,
}) {
  const filterBaseSx =
    variant === 'glass'
      ? {
          ...glassSx,
          borderRadius: glassBorderRadius,
          flexShrink: 0,
          width: 48,
          height: 48,
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }
      : {
          bgcolor: 'action.hover',
          borderRadius: RADIUS.pill,
          flexShrink: 0,
          width: 48,
          height: 48,
        };

  const inputSx =
    variant === 'glass'
      ? {
          overflow: 'hidden',
          pl: 2,
          alignItems: 'center',
          fontWeight: 600,
          fontSize: 16,
          ...glassSx,
          borderRadius: glassBorderRadius,
          '& fieldset': { border: 'none' },
          '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
        }
      : {
          borderRadius: RADIUS.pill,
          pl: 2,
          alignItems: 'center',
          bgcolor: (tt) =>
            tt.palette.mode === 'light' ? alpha(tt.palette.grey[500], 0.08) : 'action.hover',
        };

  const {
    sx: textFieldSxProp,
    InputProps: inputPropsProp,
    inputProps,
    ...restTextFieldProps
  } = TextFieldProps ?? {};

  const { spacing: stackSpacingProp, ...restStackProps } = stackProps ?? {};
  const stackSpacing = stackSpacingProp ?? { xs: 1, sm: 1.5 };

  return (
    <Stack direction="row" alignItems="center" spacing={stackSpacing} width={1} {...restStackProps}>
      <TextField
        fullWidth
        size="small"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        InputProps={{
          ...inputPropsProp,
          sx: [inputSx, inputPropsProp?.sx].filter(Boolean),
          startAdornment: (
            <InputAdornment position="start" sx={{ alignSelf: 'center', height: 'auto', mr: 0.5 }}>
              <Iconify icon={ic.searchLinear} width={20} sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
        }}
        inputProps={inputProps}
        sx={[
          {
            '& .MuiOutlinedInput-root': {
              minHeight: 48,
              alignItems: 'center',
              boxSizing: 'border-box',
              ...(variant === 'glass'
                ? { borderRadius: glassBorderRadius, overflow: 'hidden' }
                : {}),
            },
            '& .MuiOutlinedInput-input': {
              boxSizing: 'border-box',
              py: 'calc((48px - 1.4375em) / 2)',
              /* 16px on all viewports — avoids iOS zooming the whole page on input focus */
              fontSize: '1rem',
            },
          },
          ...sxToArray(textFieldSxProp),
        ]}
        {...restTextFieldProps}
      />
      {mergeFilterChild(filter, filterBaseSx)}
    </Stack>
  );
}

DashboardSearchFilterRow.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  filter: PropTypes.node,
  variant: PropTypes.oneOf(['toolbar', 'glass']).isRequired,
  /** Required when `variant` is `glass` — same object as map overlay panels (bgcolor, blur, border, shadow). */
  glassSx: PropTypes.object,
  glassBorderRadius: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  TextFieldProps: PropTypes.object,
  stackProps: PropTypes.object,
};
