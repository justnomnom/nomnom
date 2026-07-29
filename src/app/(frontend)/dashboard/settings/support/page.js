import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SettingsSupportPage } from 'src/sections/contact/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.contact_us.title'),
};

export default function DashboardSettingsSupportPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.contact_us.title" />
      <SettingsSupportPage />
    </>
  );
}
