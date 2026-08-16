'use client';

import PropTypes from 'prop-types';
import { m as motion, AnimatePresence } from 'framer-motion';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { usePrefersReducedMotion } from 'src/hooks/use-prefers-reduced-motion';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { fetchMyListsHub } from 'src/libs/lists/actions';
import { fetchMyVisitSummary } from 'src/auth/actions/visit-actions';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';
import { SPACE, tabularNumsSx, TOUCH_TARGET_SIZE } from 'src/theme/spacing';

import Iconify from 'src/components/iconify';
import { MotionPart, MotionContainer } from 'src/components/animate';
import { ScrollableChipRow } from 'src/components/horizontal-scroll-row';
import CompactToolbarIconSkeleton from 'src/components/loading-screen/compact-toolbar-icon-skeleton';
import {
  scrollableChipPillButtonSx,
  SCROLLABLE_CHIP_PILL_BORDER_RADIUS,
} from 'src/components/scrollable-chip-select';
import {
  dashboardFade,
  DashboardPageMotion,
  DashboardDelightEmpty,
  DashboardMotionSection,
} from 'src/components/dashboard';

import CreateListModal from 'src/sections/lists/create-list-modal';
import {
  NomNomListLinkTile,
  NomNomListCreateTile,
  NOM_NOM_LIST_COMPACT_THUMB_PX,
} from 'src/sections/lists/nom-nom-list-tile';
import {
  SettingsDrillShell,
  dashboardPageRootSx,
  dashboardSubsectionStackProps,
  dashboardMobileStretchButtonSx,
} from 'src/sections/profile/view';

// ----------------------------------------------------------------------

function NewListIconButton({ onClick }) {
  const theme = useTheme();
  const { t } = useTranslate();

  return (
    <IconButton
      data-testid="e2e-lists-new"
      onClick={onClick}
      aria-label={t('pages.lists.new_list')}
      sx={{
        width: TOUCH_TARGET_SIZE,
        height: TOUCH_TARGET_SIZE,
        color: 'primary.main',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        '&:hover': {
          bgcolor: alpha(theme.palette.primary.main, 0.08),
        },
        '&:active': {
          bgcolor: alpha(theme.palette.primary.main, 0.14),
          transform: 'scale(0.94)',
        },
        transition: theme.transitions.create(['background-color', 'transform'], {
          duration: theme.transitions.duration.shorter,
        }),
      }}
    >
      <Iconify icon={ic.addCircleBold} width={28} />
    </IconButton>
  );
}

NewListIconButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};

const LIST_SKELETON_ROWS = 5;
const listTitleSkeletonWidths = ['58%', '72%', '64%', '68%', '78%'];
/** Compact tile thumb (96px) + 3px ring padding on each side — matches `CompactThumb`. */
const LIST_THUMB_SKELETON_H = NOM_NOM_LIST_COMPACT_THUMB_PX + 6;

// ----------------------------------------------------------------------

const pillPressSx = {
  '&:active': { transform: 'scale(0.94)' },
  '@media (prefers-reduced-motion: reduce)': { '&:active': { transform: 'none' } },
};

const FILTER_STORAGE_KEY = 'jnn:saved-view-filter';
const VALID_FILTERS = ['all', 'own', 'shared', 'from_others', 'subscriptions'];

export default function ListsHubView() {
  const theme = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslate();
  const prefersReducedMotion = usePrefersReducedMotion();
  const { trackEvent } = useAnalytics();
  /**
   * `?decide=1` from the Discover "Share → Decide" tile. Decide runs on a single list
   * (`ListDecidePanel`), so the hub can't open it directly — it points at the next step instead.
   */
  const showDecideHint = searchParams.get('decide') === '1';
  /**
   * Dismissing strips the param instead of only flipping local state, so a reload, a back
   * navigation, or a shared copy of the URL doesn't resurrect a hint the user already closed.
   */
  const handleDismissDecideHint = useCallback(() => {
    trackEvent('decide_hint_dismissed');
    router.replace(paths.dashboard.lists);
  }, [router, trackEvent]);
  const [createOpen, setCreateOpen] = useState(false);
  const [owned, setOwned] = useState([]);
  const [sharedWithMe, setSharedWithMe] = useState([]);
  const [fromFollowed, setFromFollowed] = useState([]);
  const [subscribedLists, setSubscribedLists] = useState([]);
  const [filter, setFilter] = useState(
    /** @type {'all' | 'own' | 'shared' | 'from_others' | 'subscriptions'} */ () => {
      try {
        const stored = sessionStorage.getItem(FILTER_STORAGE_KEY);
        if (VALID_FILTERS.includes(stored)) return stored;
      } catch {
        // sessionStorage unavailable (SSR / private browsing)
      }
      return 'all';
    }
  );
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [visitSummary, setVisitSummary] = useState(null);

  const listSkeletonTheme = useSkeletonThemeColors();

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const {
      owned: ownedRows,
      sharedWithMe: sharedRows,
      fromFollowed: followedRows,
      subscribedLists: subscribedRows,
      error,
    } = await fetchMyListsHub();
    setLoading(false);
    if (error) setErr(error);
    setOwned(ownedRows ?? []);
    setSharedWithMe(sharedRows ?? []);
    setFromFollowed(followedRows ?? []);
    setSubscribedLists(subscribedRows ?? []);
  }, []);

  /**
   * "47 spots saved · 6 visited". Loaded separately from the list hub so a slow or failed
   * count never holds up the lists themselves — the summary just stays hidden.
   */
  useEffect(() => {
    let cancelled = false;
    fetchMyVisitSummary()
      .then(({ saved, visited, error }) => {
        if (cancelled || error) return;
        setVisitSummary({ saved, visited });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleListCreated = useCallback(
    ({ id, name: listName, description: desc, visibility: vis }) => {
      const now = new Date().toISOString();
      const row = {
        id,
        name: listName,
        description: typeof desc === 'string' ? desc : '',
        cover_image_url: null,
        visibility: vis ?? 'private',
        published_at: ['public', 'public_subscribers'].includes(vis) ? now : null,
        updated_at: now,
        item_count: 0,
      };
      setOwned((prev) => (prev.some((l) => l.id === id) ? prev : [row, ...prev]));
      router.refresh();
    },
    [router]
  );

  const allLists = useMemo(() => {
    const byId = new Map();
    [...owned, ...sharedWithMe, ...fromFollowed, ...subscribedLists].forEach((l) => {
      if (l?.id && !byId.has(l.id)) {
        byId.set(l.id, l);
      }
    });
    const merged = [...byId.values()];
    merged.sort((a, b) => {
      const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return tb - ta;
    });
    return merged;
  }, [owned, sharedWithMe, fromFollowed, subscribedLists]);

  let displayedLists = allLists;
  if (filter === 'own') {
    displayedLists = owned;
  } else if (filter === 'shared') {
    displayedLists = sharedWithMe;
  } else if (filter === 'from_others') {
    displayedLists = fromFollowed;
  } else if (filter === 'subscriptions') {
    displayedLists = subscribedLists;
  }

  const hasAnyLists =
    owned.length > 0 ||
    sharedWithMe.length > 0 ||
    fromFollowed.length > 0 ||
    subscribedLists.length > 0;
  const setFilterPersisted = useCallback(
    (next) => {
      setFilter((prev) => {
        if (prev !== next) trackEvent('saved_filter_changed', { filter: next });
        return next;
      });
      try {
        sessionStorage.setItem(FILTER_STORAGE_KEY, next);
      } catch {
        // ignore
      }
    },
    [trackEvent]
  );

  const showNewListInToolbar = filter === 'all' || filter === 'own';

  const filteredEmptyCopy = useMemo(() => {
    if (filter === 'shared') {
      return {
        title: t('pages.dashboard.lists.empty_shared_title'),
        body: t('pages.dashboard.lists.empty_shared_body'),
      };
    }
    if (filter === 'from_others') {
      return {
        title: t('pages.dashboard.lists.empty_from_others_title'),
        body: t('pages.dashboard.lists.empty_from_others_body'),
      };
    }
    if (filter === 'subscriptions') {
      return {
        title: t('pages.dashboard.lists.empty_subscriptions_title'),
        body: t('pages.dashboard.lists.empty_subscriptions_body'),
      };
    }
    return {
      title: t('pages.dashboard.lists.empty_lists_title'),
      body: t('pages.dashboard.lists.empty_lists_body'),
    };
  }, [filter, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    trackEvent('saved_view_opened');
  }, [trackEvent]);

  // Guarded on `showDecideHint` so it fires once per arrival, not on every re-render, and
  // never for the plain /dashboard/lists visit.
  useEffect(() => {
    if (showDecideHint) trackEvent('decide_hint_shown');
  }, [showDecideHint, trackEvent]);

  return (
    <SettingsDrillShell
      title={t('pages.dashboard.lists.page_heading')}
      backHref={paths.dashboard.discover}
      backAriaLabel={t('pages.dashboard.title')}
      endAdornment={
        // eslint-disable-next-line no-nested-ternary
        loading ? (
          <CompactToolbarIconSkeleton />
        ) : showNewListInToolbar ? (
          <NewListIconButton onClick={() => setCreateOpen(true)} />
        ) : null
      }
    >
      <Box sx={{ ...dashboardPageRootSx, minWidth: 0, overflowX: 'hidden' }}>
        <DashboardPageMotion stagger>
          <Stack {...dashboardSubsectionStackProps}>
            {showDecideHint && (
              <DashboardMotionSection>
                <Stack
                  direction="row"
                  spacing={SPACE.sm}
                  alignItems="flex-start"
                  sx={{
                    borderRadius: 2,
                    p: SPACE.sm,
                    border: `2px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                  }}
                >
                  <Iconify
                    icon={ic.likeBold}
                    width={22}
                    sx={{ color: 'primary.main', flexShrink: 0, mt: 0.25 }}
                  />
                  <Stack spacing={0.25} sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {t('pages.dashboard.lists.decide_hint_title')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {t('pages.dashboard.lists.decide_hint_body')}
                    </Typography>
                  </Stack>
                  <Button
                    size="small"
                    color="primary"
                    onClick={handleDismissDecideHint}
                    sx={{
                      flexShrink: 0,
                      fontWeight: 700,
                      textTransform: 'none',
                      minHeight: TOUCH_TARGET_SIZE,
                    }}
                  >
                    {t('pages.dashboard.lists.decide_hint_dismiss')}
                  </Button>
                </Stack>
              </DashboardMotionSection>
            )}

            {!loading && (
              <DashboardMotionSection>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
                  {t('pages.dashboard.lists.subtitle_lists')}
                </Typography>
                {visitSummary?.saved ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 0.75, fontWeight: 700, ...tabularNumsSx }}
                  >
                    {t('pages.dashboard.lists.visit_summary', {
                      saved: visitSummary.saved,
                      visited: visitSummary.visited,
                    })}
                  </Typography>
                ) : null}
              </DashboardMotionSection>
            )}

            {!loading && !err && (
              <DashboardMotionSection>
                <Box role="group" aria-label={t('pages.dashboard.lists.lists_filter_aria')}>
                  <ScrollableChipRow gap={1} sx={{ mx: 0, width: 1 }}>
                    <Button
                      color="inherit"
                      disableElevation
                      onClick={() => setFilterPersisted('all')}
                      aria-pressed={filter === 'all'}
                      sx={[
                        scrollableChipPillButtonSx(theme, { selected: filter === 'all' }),
                        pillPressSx,
                      ]}
                    >
                      {t('pages.dashboard.lists.filter_lists_all')}
                    </Button>
                    <Button
                      color="inherit"
                      disableElevation
                      onClick={() => setFilterPersisted('own')}
                      aria-pressed={filter === 'own'}
                      sx={[
                        scrollableChipPillButtonSx(theme, { selected: filter === 'own' }),
                        pillPressSx,
                      ]}
                    >
                      {t('pages.dashboard.lists.filter_lists_own')}
                    </Button>
                    <Button
                      color="inherit"
                      disableElevation
                      onClick={() => setFilterPersisted('from_others')}
                      aria-pressed={filter === 'from_others'}
                      sx={[
                        scrollableChipPillButtonSx(theme, { selected: filter === 'from_others' }),
                        pillPressSx,
                      ]}
                    >
                      {t('pages.dashboard.lists.filter_lists_following')}
                    </Button>
                    <Button
                      color="inherit"
                      disableElevation
                      onClick={() => setFilterPersisted('subscriptions')}
                      aria-pressed={filter === 'subscriptions'}
                      sx={[
                        scrollableChipPillButtonSx(theme, { selected: filter === 'subscriptions' }),
                        pillPressSx,
                      ]}
                    >
                      {t('pages.dashboard.lists.filter_lists_subscriptions')}
                    </Button>
                    <Button
                      color="inherit"
                      disableElevation
                      onClick={() => setFilterPersisted('shared')}
                      aria-pressed={filter === 'shared'}
                      sx={[
                        scrollableChipPillButtonSx(theme, { selected: filter === 'shared' }),
                        pillPressSx,
                      ]}
                    >
                      {t('pages.dashboard.lists.filter_lists_shared')}
                    </Button>
                  </ScrollableChipRow>
                </Box>
              </DashboardMotionSection>
            )}

            <CreateListModal
              open={createOpen}
              onClose={() => setCreateOpen(false)}
              onCreated={handleListCreated}
            />

            {/**
             * Crossfade the loading / error / empty / results branches.
             * `MotionViewport` still drives the per-tile stagger inside the results branch.
             */}
            <AnimatePresence mode="wait" initial={false}>
              {(() => {
                const fadeInitial = prefersReducedMotion ? false : { opacity: 0 };
                const fadeExit = prefersReducedMotion ? undefined : { opacity: 0 };
                const fadeTransition = { duration: 0.26, ease: [0.22, 1, 0.36, 1] };

                if (loading) {
                  return (
                    <motion.div
                      key="saved-loading"
                      initial={fadeInitial}
                      animate={{ opacity: 1 }}
                      exit={fadeExit}
                      transition={fadeTransition}
                    >
                      <SkeletonTheme
                        baseColor={listSkeletonTheme.baseColor}
                        highlightColor={listSkeletonTheme.highlightColor}
                        borderRadius={16}
                        duration={1.2}
                      >
                        <Skeleton
                          height={18}
                          width="min(100%, 420px)"
                          borderRadius={4}
                          style={{ marginBottom: 16 }}
                        />
                        <Box
                          sx={{
                            mb: 2,
                            minWidth: 0,
                            width: 1,
                            overflowX: 'auto',
                            WebkitOverflowScrolling: 'touch',
                            scrollbarWidth: 'none',
                            overscrollBehaviorX: 'contain',
                            '&::-webkit-scrollbar': { display: 'none' },
                          }}
                        >
                          <Stack direction="row" spacing={1} sx={{ width: 'max-content' }}>
                            <Skeleton
                              height={44}
                              width={56}
                              borderRadius={SCROLLABLE_CHIP_PILL_BORDER_RADIUS}
                            />
                            <Skeleton
                              height={44}
                              width={72}
                              borderRadius={SCROLLABLE_CHIP_PILL_BORDER_RADIUS}
                            />
                            <Skeleton
                              height={44}
                              width={104}
                              borderRadius={SCROLLABLE_CHIP_PILL_BORDER_RADIUS}
                            />
                            <Skeleton
                              height={44}
                              width={124}
                              borderRadius={SCROLLABLE_CHIP_PILL_BORDER_RADIUS}
                            />
                            <Skeleton
                              height={44}
                              width={88}
                              borderRadius={SCROLLABLE_CHIP_PILL_BORDER_RADIUS}
                            />
                          </Stack>
                        </Box>
                        <Box
                          role="status"
                          aria-busy="true"
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                            gap: 1.5,
                          }}
                        >
                          {Array.from({ length: LIST_SKELETON_ROWS }, (_, i) => (
                            <Box key={i} sx={{ width: 1, minWidth: 0 }}>
                              <Skeleton
                                height={LIST_THUMB_SKELETON_H}
                                style={{ borderRadius: 12, marginBottom: 8 }}
                              />
                              <Box sx={{ px: 0.5 }}>
                                <Skeleton
                                  height={14}
                                  width={
                                    listTitleSkeletonWidths[i % listTitleSkeletonWidths.length] ??
                                    '75%'
                                  }
                                  style={{ borderRadius: 6, marginBottom: 4 }}
                                />
                                <Skeleton height={11} width="50%" style={{ borderRadius: 6 }} />
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </SkeletonTheme>
                    </motion.div>
                  );
                }

                if (err) {
                  return (
                    <motion.div
                      key="saved-error"
                      initial={fadeInitial}
                      animate={{ opacity: 1 }}
                      exit={fadeExit}
                      transition={fadeTransition}
                    >
                      <Alert severity="error" variant="outlined" role="alert">
                        {err}
                      </Alert>
                    </motion.div>
                  );
                }

                if (!hasAnyLists) {
                  return (
                    <motion.div
                      key="saved-empty-all"
                      initial={fadeInitial}
                      animate={{ opacity: 1 }}
                      exit={fadeExit}
                      transition={fadeTransition}
                    >
                      <DashboardDelightEmpty
                        icon={ic.bookmarkLinear}
                        title={t('pages.dashboard.lists.empty_lists_title')}
                        body={t('pages.dashboard.lists.empty_lists_body')}
                        action={
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={() => setCreateOpen(true)}
                            sx={dashboardMobileStretchButtonSx}
                          >
                            {t('pages.lists.new_list')}
                          </Button>
                        }
                      />
                    </motion.div>
                  );
                }

                if (displayedLists.length === 0) {
                  return (
                    <motion.div
                      key="saved-empty-filtered"
                      initial={fadeInitial}
                      animate={{ opacity: 1 }}
                      exit={fadeExit}
                      transition={fadeTransition}
                    >
                      <DashboardDelightEmpty
                        icon={ic.bookmarkLinear}
                        title={filteredEmptyCopy.title}
                        body={filteredEmptyCopy.body}
                      />
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key="saved-results"
                    initial={fadeInitial}
                    animate={{ opacity: 1 }}
                    exit={fadeExit}
                    transition={fadeTransition}
                  >
                    {/**
                     * Keyed by `filter` so each chip change re-mounts the container and
                     * fires a fresh `initial → animate` variant pass on the tiles. Using
                     * `MotionContainer` (initial/animate) instead of `MotionViewport`
                     * (whileInView) avoids an IntersectionObserver race with the outer
                     * AnimatePresence fade — without this, tiles stayed at opacity:0 on
                     * the first click and only appeared on a second click.
                     */}
                    <MotionContainer key={filter}>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                          gap: 1.5,
                        }}
                      >
                        {displayedLists.map((list) => (
                          <MotionPart key={list.id} variants={dashboardFade().inUp}>
                            <NomNomListLinkTile
                              list={list}
                              href={paths.dashboard.listDetails(list.id)}
                              t={t}
                              compact
                            />
                          </MotionPart>
                        ))}
                        {showNewListInToolbar ? (
                          <MotionPart variants={dashboardFade().inUp}>
                            <NomNomListCreateTile
                              compact
                              onClick={() => setCreateOpen(true)}
                              t={t}
                            />
                          </MotionPart>
                        ) : null}
                      </Box>
                    </MotionContainer>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </Stack>
        </DashboardPageMotion>
      </Box>
    </SettingsDrillShell>
  );
}
