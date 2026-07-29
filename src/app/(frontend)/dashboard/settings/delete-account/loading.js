'use client';

import DashboardDrillLoadingSkeleton from 'src/components/loading-screen/dashboard-drill-loading-skeleton';

import SettingsDeleteAccountSkeleton from 'src/sections/profile/settings-delete-account-skeleton';

// ----------------------------------------------------------------------

export default function DashboardSettingsDeleteAccountLoading() {
  return (
    <DashboardDrillLoadingSkeleton>
      <SettingsDeleteAccountSkeleton />
    </DashboardDrillLoadingSkeleton>
  );
}
