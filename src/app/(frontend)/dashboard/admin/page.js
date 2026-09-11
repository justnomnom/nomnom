import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import AdminHubView from 'src/sections/admin/admin-hub-view';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('pages.dashboard.admin.hub.document_title');
}

export default function DashboardAdminHubPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.admin.hub.document_title" />
      <AdminHubView />
    </>
  );
}
