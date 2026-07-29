'use client';

import Stack from '@mui/material/Stack';

import DashboardDrillLoadingSkeleton from 'src/components/loading-screen/dashboard-drill-loading-skeleton';

import {
  SettingsBillingStripeCardSkeleton,
  SettingsBillingPaidListsCardSkeleton,
} from 'src/sections/profile/settings-billing-skeleton';

// ----------------------------------------------------------------------

export default function DashboardSettingsBillingLoading() {
  return (
    <DashboardDrillLoadingSkeleton>
      <Stack spacing={2} sx={{ pt: { xs: 2, sm: 2.5 } }}>
        <SettingsBillingStripeCardSkeleton />
        <SettingsBillingPaidListsCardSkeleton />
      </Stack>
    </DashboardDrillLoadingSkeleton>
  );
}
