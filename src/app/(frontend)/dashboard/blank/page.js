import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import BlankView from 'src/sections/blank/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.dashboard.blank.title'),
};

export default function BlankPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.blank.title" />
      <BlankView />
    </>
  );
}
