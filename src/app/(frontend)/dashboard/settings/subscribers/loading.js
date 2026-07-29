'use client';

import DashboardDrillLoadingSkeleton from 'src/components/loading-screen/dashboard-drill-loading-skeleton';

import SettingsSubscribersListSkeleton from 'src/sections/profile/settings-subscribers-skeleton';

// ----------------------------------------------------------------------

export default function DashboardSettingsSubscribersLoading() {
  return (
    <DashboardDrillLoadingSkeleton>
      <SettingsSubscribersListSkeleton />
    </DashboardDrillLoadingSkeleton>
  );
}
