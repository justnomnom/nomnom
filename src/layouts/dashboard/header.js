'use client';

import PropTypes from 'prop-types';

import Stack from '@mui/material/Stack';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';

import { useOffSetTop } from 'src/hooks/use-off-set-top';
import { useResponsive } from 'src/hooks/use-responsive';

import { ic } from 'src/assets/icons';
import { bgBlur } from 'src/theme/css';
import { useTranslate } from 'src/locales';
import { NAV, HEADER } from 'src/config-global';
import { Z_INDEX, HEADER_GAP_SX, touchTargetSx } from 'src/theme/spacing';

import Logo from 'src/components/logo';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import NotificationsBell from 'src/components/notifications/notifications-bell';

import AccountPopover from '../common/account-popover';

// ----------------------------------------------------------------------

export default function Header({ onOpenNav }) {
  const theme = useTheme();

  const { t } = useTranslate();

  const settings = useSettingsContext();

  const isNavHorizontal = settings.themeLayout === 'horizontal';

  const isNavMini = settings.themeLayout === 'mini';

  const lgUp = useResponsive('up', 'lg');

  const offset = useOffSetTop(HEADER.H_DESKTOP);

  const offsetTop = offset && !isNavHorizontal;

  const renderContent = (
    <>
      {lgUp ? (
        <Logo
          sx={{
            mr: isNavHorizontal ? 1 : 2,
            height: isNavMini ? 32 : 36,
            maxWidth: isNavMini ? 140 : 180,
            objectFit: 'contain',
          }}
        />
      ) : (
        <>
          {isNavHorizontal && <Logo sx={{ mr: 'auto' }} />}

          {!isNavHorizontal && (
            <IconButton
              onClick={onOpenNav}
              aria-label={t('common.a11y.open_navigation')}
              sx={{
                ...touchTargetSx,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Iconify icon={ic.menuOutline} />
            </IconButton>
          )}
        </>
      )}

      <Stack
        flexGrow={1}
        direction="row"
        alignItems="center"
        justifyContent="flex-end"
        spacing={{ xs: 0.75, sm: 1 }}
        sx={{
          minWidth: 0,
          pl: 1,
          pr: { xs: 0.5, sm: 1 },
        }}
      >
        <NotificationsBell />
        <AccountPopover />
      </Stack>
    </>
  );

  let toolbarMinHeight = HEADER.H_MOBILE;
  if (lgUp) {
    toolbarMinHeight = isNavHorizontal || offsetTop ? HEADER.H_DESKTOP_OFFSET : HEADER.H_DESKTOP;
  }

  return (
    <AppBar
      sx={{
        pt: 'env(safe-area-inset-top, 0px)',
        zIndex: Z_INDEX.belowAppBar,
        ...bgBlur({
          color: theme.palette.background.default,
        }),
        ...(lgUp && {
          width: `calc(100% - ${NAV.W_VERTICAL + 1}px)`,
          borderBottom: `1px solid ${
            theme.palette.mode === 'light' ? theme.palette.grey[300] : theme.palette.divider
          }`,
          ...(isNavHorizontal && {
            width: 1,
            bgcolor: 'background.default',
            borderBottom: `1px solid ${
              theme.palette.mode === 'light' ? theme.palette.grey[300] : theme.palette.divider
            }`,
          }),
          ...(isNavMini && {
            width: `calc(100% - ${NAV.W_MINI + 1}px)`,
          }),
        }),
      }}
    >
      <Toolbar
        sx={{
          minHeight: `${toolbarMinHeight}px`,
          px: { xs: 2, sm: 2.5, lg: 5 },
          gap: HEADER_GAP_SX,
        }}
      >
        {renderContent}
      </Toolbar>
    </AppBar>
  );
}

Header.propTypes = {
  onOpenNav: PropTypes.func,
};
