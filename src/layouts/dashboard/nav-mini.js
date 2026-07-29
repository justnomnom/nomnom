import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';

import { useMyDashboardPublicProfilePath } from 'src/hooks/use-my-dashboard-public-profile-path';

import { NAV } from 'src/config-global';
import { hideScroll } from 'src/theme/css';
import { useAuthContext } from 'src/auth/hooks';

import Logo from 'src/components/logo';
import { NavSectionMini } from 'src/components/nav-section';

import { useNavData } from './config-navigation';
import NavRailToggle from '../common/nav-rail-toggle';

// ----------------------------------------------------------------------

export default function NavMini() {
  const theme = useTheme();
  const { user } = useAuthContext();

  const myPublicProfilePath = useMyDashboardPublicProfilePath();
  const navData = useNavData({ myPublicProfilePath });

  return (
    <Box
      sx={{
        flexShrink: { lg: 0 },
        width: { lg: NAV.W_MINI },
      }}
    >
      <NavRailToggle navWidth={NAV.W_MINI} />

      <Stack
        sx={{
          pb: 2,
          height: 1,
          position: 'fixed',
          width: NAV.W_MINI,
          borderRight: `1px solid ${
            theme.palette.mode === 'light' ? theme.palette.grey[300] : theme.palette.divider
          }`,
          ...hideScroll.x,
        }}
      >
        {/* Same vertical rhythm as expanded sidebar: Logo mt/mb matches `nav-vertical` */}
        <Logo
          icon
          sx={{
            mt: 3,
            mb: 1,
            mx: 'auto',
            height: 32,
            maxWidth: 48,
            width: 48,
            objectFit: 'contain',
          }}
        />

        <NavSectionMini
          data={navData}
          slotProps={{
            currentRole: user?.role,
          }}
        />
      </Stack>
    </Box>
  );
}
