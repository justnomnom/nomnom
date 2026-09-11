import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SettingsNotificationsPage } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('components.notifications.pref_title');
}

export default function NotificationSettingsPage() {
  return (
    <>
      <DynamicTitle titleKey="components.notifications.pref_title" />
      <SettingsNotificationsPage />
    </>
  );
}
