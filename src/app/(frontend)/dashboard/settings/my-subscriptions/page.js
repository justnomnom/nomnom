import { getMyFollowing } from 'src/auth/actions/profile-actions';
import { localizedDocumentTitle } from 'src/content-platform/page-metadata';
import { getMyActiveSubscriptions } from 'src/auth/actions/creator-subscribers-actions';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SettingsMySubscriptionsPage } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('pages.dashboard.settings.my_subscriptions.title');
}

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
