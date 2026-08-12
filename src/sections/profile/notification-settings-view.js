'use client';

import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { useWebPush } from 'src/api/push';
import { useTranslate } from 'src/locales';
import { INTEGRATION_FLAGS } from 'src/config-global';
import {
  getMyNotificationPreferences,
  updateMyNotificationPreferences,
} from 'src/auth/actions/notification-preferences-actions';

import NotificationSettingsSkeleton from './notification-settings-skeleton';
import { dashboardPageSectionStackProps } from './view/settings-shell-shared';

// ----------------------------------------------------------------------

function PreferenceRow({ title, checked, disabled, onChange }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ px: 2, py: 1.5, gap: 2 }}
    >
      <Typography variant="body2">{title}</Typography>
      <Switch checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    </Stack>
  );
}

PreferenceRow.propTypes = {
  title: PropTypes.string,
  checked: PropTypes.bool,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
};

export default function NotificationSettingsView() {
  const { t } = useTranslate();
  const [prefs, setPrefs] = useState({
    list_updates_in_app: true,
    list_updates_push: true,
    list_updates_email: false,
  });
  const [loaded, setLoaded] = useState(false);

  const { supported, permission, subscribed, busy, iosNotInstalled, enable, disable } =
    useWebPush();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getMyNotificationPreferences();
      if (!cancelled) {
        setPrefs({
          list_updates_in_app: res.list_updates_in_app,
          list_updates_push: res.list_updates_push,
          list_updates_email: res.list_updates_email,
        });
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const savePref = async (key, value) => {
    const previous = prefs[key];
    setPrefs((prev) => ({ ...prev, [key]: value }));
    const res = await updateMyNotificationPreferences({ [key]: value });
    if (res?.error) {
      setPrefs((prev) => ({ ...prev, [key]: previous }));
    }
  };

  const renderEnableControl = () => {
    if (iosNotInstalled) {
      return <Alert severity="info">{t('components.notifications.enable_device_ios_hint')}</Alert>;
    }
    if (!supported) {
      return (
        <Alert severity="info">{t('components.notifications.enable_device_unsupported')}</Alert>
      );
    }
    if (permission === 'denied') {
      return (
        <Alert severity="warning">{t('components.notifications.enable_device_blocked')}</Alert>
      );
    }
    if (subscribed) {
      return (
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
          <Typography variant="body2" color="success.main">
            {t('components.notifications.enabled_device')}
          </Typography>
          <Button size="small" color="inherit" disabled={busy} onClick={disable}>
            {t('components.notifications.disable_device')}
          </Button>
        </Stack>
      );
    }
    return (
      <Button variant="contained" color="primary" disabled={busy} onClick={enable}>
        {t('components.notifications.enable_device')}
      </Button>
    );
  };

  if (!loaded) {
    return <NotificationSettingsSkeleton />;
  }

  return (
    <Stack {...dashboardPageSectionStackProps}>
      <Card>
        <PreferenceRow
          title={t('components.notifications.pref_in_app')}
          checked={prefs.list_updates_in_app}
          onChange={(v) => savePref('list_updates_in_app', v)}
        />
        {INTEGRATION_FLAGS.push && (
          <>
            <Divider />
            <PreferenceRow
              title={t('components.notifications.pref_push')}
              checked={prefs.list_updates_push}
              onChange={(v) => savePref('list_updates_push', v)}
            />
          </>
        )}
        <Divider />
        <PreferenceRow
          title={t('components.notifications.pref_email')}
          checked={prefs.list_updates_email}
          onChange={(v) => savePref('list_updates_email', v)}
        />
      </Card>

      {INTEGRATION_FLAGS.push && (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t('components.notifications.enable_device')}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {t('components.notifications.enable_device_hint')}
          </Typography>

          <Box sx={{ mt: 2 }}>{renderEnableControl()}</Box>
        </Card>
      )}
    </Stack>
  );
}
