import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import MaintenanceView from 'src/sections/maintenance/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.maintenance.title'),
};

export default function MaintenancePage() {
  return (
    <>
      <DynamicTitle titleKey="pages.maintenance.title" />
      <MaintenanceView />
    </>
  );
}
