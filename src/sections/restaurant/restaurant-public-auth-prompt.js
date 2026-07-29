'use client';

import PropTypes from 'prop-types';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useTranslate } from 'src/locales';
import { useAuthContext } from 'src/auth/hooks';

import {
  ResponsiveSheet,
  sheetStackedContainedGlowSx,
  sheetStackedCancelOutlinedSx,
} from 'src/components/sheet-shell';

const PROMPT_DELAY_MS = 10_000;
const TITLE_ID = 'restaurant-public-auth-title';

// ----------------------------------------------------------------------

export default function RestaurantPublicAuthPrompt({
  restaurantId,
  open: openProp,
  onClose: onCloseProp,
  autoOpen = true,
}) {
  const { t } = useTranslate();
  const { authenticated, loading } = useAuthContext();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const returnTo = useMemo(() => paths.dashboard.restaurant(restaurantId), [restaurantId]);

  const loginHref = useMemo(() => {
    const q = new URLSearchParams({ returnTo }).toString();
    return `${paths.auth.supabase.login}?${q}`;
  }, [returnTo]);

  const registerHref = useMemo(() => {
    const q = new URLSearchParams({ returnTo }).toString();
    return `${paths.auth.supabase.register}?${q}`;
  }, [returnTo]);

  const handleClose = useCallback(() => {
    if (isControlled) {
      onCloseProp?.();
    } else {
      setInternalOpen(false);
    }
  }, [isControlled, onCloseProp]);

  useEffect(() => {
    if (isControlled || !autoOpen) return undefined;
    if (loading || authenticated) return undefined;

    const tmr = window.setTimeout(() => {
      setInternalOpen(true);
    }, PROMPT_DELAY_MS);

    return () => window.clearTimeout(tmr);
  }, [authenticated, loading, isControlled, autoOpen]);

  useEffect(() => {
    if (!isControlled && authenticated) setInternalOpen(false);
  }, [authenticated, isControlled]);

  const title = (
    <Typography
      id={TITLE_ID}
      variant="subtitle1"
      component="h2"
      sx={{ fontWeight: 800, flex: 1, minWidth: 0, lineHeight: 1.3, m: 0 }}
    >
      {t('pages.dashboard.restaurant.public_guest_prompt_title')}
    </Typography>
  );

  const footer = (
    <Stack spacing={1.5} sx={{ width: 1 }}>
      <Button
        component={RouterLink}
        href={registerHref}
        color="primary"
        variant="contained"
        fullWidth
        size="large"
        sx={sheetStackedContainedGlowSx('primary')}
      >
        {t('pages.dashboard.restaurant.public_guest_sign_up')}
      </Button>
      <Button
        component={RouterLink}
        href={loginHref}
        variant="outlined"
        fullWidth
        size="large"
        sx={sheetStackedCancelOutlinedSx}
      >
        {t('pages.dashboard.restaurant.public_guest_sign_in')}
      </Button>
    </Stack>
  );

  return (
    <ResponsiveSheet
      open={open}
      onClose={handleClose}
      titleId={TITLE_ID}
      title={title}
      footer={footer}
    >
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
        {t('pages.dashboard.restaurant.public_guest_prompt_body')}
      </Typography>
    </ResponsiveSheet>
  );
}

RestaurantPublicAuthPrompt.propTypes = {
  restaurantId: PropTypes.string.isRequired,
  open: PropTypes.bool,
  onClose: PropTypes.func,
  autoOpen: PropTypes.bool,
};
