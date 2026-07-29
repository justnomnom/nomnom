import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';

import { usePathname } from 'src/routes/hooks';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { touchTargetSx } from 'src/theme/spacing';

import Logo from 'src/components/logo';
import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';
import { sideDrawerPaperSx } from 'src/components/sheet-shell';

import NavList from './nav-list';

// ----------------------------------------------------------------------

export default function NavMobile({ data }) {
  const theme = useTheme();
  const pathname = usePathname();
  const { t } = useTranslate();

  const [openMenu, setOpenMenu] = useState(false);

  useEffect(() => {
    if (openMenu) {
      handleCloseMenu();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleOpenMenu = useCallback(() => {
    setOpenMenu(true);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setOpenMenu(false);
  }, []);

  return (
    <>
      <IconButton
        onClick={handleOpenMenu}
        aria-label={t('header.open_main_nav')}
        sx={{
          ml: { xs: 0.25, sm: 1 },
          p: { xs: 1, sm: 1 },
          ...touchTargetSx,
          color:
            theme.palette.mode === 'light'
              ? theme.palette.common.black
              : theme.palette.text.primary,
        }}
      >
        <Iconify icon={ic.menuOutline} width={22} sx={{ color: 'currentColor' }} />
      </IconButton>

      <Drawer
        open={openMenu}
        onClose={handleCloseMenu}
        slotProps={{
          paper: {
            sx: {
              ...sideDrawerPaperSx({
                width: 260,
                pb: 'max(40px, env(safe-area-inset-bottom, 0px))',
              }),
              bgcolor: 'background.paper',
              color: 'text.primary',
              pt: 'max(12px, env(safe-area-inset-top, 0px))',
            },
          },
        }}
      >
        <Scrollbar>
          <Box sx={{ color: 'text.primary' }}>
            <Logo sx={{ mx: 2.5, my: 3 }} />

            {data.map((list) => (
              <NavList key={list.path} data={list} />
            ))}
          </Box>
        </Scrollbar>
      </Drawer>
    </>
  );
}

NavMobile.propTypes = {
  data: PropTypes.array,
};
