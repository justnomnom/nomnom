'use client';

import Link from 'next/link';
import PropTypes from 'prop-types';
import { usePathname } from 'next/navigation';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import Container from '@mui/material/Container';
import { alpha, useTheme } from '@mui/material/styles';
import Badge, { badgeClasses } from '@mui/material/Badge';

import { paths } from 'src/routes/paths';

import { useResponsive } from 'src/hooks/use-responsive';

import { bgBlur } from 'src/theme/css';
import { useTranslate } from 'src/locales';
import { HEADER } from 'src/config-global';
import { useAuthContext } from 'src/auth/hooks/use-auth-context';
import { HEADER_GAP_SX, TOUCH_TARGET_SIZE } from 'src/theme/spacing';

import Logo from 'src/components/logo';

import NavMobile from './nav/mobile';
import NavDesktop from './nav/desktop';
import { useNavData } from './config-navigation';
import HeaderShadow from '../common/header-shadow';

// ----------------------------------------------------------------------

/**
 * Marketing app bar. `minimal` keeps the brand mark but drops the nav and the
 * sign-up CTA — for task pages reached by a shared link (e.g. /table/[id]),
 * where the acquisition pill otherwise outranks the page's own action.
 */
export default function Header({ minimal = false }) {
  const theme = useTheme();
  const { t } = useTranslate();
  const { user } = useAuthContext();
  const navData = useNavData();

  const mdUp = useResponsive('up', 'md');
  const smUp = useResponsive('up', 'sm');
  const pathname = usePathname();

  const offsetTop = true;
  /** Restaurant share page hero sits flush under the bar — the soft drop-shadow reads as a gap there. */
  const showHeaderShadow = !/^\/restaurants\/[^/]+/.test(pathname || '');

  const ctaHref = user
    ? paths.dashboard.discover
    : `${paths.auth.supabase.register}?returnTo=${encodeURIComponent(paths.dashboard.discover)}`;

  /** DESIGN.md — warm cream divider, not cool slate-gray */
  const headerBorder =
    theme.palette.mode === 'light'
      ? alpha(theme.palette.marketing.dividerWarm, 0.95)
      : theme.palette.divider;

  return (
    <AppBar
      sx={{
        color: 'text.primary',
        zIndex: theme.zIndex.appBar,
        /* Status bar / notch — keeps blur and border below the unsafe area */
        pt: 'env(safe-area-inset-top, 0px)',
        borderBottom: `1px solid ${headerBorder}`,
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          overflow: 'visible',
          height: {
            xs: HEADER.H_MOBILE,
            md: HEADER.H_DESKTOP,
          },
          ...(offsetTop && {
            ...bgBlur({
              color: theme.palette.background.default,
            }),
            height: {
              md: HEADER.H_DESKTOP_OFFSET,
            },
          }),
        }}
      >
        <Container
          maxWidth={false}
          sx={{
            height: 1,
            display: 'flex',
            alignItems: 'center',
            maxWidth: theme.breakpoints.values.lg,
            px: { xs: 1.25, sm: 2, md: 3 },
            gap: HEADER_GAP_SX,
            color: 'text.primary',
          }}
        >
          <Badge
            sx={{
              [`& .${badgeClasses.badge}`]: {
                top: 8,
                right: -16,
              },
            }}
          >
            <Logo
              sx={{
                /* Compact in top bar on phones; hero carries the large wordmark */
                height: { xs: 28, sm: 34, md: 40 },
                maxWidth: { xs: 148, sm: 180, md: 220 },
              }}
            />
          </Badge>

          <Box sx={{ flexGrow: 1, minWidth: 0 }} />

          {mdUp && !minimal && <NavDesktop data={navData} />}

          {!minimal && (
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="flex-end"
              spacing={{ xs: 0.25, sm: 0.75 }}
              sx={{
                flexShrink: 0,
                maxWidth: { xs: 'calc(100vw - 148px - 32px)', sm: 'none' },
                '& .MuiIconButton-root': {
                  width: TOUCH_TARGET_SIZE,
                  height: TOUCH_TARGET_SIZE,
                  WebkitTapHighlightColor: 'transparent',
                },
              }}
            >
              {/* Menu before CTA on small screens so the icon is not clipped when the pill is wide */}
              {!mdUp && <NavMobile data={navData} />}

              <Button
                component={Link}
                href={ctaHref}
                variant="contained"
                color="primary"
                size={mdUp ? 'medium' : 'small'}
                sx={{
                  ml: { xs: 0.5, sm: 1 },
                  px: { xs: 1.75, sm: 2.5 },
                  py: { xs: 0.85, sm: 0.95 },
                  minHeight: TOUCH_TARGET_SIZE,
                  minWidth: 0,
                  borderRadius: '2.5rem',
                  fontWeight: 600,
                  fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                  lineHeight: 1.35,
                  letterSpacing: '0.02em',
                  textTransform: 'none',
                  boxShadow: (th) => th.customShadows.primary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  transition: (th) =>
                    th.transitions.create(['box-shadow', 'background-color', 'transform'], {
                      duration: th.transitions.duration.shorter,
                    }),
                  '&:hover': {
                    boxShadow: (th) =>
                      `${alpha(th.palette.primary.darker, 0.35)} 0px 8px 20px -4px, ${alpha(th.palette.primary.main, 0.4)} 0px 0px 0px 1px`,
                  },
                  '&:focus-visible': {
                    outline: (th) =>
                      `2px solid ${
                        th.palette.mode === 'light'
                          ? th.palette.info.main
                          : alpha(th.palette.info.light, 0.9)
                      }`,
                    outlineOffset: 2,
                  },
                }}
              >
                {t(
                  smUp
                    ? 'pages.home.advertisement.ctaLabel'
                    : 'pages.home.advertisement.ctaLabelShort'
                )}
              </Button>
            </Stack>
          )}
        </Container>
      </Toolbar>

      {offsetTop && showHeaderShadow && <HeaderShadow />}
    </AppBar>
  );
}

Header.propTypes = {
  /** Brand mark only: no nav, no sign-up CTA. */
  minimal: PropTypes.bool,
};
