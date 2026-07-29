'use client';

import PropTypes from 'prop-types';

import { useTranslate } from 'src/locales';

import SettingsListLoadingSkeleton from './settings-list-loading-skeleton';

// ----------------------------------------------------------------------

/** Matches `MySubscriptionRow` + `hubCardShellSx` while subscriptions load. */
export default function SettingsMySubscriptionsListSkeleton({ count = 3 }) {
  const { t } = useTranslate();
  return (
    <SettingsListLoadingSkeleton
      count={count}
      ariaLabel={t('pages.dashboard.settings.my_subscriptions.loading')}
      titleWidth={140}
      badgeWidth={64}
      subtitleWidth="58%"
    />
  );
}

SettingsMySubscriptionsListSkeleton.propTypes = {
  count: PropTypes.number,
};
