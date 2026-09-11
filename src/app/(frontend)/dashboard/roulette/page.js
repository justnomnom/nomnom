import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import { NomRouletteView } from 'src/sections/roulette/view';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('pages.dashboard.roulette.meta_title');
}

export default function DashboardRoulettePage() {
  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.roulette.meta_title" />
      <NomRouletteView />
    </>
  );
}
