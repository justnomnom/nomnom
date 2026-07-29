'use client';

import DashboardDrillLoadingSkeleton from 'src/components/loading-screen/dashboard-drill-loading-skeleton';

import SettingsAppearanceSkeleton from 'src/sections/profile/settings-appearance-skeleton';

// ----------------------------------------------------------------------

export default function DashboardSettingsAppearanceLoading() {
  return (
    <DashboardDrillLoadingSkeleton>
      <SettingsAppearanceSkeleton />
    </DashboardDrillLoadingSkeleton>
  );
}
