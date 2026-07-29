'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { alpha, keyframes } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';
import { restaurantHrefWithFrom } from 'src/routes/restaurant-nav-from';

import { usePrefersReducedMotion } from 'src/hooks/use-prefers-reduced-motion';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { isCapacitorNative } from 'src/libs/capacitor/platform';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import { fetchPublicLisboaRouletteRestaurantIds } from 'src/auth/actions/location-actions';

import Iconify from 'src/components/iconify';

import { MARKETING_SPACE_HERO_TO_CONTENT } from 'src/sections/profile/view/settings-shell-shared';

import PublicRouletteLoadingSkeleton from '../public-roulette-loading-skeleton';

// ----------------------------------------------------------------------

const SUSPENSE_KEYS = [
  'pages.public.roulette.lisboa.spin_suspense_1',
  'pages.public.roulette.lisboa.spin_suspense_2',
  'pages.public.roulette.lisboa.spin_suspense_3',
];

const ANALYTICS_CONTEXT = {
  surface: 'public_lisboa',
  pool_source: 'lisboa_bbox',
};

function devWarn(...args) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(...args);
  }
}

const spinIdle = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const diceNudge = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
`;

const fadeSwap = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

export default function PublicRouletteView() {
  const { t } = useTranslate();
  const router = useRouter();
  const prefersReducedMotion = usePrefersReducedMotion();
  const { trackEvent } = useAnalytics();

  const [restaurantIds, setRestaurantIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [spinPhraseIndex, setSpinPhraseIndex] = useState(0);
  const [emptyPoolMessage, setEmptyPoolMessage] = useState(null);
  const spinIntervalRef = useRef(null);

  const signupHref = `${paths.auth.supabase.register}?returnTo=${encodeURIComponent(paths.site.rouletteLisboa)}`;

  useEffect(() => {
    if (spinning) {
      setSpinPhraseIndex(0);
      spinIntervalRef.current = setInterval(() => {
        setSpinPhraseIndex((i) => (i + 1) % SUSPENSE_KEYS.length);
      }, 420);
    } else {
      clearInterval(spinIntervalRef.current);
    }
    return () => clearInterval(spinIntervalRef.current);
  }, [spinning]);

  const loadPool = useCallback(() => {
    setLoading(true);
    return fetchPublicLisboaRouletteRestaurantIds()
      .then(({ restaurantIds: ids, error }) => {
        if (error) {
          devWarn('[PublicRouletteView] restaurants_in_bbox:', error);
        }
        setRestaurantIds(Array.isArray(ids) ? ids : []);
      })
      .finally(() => {
        setLoading(false);
        setInitialLoad(false);
      });
  }, []);

  useEffect(() => {
    loadPool();
  }, [loadPool]);

  const handleSignupClick = useCallback(() => {
    trackEvent('tool_signup_click', { source: 'public_roulette' });
  }, [trackEvent]);

  const handleSpin = useCallback(async () => {
    if (loading || spinning) return;
    setEmptyPoolMessage(null);
    trackEvent('roulette_spin_started', ANALYTICS_CONTEXT);

    if (isCapacitorNative()) {
      try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch {
        // Haptics unavailable
      }
    }

    let pool = restaurantIds;
    if (!pool.length) {
      setSpinning(true);
      const { restaurantIds: ids, error } = await fetchPublicLisboaRouletteRestaurantIds();
      if (error) {
        devWarn('[PublicRouletteView] restaurants_in_bbox:', error);
      }
      pool = Array.isArray(ids) ? ids : [];
      setRestaurantIds(pool);
      setSpinning(false);
    }

    if (!pool.length) {
      setEmptyPoolMessage(t('pages.public.roulette.lisboa.empty_pool'));
      trackEvent('roulette_spin_empty_pool', ANALYTICS_CONTEXT);
      return;
    }

    setSpinning(true);
    const id = pool[Math.floor(Math.random() * pool.length)];

    setTimeout(() => {
      setSpinning(false);
      if (id) {
        trackEvent('roulette_spin_completed', {
          ...ANALYTICS_CONTEXT,
          restaurant_id: id,
          pool_size: pool.length,
        });
        router.push(restaurantHrefWithFrom(paths.restaurantPublic(id), 'roleta'), {
          transitionTypes: ['nav-forward'],
        });
      }
    }, 1400);
  }, [loading, spinning, restaurantIds, t, router, trackEvent]);

  if (initialLoad) {
    return <PublicRouletteLoadingSkeleton />;
  }

  let diceBoxAnimation = 'none';
  if (!prefersReducedMotion) {
    if (spinning) {
      diceBoxAnimation = `${diceNudge} 1s ease-in-out infinite`;
    } else {
      diceBoxAnimation = `${spinIdle} 16s linear infinite`;
    }
  }

  return (
    <Container
      maxWidth="sm"
      sx={{
        py: MARKETING_SPACE_HERO_TO_CONTENT,
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <Card
        variant="outlined"
        sx={{
          width: 1,
          borderRadius: 2,
          px: { xs: 2.5, sm: 3 },
          py: { xs: 3.5, md: 4 },
          bgcolor: 'background.paper',
          boxShadow: (theme) => theme.customShadows.z8,
        }}
      >
        <Stack alignItems="center" textAlign="center" spacing={3} sx={{ width: 1 }}>
          <Box
            sx={{
              width: { xs: 88, sm: 96 },
              height: { xs: 88, sm: 96 },
              borderRadius: 2,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(3deg)',
              boxShadow: (theme) => `0 8px 20px ${alpha(theme.palette.primary.main, 0.25)}`,
              animation: diceBoxAnimation,
            }}
          >
            <Iconify icon={ic.dice5} width={40} sx={{ color: 'primary.contrastText' }} />
          </Box>

          <Stack spacing={1} sx={{ width: 1, maxWidth: 360 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                color: 'text.primary',
              }}
            >
              {t('pages.public.roulette.lisboa.title')}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 600, lineHeight: 1.45, mx: 'auto' }}
            >
              {t('pages.public.roulette.lisboa.subtitle')}
            </Typography>
          </Stack>

          {emptyPoolMessage ? (
            <Alert severity="warning" variant="outlined" sx={{ width: 1, maxWidth: 360 }}>
              {emptyPoolMessage}
            </Alert>
          ) : null}

          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            disabled={loading || spinning}
            onClick={handleSpin}
            sx={{
              maxWidth: 360,
              py: 1.75,
              minHeight: 48,
              borderRadius: 2,
              fontWeight: 800,
              fontSize: '1rem',
              boxShadow: (theme) => `0 12px 28px ${alpha(theme.palette.primary.main, 0.28)}`,
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              '&:active': { transform: 'scale(0.985)' },
            }}
          >
            <Box
              key={spinning ? spinPhraseIndex : 'idle'}
              component="span"
              sx={{
                display: 'inline-block',
                animation:
                  spinning && !prefersReducedMotion ? `${fadeSwap} 0.28s ease-out` : 'none',
              }}
            >
              {/* eslint-disable-next-line no-nested-ternary */}
              {loading
                ? t('pages.public.roulette.lisboa.spin_loading')
                : spinning
                  ? t(SUSPENSE_KEYS[spinPhraseIndex])
                  : t('pages.public.roulette.lisboa.cta_spin')}
            </Box>
          </Button>

          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {t('pages.public.roulette.lisboa.scope_footer')}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
            {t('pages.public.roulette.lisboa.signup_prompt')}{' '}
            <Link
              component={RouterLink}
              href={signupHref}
              onClick={handleSignupClick}
              sx={{ fontWeight: 800 }}
            >
              {t('pages.public.roulette.lisboa.signup_cta')}
            </Link>
          </Typography>
        </Stack>
      </Card>
    </Container>
  );
}
