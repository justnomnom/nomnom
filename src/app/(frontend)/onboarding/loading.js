'use client';

import { SplashScreen } from 'src/components/loading-screen';

// ----------------------------------------------------------------------

/**
 * Onboarding layout suspends while auth + profile checks run.
 * Match dashboard entry: branded splash over a drill skeleton.
 */
export default function OnboardingLoading() {
  return <SplashScreen />;
}
