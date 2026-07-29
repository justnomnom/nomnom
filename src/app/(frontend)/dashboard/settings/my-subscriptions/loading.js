'use client';

import DashboardDrillLoadingSkeleton from 'src/components/loading-screen/dashboard-drill-loading-skeleton';

import SettingsMySubscriptionsListSkeleton from 'src/sections/profile/settings-my-subscriptions-skeleton';

// ----------------------------------------------------------------------

export default function DashboardSettingsMySubscriptionsLoading() {
  return (
    <DashboardDrillLoadingSkeleton>
      <SettingsMySubscriptionsListSkeleton />
    </DashboardDrillLoadingSkeleton>
  );
}
