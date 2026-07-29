'use client';

import PropTypes from 'prop-types';

import { useTranslate } from 'src/locales';

import SettingsDrillShell from './settings-drill-shell';
import SettingsSubscribers from '../settings-subscribers';

// ----------------------------------------------------------------------

export default function SettingsSubscribersPage({
  initialConnectStatus,
  initialSubscribers,
  initialStats,
  initialFollowers,
}) {
  const { t } = useTranslate();

  return (
    <SettingsDrillShell title={t('pages.dashboard.settings.subscribers.title')}>
      <SettingsSubscribers
        initialConnectStatus={initialConnectStatus}
        initialSubscribers={initialSubscribers}
        initialStats={initialStats}
        initialFollowers={initialFollowers}
      />
    </SettingsDrillShell>
  );
}

SettingsSubscribersPage.propTypes = {
  initialConnectStatus: PropTypes.object,
  initialSubscribers: PropTypes.object,
  initialStats: PropTypes.object,
  initialFollowers: PropTypes.object,
};
