import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import MaintenanceView from 'src/sections/maintenance/view';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('pages.maintenance.title');
}

export default function MaintenancePage() {
  return (
    <>
      <DynamicTitle titleKey="pages.maintenance.title" />
      <MaintenanceView />
    </>
  );
}
