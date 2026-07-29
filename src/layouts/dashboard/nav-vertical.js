'use client';

import { useEffect } from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import { useTheme } from '@mui/material/styles';

import { usePathname } from 'src/routes/hooks';

import { useResponsive } from 'src/hooks/use-responsive';
import { useMyDashboardPublicProfilePath } from 'src/hooks/use-my-dashboard-public-profile-path';

import { NAV } from 'src/config-global';
import { useAuthContext } from 'src/auth/hooks';

import Logo from 'src/components/logo';
import Scrollbar from 'src/components/scrollbar';
import { sideDrawerPaperSx } from 'src/components/sheet-shell';
import { NavSectionVertical } from 'src/components/nav-section';

import { useNavData } from './config-navigation';
import NavRailToggle from '../common/nav-rail-toggle';

// ----------------------------------------------------------------------

export default function NavVertical({ openNav, onCloseNav }) {
  const theme = useTheme();
  const { user } = useAuthContext();

  const pathname = usePathname();

  const lgUp = useResponsive('up', 'lg');

  const myPublicProfilePath = useMyDashboardPublicProfilePath();
  const navData = useNavData({ myPublicProfilePath });

  useEffect(() => {
    if (openNav) {
      onCloseNav();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const renderContent = (
    <Scrollbar
      sx={{
        height: 1,
        '& .simplebar-content': {
          height: 1,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Logo sx={{ mt: 3, ml: 4, mb: 1 }} />

      <NavSectionVertical
        data={navData}
        slotProps={{
          currentRole: user?.role,
        }}
      />

      <Box sx={{ flexGrow: 1 }} />
    </Scrollbar>
  );

  return (
    <Box
      sx={{
        flexShrink: { lg: 0 },
        width: { lg: NAV.W_VERTICAL },
      }}
    >
      {lgUp && <NavRailToggle navWidth={NAV.W_VERTICAL} />}

      {lgUp ? (
        <Stack
          sx={{
            height: 1,
            position: 'fixed',
            width: NAV.W_VERTICAL,
            borderRight: `1px solid ${
              theme.palette.mode === 'light' ? theme.palette.grey[300] : theme.palette.divider
            }`,
          }}
        >
          {renderContent}
        </Stack>
      ) : (
        <Drawer
          open={openNav}
          onClose={onCloseNav}
          slotProps={{
            paper: {
              sx: sideDrawerPaperSx({ width: NAV.W_VERTICAL }),
            },
          }}
        >
          {renderContent}
        </Drawer>
      )}
    </Box>
  );
}

NavVertical.propTypes = {
  openNav: PropTypes.bool,
  onCloseNav: PropTypes.func,
};
