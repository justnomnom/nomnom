import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SettingsFaqsPage } from 'src/sections/faqs/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.faqs.title'),
};

export default function DashboardSettingsFaqsPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.faqs.title" />
      <SettingsFaqsPage />
    </>
  );
}
