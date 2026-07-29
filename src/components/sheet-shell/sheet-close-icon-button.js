'use client';

import PropTypes from 'prop-types';
import { forwardRef } from 'react';

import IconButton from '@mui/material/IconButton';

import { ic } from 'src/assets/icons';
import { touchTargetSx } from 'src/theme/spacing';
import { useTranslate } from 'src/locales/use-locales';

import Iconify from 'src/components/iconify';

/**
 * Standard close button for sheet/dialog chrome.
 * Enforces 44x44 hit target so it never drifts below the touch-target guideline
 * used by SheetHeaderRow. Use as `endAction` on SheetHeaderRow.
 */
function toSxArray(sx) {
  if (Array.isArray(sx)) return sx;
  if (sx) return [sx];
  return [];
}

const SheetCloseIconButton = forwardRef(
  ({ onClick, disabled = false, ariaLabel, sx, iconWidth = 20, ...other }, ref) => {
    const { t } = useTranslate();
    return (
      <IconButton
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel || t('common.close', { defaultValue: 'Close' })}
        sx={[
          {
            flexShrink: 0,
            ...touchTargetSx,
            color: 'text.secondary',
            WebkitTapHighlightColor: 'transparent',
            '&:active': { bgcolor: 'action.hover' },
          },
          ...toSxArray(sx),
        ]}
        {...other}
      >
        <Iconify icon={ic.closeLine} width={iconWidth} />
      </IconButton>
    );
  }
);

SheetCloseIconButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  ariaLabel: PropTypes.string,
  iconWidth: PropTypes.number,
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default SheetCloseIconButton;
