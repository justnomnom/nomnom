'use client';

import dynamic from 'next/dynamic';

// Defer after hydration so the root layout server chunk stays smaller (bundle-defer-third-party).
const Analytics = dynamic(() => import('@vercel/analytics/next').then((m) => m.Analytics), {
  ssr: false,
});

const SpeedInsights = dynamic(
  () => import('@vercel/speed-insights/next').then((m) => m.SpeedInsights),
  { ssr: false }
);

/** Lazy Vercel Analytics + Speed Insights for the root layout. */
export default function VercelAnalyticsLazy() {
  return (
    <>
      <SpeedInsights />
      <Analytics />
    </>
  );
}
