'use client';

import Box from '@mui/material/Box';

import MapRouteLoadingSkeleton from 'src/sections/map/view/map-route-loading-skeleton';

// ----------------------------------------------------------------------

export default function DashboardMapLoading() {
  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <MapRouteLoadingSkeleton />
    </Box>
  );
}
