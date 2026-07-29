import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import { NotificationsView } from 'src/sections/notifications';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('components.notifications.title'),
};

export default function NotificationsPage() {
  return (
    <>
      <DynamicTitle titleKey="components.notifications.title" />
      <NotificationsView />
    </>
  );
}
