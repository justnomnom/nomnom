import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SavedView } from 'src/sections/saved/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.dashboard.saved.page_heading'),
};

export default function DashboardListsPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.saved.page_heading" />
      <SavedView />
    </>
  );
}
