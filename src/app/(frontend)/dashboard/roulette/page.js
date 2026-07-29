import { getDefaultTranslation } from 'src/locales/default-translations';

import { DynamicTitle } from 'src/components/dynamic-title';

import { NomRouletteView } from 'src/sections/roulette/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: getDefaultTranslation('pages.dashboard.roulette.meta_title'),
};

export default function DashboardRoulettePage() {
  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.roulette.meta_title" />
      <NomRouletteView />
    </>
  );
}
