import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import ComingSoonView from 'src/sections/coming-soon/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.coming_soon.title'),
};

export default function ComingSoonPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.coming_soon.title" />
      <ComingSoonView />
    </>
  );
}
