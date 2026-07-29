'use client';

import PropTypes from 'prop-types';

import { useTranslate } from 'src/locales';

import SettingsBilling from '../settings-billing';
import SettingsDrillShell from './settings-drill-shell';

// ----------------------------------------------------------------------

export default function SettingsBillingPage({ initialConnectStatus, initialPaidListsData }) {
  const { t } = useTranslate();

  return (
    <SettingsDrillShell title={t('pages.dashboard.settings.billing.title')}>
      <SettingsBilling
        initialConnectStatus={initialConnectStatus}
        initialPaidListsData={initialPaidListsData}
      />
    </SettingsDrillShell>
  );
}

SettingsBillingPage.propTypes = {
  initialConnectStatus: PropTypes.object,
  initialPaidListsData: PropTypes.object,
};
