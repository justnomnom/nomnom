'use client';

import { SplashScreen } from 'src/components/loading-screen';

// ----------------------------------------------------------------------

/**
 * First entry into `/dashboard/*` (e.g. onboarding → Discover) suspends the
 * dashboard layout. Prefer the branded splash over the settings-style drill
 * skeleton, which looked like a random intermediate page.
 */
export default function DashboardLoading() {
  return <SplashScreen />;
}
