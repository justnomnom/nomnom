import Box from '@mui/material/Box';

import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import { MapView } from 'src/sections/map/view';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('pages.dashboard.map.title');
}

export default function DashboardMapPage() {
  return (
    <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <DynamicTitle titleKey="pages.dashboard.map.title" />
      <MapView />
    </Box>
  );
}
