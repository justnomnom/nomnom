'use client';

import DashboardDrillLoadingSkeleton from 'src/components/loading-screen/dashboard-drill-loading-skeleton';

import SettingsSupportSkeleton from 'src/sections/contact/settings-support-skeleton';

// ----------------------------------------------------------------------

export default function DashboardSettingsSupportLoading() {
  return (
    <DashboardDrillLoadingSkeleton>
      <SettingsSupportSkeleton />
    </DashboardDrillLoadingSkeleton>
  );
}
