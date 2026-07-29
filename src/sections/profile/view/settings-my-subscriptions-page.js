'use client';

import PropTypes from 'prop-types';

import { useTranslate } from 'src/locales';

import SettingsDrillShell from './settings-drill-shell';
import SettingsMySubscriptions from '../settings-my-subscriptions';

// ----------------------------------------------------------------------

export default function SettingsMySubscriptionsPage({ initialSubscriptions, initialFollowing }) {
  const { t } = useTranslate();

  return (
    <SettingsDrillShell title={t('pages.dashboard.settings.my_subscriptions.title')}>
      <SettingsMySubscriptions
        initialSubscriptions={initialSubscriptions}
        initialFollowing={initialFollowing}
      />
    </SettingsDrillShell>
  );
}

SettingsMySubscriptionsPage.propTypes = {
  initialSubscriptions: PropTypes.object,
  initialFollowing: PropTypes.object,
};
