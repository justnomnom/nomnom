'use client';

import PropTypes from 'prop-types';

import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { useTranslate } from 'src/locales';
import { SPACE } from 'src/theme/spacing';

import {
  ResponsiveSheet,
  sheetStackedContainedGlowSx,
  sheetStackedCancelOutlinedSx,
} from 'src/components/sheet-shell';

const TITLE_ID = 'table-lock-confirm-title';
const DESC_ID = 'table-lock-confirm-desc';
const THUMB_SIZE = 48;

/**
 * Confirm the organiser meant to lock this restaurant as the Table winner.
 * Settling is irreversible for voting, so this sits between the lock CTA and lock_table.
 */
export default function TableLockConfirmSheet({
  open,
  onClose,
  onConfirm,
  busy = false,
  place,
  errorMessage,
}) {
  const { t } = useTranslate();
  const name = place?.name || t('pages.table.unnamed_place');
  const fallback =
    String(name)
      .trim()
      .charAt(0)
      .toUpperCase() || '?';

  const title = (
    <Typography
      id={TITLE_ID}
      variant="subtitle1"
      component="h2"
      sx={{ fontWeight: 800, flex: 1, minWidth: 0, lineHeight: 1.3, m: 0 }}
    >
      {t('pages.table.lock_confirm_title')}
    </Typography>
  );

  const footer = (
    <Stack spacing={SPACE.sm} sx={{ width: 1 }}>
      <Button
        fullWidth
        size="large"
        variant="contained"
        color="primary"
        onClick={onConfirm}
        disabled={busy || !place}
        sx={sheetStackedContainedGlowSx('primary')}
      >
        {t('pages.table.lock_confirm_cta')}
      </Button>
      <Button
        fullWidth
        size="large"
        variant="outlined"
        onClick={onClose}
        disabled={busy}
        sx={sheetStackedCancelOutlinedSx}
      >
        {t('pages.table.lock_confirm_cancel')}
      </Button>
    </Stack>
  );

  return (
    <ResponsiveSheet
      open={open}
      onClose={onClose}
      titleId={TITLE_ID}
      descId={DESC_ID}
      title={title}
      footer={footer}
      closeDisabled={busy}
    >
      {place ? (
        <Stack direction="row" alignItems="center" spacing={SPACE.sm} sx={{ minWidth: 0 }}>
          <Avatar
            src={place.photo || undefined}
            alt=""
            sx={{ width: THUMB_SIZE, height: THUMB_SIZE, flexShrink: 0 }}
          >
            {fallback}
          </Avatar>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, minWidth: 0 }}>
            {name}
          </Typography>
        </Stack>
      ) : null}
      <Typography id={DESC_ID} variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
        {place
          ? t('pages.table.lock_confirm_body', { name })
          : t('pages.table.lock_confirm_body_no_spot')}
      </Typography>
      {errorMessage ? (
        <Typography variant="body2" color="error">
          {errorMessage}
        </Typography>
      ) : null}
    </ResponsiveSheet>
  );
}

TableLockConfirmSheet.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  busy: PropTypes.bool,
  place: PropTypes.object,
  errorMessage: PropTypes.string,
};
