'use client';

import PropTypes from 'prop-types';
import { useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';
import CardActionArea from '@mui/material/CardActionArea';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useResponsive } from 'src/hooks/use-responsive';
import { usePrefersReducedMotion } from 'src/hooks/use-prefers-reduced-motion';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { useAuthContext } from 'src/auth/hooks';

import Iconify from 'src/components/iconify';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import { DashboardPageMotion, DashboardMotionSection } from 'src/components/dashboard';

import { SettingsPageContainer } from './settings-drill-shell';
import {
  ICON_TILE,
  TOUCH_MIN,
  ROUNDED_CARD,
  SHELL_HUB_ICON,
  hubCardShellSx,
  sectionLabelSx,
  HUB_ROW_MIN_HEIGHT,
  SHELL_TOOLBAR_ICON,
  settingsShellRowHoverBg,
  filledDrillBackIconButtonSx,
  dashboardPageSectionStackProps,
} from './settings-shell-shared';

// ----------------------------------------------------------------------

export function HubNavRow({ href, icon, title, subtitle, danger }) {
  const theme = useTheme();
  const prefersReducedMotion = usePrefersReducedMotion();
  const rowHoverBg = settingsShellRowHoverBg(theme);
  const chevronMotionSx = prefersReducedMotion
    ? {}
    : {
        '&:hover .settings-hub-chevron': {
          transform: 'translateX(4px)',
        },
        '&:hover .settings-hub-icon-tile': {
          transform: 'scale(1.06)',
        },
        '&:active': {
          transform: 'scale(0.99)',
        },
        '&:active .settings-hub-chevron': {
          transform: 'translateX(4px)',
        },
      };

  return (
    <CardActionArea
      component={RouterLink}
      href={href}
      sx={{
        px: 2,
        py: 2.25,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        minHeight: HUB_ROW_MIN_HEIGHT,
        borderRadius: ROUNDED_CARD,
        bgcolor: 'transparent',
        WebkitTapHighlightColor: 'transparent',
        transition: theme.transitions.create(['background-color', 'transform'], {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': {
          bgcolor: rowHoverBg,
        },
        ...chevronMotionSx,
        '&:active': {
          bgcolor: rowHoverBg,
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2} sx={{ minWidth: 0, flex: 1 }}>
        <Box
          className="settings-hub-icon-tile"
          sx={{
            width: ICON_TILE,
            height: ICON_TILE,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.paper',
            boxShadow: 1,
            color: danger ? 'error.main' : 'primary.main',
            flexShrink: 0,
            transition: theme.transitions.create('transform', {
              duration: theme.transitions.duration.shorter,
            }),
          }}
        >
          <Iconify icon={icon} width={SHELL_HUB_ICON} />
        </Box>
        <Box sx={{ minWidth: 0, textAlign: 'left' }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              fontSize: '0.875rem',
              color: danger ? 'error.main' : 'text.primary',
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 0.25,
                color: 'text.secondary',
                fontSize: '0.625rem',
                fontWeight: 500,
                lineHeight: 1.3,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
      <Iconify
        icon={ic.chevronRightLinear}
        width={SHELL_HUB_ICON}
        className="settings-hub-chevron"
        sx={{
          color: 'text.secondary',
          flexShrink: 0,
          transition: theme.transitions.create('transform', {
            duration: theme.transitions.duration.standard,
          }),
        }}
      />
    </CardActionArea>
  );
}

HubNavRow.propTypes = {
  href: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  danger: PropTypes.bool,
};

// ----------------------------------------------------------------------

export default function SettingsHubView({ isAdmin = false }) {
  const theme = useTheme();
  const { t } = useTranslate();
  const mdUp = useResponsive('up', 'md');
  const prefersReducedMotion = usePrefersReducedMotion();
  const router = useRouter();
  const { logout } = useAuthContext();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      router.replace(paths.auth.supabase.login);
    }
  }, [logout, router]);

  const accountRows = [
    {
      href: paths.dashboard.settingsEdit,
      icon: ic.userLinear,
      title: t('pages.dashboard.settings.tabs.edit'),
      subtitle: t('pages.dashboard.settings.hub.row_profile_subtitle'),
    },
    {
      href: paths.dashboard.settingsAppearance,
      icon: ic.sun2Linear,
      title: t('pages.dashboard.settings.appearance.page_title'),
      subtitle: t('pages.dashboard.settings.hub.row_appearance_subtitle'),
    },
    {
      href: paths.dashboard.settingsPreferences,
      icon: ic.tuningLinear,
      title: t('pages.dashboard.settings.preferences.page_title'),
      subtitle: t('pages.dashboard.settings.hub.row_preferences_subtitle'),
    },
    {
      href: paths.dashboard.settingsNotifications,
      icon: ic.bellLinear,
      title: t('components.notifications.title'),
      subtitle: t('components.notifications.enable_device_hint'),
    },
    {
      href: paths.dashboard.settingsBilling,
      icon: ic.walletMoneyLinear,
      title: t('pages.dashboard.settings.tabs.billing'),
      subtitle: t('pages.dashboard.settings.hub.row_billing_subtitle'),
    },
    {
      href: paths.dashboard.settingsSubscribers,
      icon: ic.usersGroupTwoRoundedLinear,
      title: t('pages.dashboard.settings.tabs.subscribers'),
      subtitle: t('pages.dashboard.settings.hub.row_subscribers_subtitle'),
    },
    {
      href: paths.dashboard.settingsMySubscriptions,
      icon: ic.bookmarkLinear,
      title: t('pages.dashboard.settings.tabs.my_subscriptions'),
      subtitle: t('pages.dashboard.settings.hub.row_my_subscriptions_subtitle'),
    },
  ];

  const helpRows = [
    {
      href: paths.home,
      icon: ic.home2Linear,
      title: t('pages.dashboard.settings.hub.go_home'),
      subtitle: t('pages.dashboard.settings.hub.row_go_home_subtitle'),
    },
    {
      href: paths.dashboard.feedback,
      icon: ic.chatRoundLineLinear,
      title: t('navigation.feedback'),
      subtitle: t('pages.dashboard.settings.hub.row_feedback_subtitle'),
    },
    {
      href: paths.dashboard.settingsFaqs,
      icon: ic.notebookBookmarkLinear,
      title: t('pages.faqs.title'),
      subtitle: t('pages.dashboard.settings.hub.row_faqs_subtitle'),
    },
    {
      href: paths.dashboard.settingsSupport,
      icon: ic.letterLinear,
      title: t('pages.dashboard.settings.hub.row_support'),
      subtitle: t('pages.dashboard.settings.hub.row_support_subtitle'),
    },
  ];

  return (
    <SettingsPageContainer>
      {!mdUp && (
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 12,
            mx: { xs: -2, sm: -3 },
            px: { xs: 2, sm: 3 },
            pt: 'env(safe-area-inset-top, 0px)',
            pb: 0,
            mb: 1,
            minHeight: TOUCH_MIN,
            display: 'flex',
            alignItems: 'center',
            bgcolor: alpha(theme.palette.background.default, 0.98),
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `${TOUCH_MIN}px minmax(0, 1fr)`,
              alignItems: 'center',
              columnGap: 1,
              width: 1,
              minHeight: TOUCH_MIN,
            }}
          >
            <IconButton
              component={RouterLink}
              href={paths.dashboard.discover}
              aria-label={t('pages.dashboard.title')}
              sx={{ ...filledDrillBackIconButtonSx(theme), justifySelf: 'start' }}
            >
              <Iconify icon={ic.chevronLeftLinear} width={SHELL_TOOLBAR_ICON} />
            </IconButton>
            <Typography
              component="h1"
              variant="subtitle1"
              sx={{
                justifySelf: 'center',
                textAlign: 'center',
                alignSelf: 'center',
                m: 0,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                minWidth: 0,
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              {t('pages.dashboard.settings.title')}
            </Typography>
          </Box>
        </Box>
      )}

      {mdUp && (
        <CustomBreadcrumbs
          heading={t('pages.dashboard.settings.title')}
          links={[
            { name: t('pages.dashboard.title'), href: paths.dashboard.discover },
            { name: t('pages.dashboard.settings.title') },
          ]}
          sx={{
            mb: { xs: 3, md: 5 },
            pb: 1,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.45)}`,
          }}
        />
      )}

      <DashboardPageMotion stagger>
        <Stack
          {...dashboardPageSectionStackProps}
          sx={{ position: 'relative', pt: mdUp ? 2.5 : 0 }}
        >
          <DashboardMotionSection>
            <Box>
              <Typography component="h2" sx={sectionLabelSx(theme)} mb={2}>
                {t('pages.dashboard.settings.hub.group_account')}
              </Typography>
              <Stack spacing={2}>
                {accountRows.map((row) => (
                  <Box key={row.href} sx={hubCardShellSx(theme)}>
                    <HubNavRow
                      href={row.href}
                      icon={row.icon}
                      title={row.title}
                      subtitle={row.subtitle}
                    />
                  </Box>
                ))}
              </Stack>
            </Box>
          </DashboardMotionSection>

          {isAdmin ? (
            <DashboardMotionSection>
              <Box>
                <Typography component="h2" sx={sectionLabelSx(theme)} mb={2}>
                  {t('pages.dashboard.settings.hub.group_admin')}
                </Typography>
                <Stack spacing={2}>
                  <Box sx={hubCardShellSx(theme)}>
                    <HubNavRow
                      href={paths.dashboard.admin}
                      icon={ic.starsBold}
                      title={t('pages.dashboard.admin.hub.heading')}
                      subtitle={t('pages.dashboard.settings.hub.row_admin_subtitle')}
                    />
                  </Box>
                </Stack>
              </Box>
            </DashboardMotionSection>
          ) : null}

          <DashboardMotionSection>
            <Box>
              <Typography component="h2" sx={sectionLabelSx(theme)} mb={2}>
                {t('pages.dashboard.settings.hub.group_help')}
              </Typography>
              <Stack spacing={2}>
                {helpRows.map((row) => (
                  <Box key={row.href} sx={hubCardShellSx(theme)}>
                    <HubNavRow
                      href={row.href}
                      icon={row.icon}
                      title={row.title}
                      subtitle={row.subtitle}
                    />
                  </Box>
                ))}
              </Stack>
            </Box>
          </DashboardMotionSection>

          <DashboardMotionSection>
            <Box>
              <Typography
                component="h2"
                sx={{
                  ...sectionLabelSx(theme),
                  color: alpha(theme.palette.error.main, 0.9),
                }}
                mb={2}
              >
                {t('pages.dashboard.settings.hub.group_danger')}
              </Typography>
              <CardActionArea
                component={RouterLink}
                href={paths.dashboard.settingsDeleteAccount}
                sx={{
                  px: 2,
                  py: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  minHeight: HUB_ROW_MIN_HEIGHT,
                  borderRadius: ROUNDED_CARD,
                  bgcolor: alpha(theme.palette.error.main, 0.09),
                  border: `1px solid ${alpha(theme.palette.error.main, 0.22)}`,
                  WebkitTapHighlightColor: 'transparent',
                  transition: theme.transitions.create(['background-color', 'transform'], {
                    duration: theme.transitions.duration.shorter,
                  }),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.error.main, 0.14),
                  },
                  ...(!prefersReducedMotion && {
                    '&:active': {
                      transform: 'scale(0.99)',
                      bgcolor: alpha(theme.palette.error.main, 0.18),
                    },
                  }),
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: ICON_TILE,
                      height: ICON_TILE,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(theme.palette.error.main, 0.12),
                      color: 'error.main',
                      flexShrink: 0,
                    }}
                  >
                    <Iconify icon={ic.trashLinear} width={SHELL_HUB_ICON} />
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'error.main' }}
                  >
                    {t('pages.dashboard.settings.tabs.delete_account')}
                  </Typography>
                </Stack>
                <Iconify
                  icon={ic.chevronRightLinear}
                  width={SHELL_HUB_ICON}
                  sx={{ color: alpha(theme.palette.error.main, 0.65), flexShrink: 0 }}
                />
              </CardActionArea>
            </Box>
          </DashboardMotionSection>

          <DashboardMotionSection>
            <Box>
              <Typography component="h2" sx={sectionLabelSx(theme)} mb={2}>
                {t('pages.dashboard.settings.hub.group_session')}
              </Typography>
              <Box sx={hubCardShellSx(theme)}>
                <CardActionArea
                  component="button"
                  type="button"
                  onClick={handleLogout}
                  sx={{
                    px: 2,
                    py: 2.25,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: 2,
                    minHeight: HUB_ROW_MIN_HEIGHT,
                    borderRadius: ROUNDED_CARD,
                    bgcolor: 'transparent',
                    WebkitTapHighlightColor: 'transparent',
                    width: '100%',
                    textAlign: 'left',
                    transition: theme.transitions.create(['background-color', 'transform'], {
                      duration: theme.transitions.duration.shorter,
                    }),
                    '&:hover': {
                      bgcolor:
                        theme.palette.mode === 'dark'
                          ? alpha(theme.palette.common.white, 0.08)
                          : theme.palette.grey[200],
                    },
                    '&:active': {
                      bgcolor:
                        theme.palette.mode === 'dark'
                          ? alpha(theme.palette.common.white, 0.08)
                          : theme.palette.grey[200],
                      ...(!prefersReducedMotion && { transform: 'scale(0.99)' }),
                    },
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={2}
                    sx={{ minWidth: 0, flex: 1 }}
                  >
                    <Box
                      sx={{
                        width: ICON_TILE,
                        height: ICON_TILE,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(theme.palette.error.main, 0.12),
                        color: 'error.main',
                        flexShrink: 0,
                      }}
                    >
                      <Iconify
                        icon={ic.logoutLinear}
                        width={SHELL_HUB_ICON}
                        sx={{ transform: 'rotate(180deg)' }}
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'error.main' }}
                    >
                      {t('components.account_popover.logout')}
                    </Typography>
                  </Stack>
                </CardActionArea>
              </Box>
            </Box>
          </DashboardMotionSection>
        </Stack>
      </DashboardPageMotion>
    </SettingsPageContainer>
  );
}

SettingsHubView.propTypes = {
  isAdmin: PropTypes.bool,
};
