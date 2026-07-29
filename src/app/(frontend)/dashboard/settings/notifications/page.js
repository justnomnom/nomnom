import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SettingsNotificationsPage } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('components.notifications.pref_title'),
};

export default function NotificationSettingsPage() {
  return (
    <>
      <DynamicTitle titleKey="components.notifications.pref_title" />
      <SettingsNotificationsPage />
    </>
  );
}
