import { getDefaultTranslation } from 'src/locales/default-translations';
import { fetchOwnedListsForBilling } from 'src/libs/lists/actions';
import { getMyStripeConnectStatus } from 'src/auth/actions/stripe-list-actions';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SettingsBillingPage } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.dashboard.settings.billing.title'),
};

export default async function DashboardSettingsBillingPage() {
  const [initialConnectStatus, initialPaidListsData] = await Promise.all([
    getMyStripeConnectStatus(),
    fetchOwnedListsForBilling(),
  ]);

  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.settings.billing.title" />
      <SettingsBillingPage
        initialConnectStatus={initialConnectStatus}
        initialPaidListsData={initialPaidListsData}
      />
    </>
  );
}
