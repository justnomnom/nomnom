'use client';

import { usePathname } from 'next/navigation';

import { paths } from 'src/routes/paths';

import DashboardDrillLoadingSkeleton from 'src/components/loading-screen/dashboard-drill-loading-skeleton';

import SettingsHubLoadingSkeleton from 'src/sections/profile/view/settings-hub-loading-skeleton';

// ----------------------------------------------------------------------

function normalizePathname(p) {
  if (!p) return '';
  const s = p.replace(/\/+$/, '');
  return s || '/';
}

export default function DashboardSettingsLoading() {
  const pathname = usePathname();
  if (normalizePathname(pathname) === paths.dashboard.settings) {
    return <SettingsHubLoadingSkeleton />;
  }
  return <DashboardDrillLoadingSkeleton />;
}
