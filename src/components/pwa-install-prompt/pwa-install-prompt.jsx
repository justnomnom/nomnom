'use client';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { useTranslate } from 'src/locales';
import { isCapacitorNative } from 'src/libs/capacitor/platform';

import {
  ResponsiveSheet,
  sheetStackedContainedGlowSx,
  sheetStackedCancelOutlinedSx,
} from 'src/components/sheet-shell';

// ----------------------------------------------------------------------

const STORAGE_KEY = 'pwa-install-prompt-dismissed-at';
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SHOW_DELAY_MS = 4000;

const TITLE_ID = 'pwa-install-title';
const DESC_ID = 'pwa-install-description';

function detectPlatform() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { mobile: false, ios: false, android: false, safari: false };
  }
  const ua = navigator.userAgent || '';
  const ios = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const android = /Android/.test(ua);
  const mobile = ios || android;
  const safari = ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return { mobile, ios, android, safari };
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator.standalone === true
  );
}

function wasRecentlyDismissed() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export default function PWAInstallPrompt() {
  const { t } = useTranslate();

  const [open, setOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const platform = useMemo(detectPlatform, []);

  useEffect(() => {
    if (isCapacitorNative()) return undefined;
    if (!platform.mobile) return undefined;
    if (isStandalone()) return undefined;
    if (wasRecentlyDismissed()) return undefined;

    let timer;
    let cancelled = false;

    const onBeforeInstall = (e) => {
      e.preventDefault();
      if (cancelled) return;
      setDeferredPrompt(e);
      setOpen(true);
    };

    const onInstalled = () => {
      setOpen(false);
      setDeferredPrompt(null);
      rememberDismissed();
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // iOS has no beforeinstallprompt — show instructions after a short delay.
    if (platform.ios) {
      timer = window.setTimeout(() => {
        if (!cancelled) setOpen(true);
      }, SHOW_DELAY_MS);
    }

    return () => {
      cancelled = true;
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      if (timer) window.clearTimeout(timer);
    };
  }, [platform.mobile, platform.ios]);

  const handleClose = () => {
    setOpen(false);
    rememberDismissed();
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      handleClose();
      return;
    }
    try {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch {
      /* ignore */
    }
    setDeferredPrompt(null);
    setOpen(false);
    rememberDismissed();
  };

  if (!open) return null;

  const title = (
    <Typography
      id={TITLE_ID}
      variant="subtitle1"
      component="h2"
      sx={{ fontWeight: 800, flex: 1, minWidth: 0, lineHeight: 1.3, m: 0 }}
    >
      {t('pwa_install.title', { defaultValue: 'Install NomNom' })}
    </Typography>
  );

  const bold = (text) => (
    <Box component="span" sx={{ fontWeight: 700 }}>
      {text}
    </Box>
  );

  const body = (
    <Stack id={DESC_ID} spacing={1.5} sx={{ color: 'text.secondary' }}>
      <Typography variant="body2" sx={{ lineHeight: 1.55 }}>
        {t('pwa_install.body', {
          defaultValue: 'Add NomNom to your home screen for a faster, full-screen experience.',
        })}
      </Typography>
      {platform.ios && (
        <Stack component="ol" spacing={0.5} sx={{ pl: 2.5, m: 0, typography: 'body2' }}>
          <li>
            {t('pwa_install.ios_step_1_prefix', { defaultValue: 'Tap the ' })}
            {bold(t('pwa_install.ios_share', { defaultValue: 'Share' }))}
            {t('pwa_install.ios_step_1_suffix', {
              defaultValue: " button in Safari's toolbar.",
            })}
          </li>
          <li>
            {t('pwa_install.ios_step_2_prefix', { defaultValue: 'Choose ' })}
            {bold(t('pwa_install.ios_add_to_home', { defaultValue: 'Add to Home Screen' }))}
            {t('pwa_install.ios_step_2_suffix', { defaultValue: '.' })}
          </li>
          <li>
            {t('pwa_install.ios_step_3_prefix', { defaultValue: 'Tap ' })}
            {bold(t('pwa_install.ios_add', { defaultValue: 'Add' }))}
            {t('pwa_install.ios_step_3_suffix', { defaultValue: ' to confirm.' })}
          </li>
        </Stack>
      )}
      {platform.android && !deferredPrompt && (
        <Stack component="ol" spacing={0.5} sx={{ pl: 2.5, m: 0, typography: 'body2' }}>
          <li>
            {t('pwa_install.android_step_1_prefix', { defaultValue: 'Tap the ' })}
            {bold(t('pwa_install.android_menu', { defaultValue: 'menu' }))}
            {t('pwa_install.android_step_1_suffix', { defaultValue: ' (⋮) in your browser.' })}
          </li>
          <li>
            {t('pwa_install.android_step_2_prefix', { defaultValue: 'Choose ' })}
            {bold(t('pwa_install.android_install_app', { defaultValue: 'Install app' }))}
            {t('pwa_install.android_step_2_or', { defaultValue: ' or ' })}
            {bold(t('pwa_install.android_add_to_home', { defaultValue: 'Add to Home screen' }))}
            {t('pwa_install.android_step_2_suffix', { defaultValue: '.' })}
          </li>
        </Stack>
      )}
    </Stack>
  );

  const footer = (
    <Stack spacing={2} sx={{ width: 1 }}>
      {deferredPrompt && (
        <Button
          type="button"
          color="primary"
          variant="contained"
          size="large"
          fullWidth
          onClick={handleInstall}
          sx={sheetStackedContainedGlowSx('primary')}
        >
          {t('pwa_install.install', { defaultValue: 'Install' })}
        </Button>
      )}
      <Button
        type="button"
        variant="outlined"
        size="large"
        fullWidth
        onClick={handleClose}
        sx={sheetStackedCancelOutlinedSx}
      >
        {deferredPrompt
          ? t('pwa_install.not_now', { defaultValue: 'Not now' })
          : t('pwa_install.got_it', { defaultValue: 'Got it' })}
      </Button>
    </Stack>
  );

  return (
    <ResponsiveSheet
      open={open}
      onClose={handleClose}
      titleId={TITLE_ID}
      descId={DESC_ID}
      title={title}
      footer={footer}
    >
      {body}
    </ResponsiveSheet>
  );
}
