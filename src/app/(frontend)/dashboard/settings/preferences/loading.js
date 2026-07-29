'use client';

import DashboardDrillLoadingSkeleton from 'src/components/loading-screen/dashboard-drill-loading-skeleton';

import SettingsPreferencesSkeleton from 'src/sections/profile/settings-preferences-skeleton';

// ----------------------------------------------------------------------

export default function DashboardSettingsPreferencesLoading() {
  return (
    <DashboardDrillLoadingSkeleton>
      <SettingsPreferencesSkeleton />
    </DashboardDrillLoadingSkeleton>
  );
}
