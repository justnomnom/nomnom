import { getMyFollowers } from 'src/auth/actions/profile-actions';
import { localizedDocumentTitle } from 'src/content-platform/page-metadata';
import { getMyStripeConnectStatus } from 'src/auth/actions/stripe-list-actions';
import {
  getCreatorListStats,
  getMyPaidListSubscribers,
} from 'src/auth/actions/creator-subscribers-actions';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SettingsSubscribersPage } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('pages.dashboard.settings.subscribers.title');
}

export default async function DashboardSettingsSubscribersPage() {
  const [initialConnectStatus, initialSubscribers, initialStats, initialFollowers] =
    await Promise.all([
      getMyStripeConnectStatus(),
      getMyPaidListSubscribers(),
      getCreatorListStats(),
      getMyFollowers(),
    ]);

  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.settings.subscribers.title" />
      <SettingsSubscribersPage
        initialConnectStatus={initialConnectStatus}
        initialSubscribers={initialSubscribers}
        initialStats={initialStats}
        initialFollowers={initialFollowers}
      />
    </>
  );
}
