import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SettingsAppearancePage } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.dashboard.settings.appearance.page_title'),
};

export default function DashboardSettingsAppearancePage() {
  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.settings.appearance.page_title" />
      <SettingsAppearancePage />
    </>
  );
}
