'use client';

import { memo } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Badge from '@mui/material/Badge';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { usePrefersReducedMotion } from 'src/hooks/use-prefers-reduced-motion';
import { useMyDashboardPublicProfilePath } from 'src/hooks/use-my-dashboard-public-profile-path';

import { useTranslate } from 'src/locales';
import { Z_INDEX } from 'src/theme/spacing';
import { useAuthContext } from 'src/auth/hooks';
import { useGetNotifications } from 'src/api/notifications';

import { m } from 'src/components/animate';
import Iconify from 'src/components/iconify';

import { useDashboardBottomNavItems, getDashboardBottomNavActivePath } from './config-navigation';

// ----------------------------------------------------------------------

function NavBottom() {
  const theme = useTheme();
  const { t } = useTranslate();
  const pathname = usePathname();
  const prefersReducedMotion = usePrefersReducedMotion();
  const { user } = useAuthContext();
  const myPublicProfilePath = useMyDashboardPublicProfilePath();

  const items = useDashboardBottomNavItems({
    currentRole: user?.role,
    myPublicProfilePath,
  });

  const { unreadCount } = useGetNotifications();

  const activePath = getDashboardBottomNavActivePath(pathname || '', items);

  return (
    <Paper
      component="nav"
      aria-label={t('navigation.main_navigation_aria')}
      elevation={0}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: Z_INDEX.dashboardBottomNav,
        borderRadius: 0,
        borderTop: `1px solid ${theme.palette.divider}`,
        backgroundColor: alpha(theme.palette.background.default, 0.98),
        px: { xs: 2, sm: 3 },
        pt: 1.5,
        pb: `calc(12px + env(safe-area-inset-bottom, 0px))`,
        // iOS tap flash
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {items.map((item) => {
          const isActive = activePath === item.path;
          const iconify = item.bottomNavIconify;
          const isNotifications = item.path === paths.dashboard.notifications;
          const badgeCount = isNotifications ? unreadCount : 0;
          const navIcon = iconify ? (
            <Iconify
              icon={isActive ? iconify.active : iconify.inactive}
              width={24}
              sx={{ color: 'inherit' }}
            />
          ) : (
            <Box
              sx={{
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '& .svg-color': { width: 24, height: 24 },
              }}
            >
              {item.icon}
            </Box>
          );
          const iconNode =
            badgeCount > 0 ? (
              <Badge
                badgeContent={badgeCount > 9 ? '9+' : badgeCount}
                color="error"
                overlap="circular"
                sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 16, minWidth: 16 } }}
              >
                {navIcon}
              </Badge>
            ) : (
              navIcon
            );

          return (
            <Link
              key={item.path}
              component={RouterLink}
              href={item.path}
              underline="none"
              sx={{
                flex: '0 0 auto',
                width: 64,
                minHeight: 48,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                py: 0.5,
                color: isActive ? 'primary.main' : 'text.secondary',
                fontSize: '10px',
                lineHeight: 1.2,
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.04em',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                transition: 'color 0.2s ease, transform 0.15s ease',
                '&:hover': {
                  color: isActive ? 'primary.main' : 'text.primary',
                },
                '&:active': {
                  transform: 'scale(0.98)',
                },
                '@media (prefers-reduced-motion: reduce)': {
                  transition: 'color 0.2s ease',
                  '&:active': { transform: 'none' },
                },
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  lineHeight: 0,
                  color: 'inherit',
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {iconNode}
                {isActive && !badgeCount && (
                  <Box
                    {...(prefersReducedMotion
                      ? {}
                      : {
                          component: m.div,
                          initial: { scale: 0, opacity: 0 },
                          animate: { scale: 1, opacity: 1 },
                          transition: { duration: 0.15, ease: 'easeOut' },
                        })}
                    sx={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                    }}
                  />
                )}
              </Box>
              {item.title}
            </Link>
          );
        })}
      </Box>
    </Paper>
  );
}

export default memo(NavBottom);
