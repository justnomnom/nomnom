'use client';

import PropTypes from 'prop-types';

import { useTranslate } from 'src/locales';

import SettingsListLoadingSkeleton from './settings-list-loading-skeleton';

// ----------------------------------------------------------------------

/** Matches `SubscriberRow` + `hubCardShellSx` while paid-list subscribers load. */
export default function SettingsSubscribersListSkeleton({ count = 5 }) {
  const { t } = useTranslate();
  return (
    <SettingsListLoadingSkeleton
      count={count}
      ariaLabel={t('pages.dashboard.settings.subscribers.loading')}
      titleWidth={160}
      badgeWidth={72}
      subtitleWidth="68%"
    />
  );
}

SettingsSubscribersListSkeleton.propTypes = {
  count: PropTypes.number,
};
