'use client';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha, keyframes } from '@mui/material/styles';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { restaurantHrefWithFrom } from 'src/routes/restaurant-nav-from';

import { usePrefersReducedMotion } from 'src/hooks/use-prefers-reduced-motion';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { excludeIds } from 'src/libs/lists/system-lists';
import { readableAccent } from 'src/theme/readable-accent';
import { isCapacitorNative } from 'src/libs/capacitor/platform';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import { fetchCircleRestaurantIds } from 'src/auth/actions/location-actions';
import { fetchMyVisitedRestaurantIds } from 'src/auth/actions/visit-actions';

import Iconify from 'src/components/iconify';

import {
  SettingsDrillShell,
  DASHBOARD_SPACE_TIGHT,
  DASHBOARD_SPACE_SECTION,
} from 'src/sections/profile/view';

import RoulettePageLoadingSkeleton from '../roulette-page-loading-skeleton';

// ----------------------------------------------------------------------

const SUSPENSE_KEYS = [
  'pages.dashboard.roulette.spin_suspense_1',
  'pages.dashboard.roulette.spin_suspense_2',
  'pages.dashboard.roulette.spin_suspense_3',
];

function devWarn(...args) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(...args);
  }
}

const spinIdle = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

/** Subtle vertical bob while “spinning” — disabled when `prefers-reduced-motion: reduce`. */
const diceNudge = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
`;

/** Fade in new suspense phrase when it cycles. */
const fadeSwap = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

export default function NomRouletteView() {
  const { t } = useTranslate();
  const router = useRouter();
  const prefersReducedMotion = usePrefersReducedMotion();
  const { trackEvent } = useAnalytics();

  const [restaurantIds, setRestaurantIds] = useState([]);
  const [isFallbackPool, setIsFallbackPool] = useState(false);
  /**
   * Spots already on the viewer's seeded "Visited" list. Roulette exists to answer
   * "where tonight?", and somewhere you have already been is rarely the answer — so this
   * is on by default, with a switch for when you do want an old favourite back.
   */
  const [visitedIds, setVisitedIds] = useState([]);
  const [skipVisited, setSkipVisited] = useState(true);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [spinPhraseIndex, setSpinPhraseIndex] = useState(0);
  const [emptyPoolMessage, setEmptyPoolMessage] = useState(null);
  const spinIntervalRef = useRef(null);

  // Cycle through suspense phrases while spinning
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

  const loadCirclePool = useCallback(() => {
    setLoading(true);
    return fetchCircleRestaurantIds()
      .then(({ restaurantIds: ids, isFallback, error }) => {
        if (error) {
          devWarn('[NomRouletteView] circle_restaurants_for_viewer:', error);
        }
        setRestaurantIds(Array.isArray(ids) ? ids : []);
        setIsFallbackPool(Boolean(isFallback));
      })
      .finally(() => {
        setLoading(false);
        setInitialLoad(false);
      });
  }, []);

  useEffect(() => {
    loadCirclePool();
  }, [loadCirclePool]);

  // Independent of the pool fetch — a failure here just means nothing is excluded.
  useEffect(() => {
    let cancelled = false;
    fetchMyVisitedRestaurantIds()
      .then(({ restaurantIds: ids, error }) => {
        if (cancelled) return;
        if (error) devWarn('[NomRouletteView] fetchMyVisitedRestaurantIds:', error);
        setVisitedIds(Array.isArray(ids) ? ids : []);
      })
      .catch((e) => devWarn('[NomRouletteView] fetchMyVisitedRestaurantIds:', e));
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * The pool actually spun over. Falls back to the unfiltered pool when excluding visited
   * spots would leave nothing — a user who has been everywhere in their circle should
   * still get a spin rather than a dead end.
   */
  const spinnablePool = useMemo(() => {
    if (!skipVisited || visitedIds.length === 0) return restaurantIds;
    const remaining = excludeIds(restaurantIds, visitedIds);
    return remaining.length > 0 ? remaining : restaurantIds;
  }, [restaurantIds, visitedIds, skipVisited]);

  const allVisited =
    skipVisited && restaurantIds.length > 0 && excludeIds(restaurantIds, visitedIds).length === 0;

  const handleSpin = useCallback(async () => {
    if (loading || spinning) return;
    setEmptyPoolMessage(null);
    trackEvent('roulette_spin_started');

    // Haptic tap feedback on native platforms
    if (isCapacitorNative()) {
      try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch {
        // Haptics unavailable — continue silently
      }
    }

    let pool = spinnablePool;
    let fallback = isFallbackPool;
    if (!pool.length) {
      setSpinning(true);
      const {
        restaurantIds: ids,
        isFallback: refreshedFallback,
        error,
      } = await fetchCircleRestaurantIds();
      if (error) {
        devWarn('[NomRouletteView] circle_restaurants_for_viewer:', error);
      }
      const refreshed = Array.isArray(ids) ? ids : [];
      fallback = Boolean(refreshedFallback);
      setRestaurantIds(refreshed);
      setIsFallbackPool(fallback);
      setSpinning(false);
      // Apply the same exclusion to the freshly-fetched pool, with the same
      // don't-strand-the-user fallback as `spinnablePool`.
      const filtered = skipVisited ? excludeIds(refreshed, visitedIds) : refreshed;
      pool = filtered.length > 0 ? filtered : refreshed;
    }

    if (!pool.length) {
      setEmptyPoolMessage(t('pages.dashboard.roulette.empty_pool'));
      trackEvent('roulette_spin_empty_pool');
      return;
    }

    setSpinning(true);
    const id = pool[Math.floor(Math.random() * pool.length)];

    setTimeout(() => {
      setSpinning(false);
      if (id) {
        trackEvent('roulette_spin_completed', {
          restaurant_id: id,
          pool_size: pool.length,
          pool_source: fallback ? 'fallback_any' : 'circle',
          skip_visited: skipVisited,
        });
        router.push(restaurantHrefWithFrom(paths.dashboard.restaurant(id), 'roulette'), {
          transitionTypes: ['nav-forward'],
        });
      }
    }, 1400);
  }, [
    loading,
    spinning,
    spinnablePool,
    visitedIds,
    skipVisited,
    isFallbackPool,
    t,
    router,
    trackEvent,
  ]);

  if (initialLoad) {
    return <RoulettePageLoadingSkeleton />;
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
    <SettingsDrillShell
      title=""
      compactToolbar
      stretchPageContent
      backHref={paths.dashboard.discover}
      backAriaLabel={t('pages.dashboard.title')}
    >
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: { xs: 2, md: 3 },
        }}
      >
        <Card
          variant="outlined"
          sx={{
            width: 1,
            maxWidth: 480,
            mx: 'auto',
            borderRadius: 2,
            px: { xs: 2.5, sm: 3 },
            py: { xs: 3.5, md: 4 },
            bgcolor: 'background.paper',
            boxShadow: (theme) => theme.customShadows.z8,
          }}
        >
          <Stack
            alignItems="center"
            textAlign="center"
            spacing={DASHBOARD_SPACE_SECTION}
            sx={{ width: 1 }}
          >
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

            <Stack spacing={DASHBOARD_SPACE_TIGHT} sx={{ width: 1, maxWidth: 360 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.15,
                  color: 'text.primary',
                }}
              >
                {t('pages.dashboard.roulette.title')}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontWeight: 600,
                  lineHeight: 1.45,
                  mx: 'auto',
                }}
              >
                {t('pages.dashboard.roulette.subtitle_before')}{' '}
                <Box
                  component="span"
                  sx={{ fontWeight: 800, color: (theme) => readableAccent(theme) }}
                >
                  {t('pages.dashboard.roulette.subtitle_highlight')}
                </Box>
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
                  ? t('pages.dashboard.roulette.spin_loading')
                  : spinning
                    ? t(SUSPENSE_KEYS[spinPhraseIndex])
                    : t('pages.dashboard.roulette.cta_spin')}
              </Box>
            </Button>

            {visitedIds.length > 0 ? (
              <Stack alignItems="center" spacing={0.5} sx={{ width: 1, maxWidth: 360 }}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={skipVisited}
                      onChange={(e) => setSkipVisited(e.target.checked)}
                    />
                  }
                  label={
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {t('pages.dashboard.roulette.skip_visited')}
                    </Typography>
                  }
                  sx={{ m: 0 }}
                />
                {allVisited ? (
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                    {t('pages.dashboard.roulette.skip_visited_all_seen')}
                  </Typography>
                ) : null}
              </Stack>
            ) : null}

            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              {t('pages.dashboard.roulette.circle_footer')}
            </Typography>
          </Stack>
        </Card>
      </Box>
    </SettingsDrillShell>
  );
}
