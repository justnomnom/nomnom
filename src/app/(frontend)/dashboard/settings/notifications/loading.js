'use client';

import DashboardDrillLoadingSkeleton from 'src/components/loading-screen/dashboard-drill-loading-skeleton';

import NotificationSettingsSkeleton from 'src/sections/profile/notification-settings-skeleton';

// ----------------------------------------------------------------------

export default function DashboardSettingsNotificationsLoading() {
  return (
    <DashboardDrillLoadingSkeleton>
      <NotificationSettingsSkeleton />
    </DashboardDrillLoadingSkeleton>
  );
}
