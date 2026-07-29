import { getMyFollowing } from 'src/auth/actions/profile-actions';
import { getDefaultTranslation } from 'src/locales/default-translations';
import { getMyActiveSubscriptions } from 'src/auth/actions/creator-subscribers-actions';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SettingsMySubscriptionsPage } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.dashboard.settings.my_subscriptions.title'),
};

export default async function DashboardSettingsMySubscriptionsPage() {
  const [initialSubscriptions, initialFollowing] = await Promise.all([
    getMyActiveSubscriptions(),
    getMyFollowing(),
  ]);

  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.settings.my_subscriptions.title" />
      <SettingsMySubscriptionsPage
        initialSubscriptions={initialSubscriptions}
        initialFollowing={initialFollowing}
      />
    </>
  );
}
