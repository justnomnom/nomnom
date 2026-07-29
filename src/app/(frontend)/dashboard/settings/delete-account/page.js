import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SettingsDeleteView } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.dashboard.settings.delete_account.title'),
};

export default function DashboardSettingsDeleteAccountPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.settings.delete_account.title" />
      <SettingsDeleteView />
    </>
  );
}
