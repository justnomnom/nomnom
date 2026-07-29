import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import AdminHubView from 'src/sections/admin/admin-hub-view';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.dashboard.admin.hub.document_title'),
};

export default function DashboardAdminHubPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.admin.hub.document_title" />
      <AdminHubView />
    </>
  );
}
