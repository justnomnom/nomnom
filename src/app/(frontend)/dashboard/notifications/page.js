import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import { NotificationsView } from 'src/sections/notifications';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('components.notifications.title');
}

export default function NotificationsPage() {
  return (
    <>
      <DynamicTitle titleKey="components.notifications.title" />
      <NotificationsView />
    </>
  );
}
