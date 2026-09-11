import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import { ListsHubView } from 'src/sections/lists/view';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('pages.dashboard.lists.page_heading');
}

export default function DashboardListsPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.lists.page_heading" />
      <ListsHubView />
    </>
  );
}
