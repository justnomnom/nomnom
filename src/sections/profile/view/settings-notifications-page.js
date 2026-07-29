'use client';

import { useTranslate } from 'src/locales';

import SettingsDrillShell from './settings-drill-shell';
import NotificationSettingsView from '../notification-settings-view';

// ----------------------------------------------------------------------

export default function SettingsNotificationsPage() {
  const { t } = useTranslate();

  return (
    <SettingsDrillShell title={t('components.notifications.pref_title')}>
      <NotificationSettingsView />
    </SettingsDrillShell>
  );
}
