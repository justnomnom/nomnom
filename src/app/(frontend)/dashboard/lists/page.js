import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import { ListsHubView } from 'src/sections/lists/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.dashboard.lists.page_heading'),
};

export default function DashboardListsPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.lists.page_heading" />
      <ListsHubView />
    </>
  );
}
