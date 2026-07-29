'use client';

import DashboardDrillLoadingSkeleton from 'src/components/loading-screen/dashboard-drill-loading-skeleton';

import SettingsFaqsSkeleton from 'src/sections/faqs/settings-faqs-skeleton';

// ----------------------------------------------------------------------

export default function DashboardSettingsFaqsLoading() {
  return (
    <DashboardDrillLoadingSkeleton>
      <SettingsFaqsSkeleton />
    </DashboardDrillLoadingSkeleton>
  );
}
