'use client';

import PropTypes from 'prop-types';

import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { TOUCH_TARGET_SIZE } from 'src/theme/spacing';

import Iconify from 'src/components/iconify';

/**
 * Trailing eye-toggle for password TextFields. Drop into `InputProps.endAdornment`:
 *
 *   <RHFTextField
 *     type={visible.value ? 'text' : 'password'}
 *     InputProps={{
 *       endAdornment: <PasswordVisibilityAdornment visible={visible.value} onToggle={visible.onToggle} />,
 *     }}
 *   />
 */
export default function PasswordVisibilityAdornment({ visible, onToggle }) {
  const { t } = useTranslate();
  return (
    <InputAdornment position="end">
      <IconButton
        onClick={onToggle}
        edge="end"
        aria-label={
          visible
            ? t('pages.auth.new_password.hide_password')
            : t('pages.auth.new_password.show_password')
        }
        sx={{
          width: TOUCH_TARGET_SIZE,
          height: TOUCH_TARGET_SIZE,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <Iconify icon={visible ? ic.eyeBold : ic.eyeClosedBold} width={22} />
      </IconButton>
    </InputAdornment>
  );
}

PasswordVisibilityAdornment.propTypes = {
  visible: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};
