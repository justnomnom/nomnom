'use client';

import PropTypes from 'prop-types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fToNow } from 'src/utils/format-time';
import { fRating } from 'src/utils/format-number';
import { translateStripeCheckoutError } from 'src/utils/stripe-checkout-errors';
import { translateCreatorSubscriptionError } from 'src/utils/creator-subscription-errors';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { tabularNumsSx } from 'src/theme/spacing';
import { setFollowUser } from 'src/auth/actions/profile-actions';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import { fetchPublicProfileActivityPage } from 'src/auth/actions/list-actions';
import { PROFILE_ACTIVITY_PAGE_SIZE } from 'src/lib/public-profile-activity-constants';
import { cancelMyCreatorSubscription } from 'src/auth/actions/creator-subscribers-actions';

import Iconify from 'src/components/iconify';
import DeleteDialog from 'src/components/custom-dialog/delete-dialog';
import { ScrollableChipRow } from 'src/components/horizontal-scroll-row';
import { scrollableChipPillButtonSx } from 'src/components/scrollable-chip-select';

import CreateListModal from 'src/sections/lists/create-list-modal';
import { profileSectionInsetSx } from 'src/sections/profile/view/settings-shell-shared';
import {
  NomNomListLinkTile,
  NomNomListCreateTile,
  listSpotsVisibilitySubtitle,
} from 'src/sections/lists/nom-nom-list-tile';

// ----------------------------------------------------------------------

const RESTAURANT_MENTIONS_HASH = '#restaurant-mentions';

const PROFILE_ACTIVITY_FILTER_ALL = 'all';
const PROFILE_ACTIVITY_FILTER_REVIEW = 'review';
const PROFILE_ACTIVITY_FILTER_NOM_NOM_ADDED = 'list_spot';

function formatStarRating(rating, currentLang) {
  const n = Number(rating);
  if (!Number.isFinite(n)) return '—';
  return fRating(n, currentLang, { trimTrailingZero: true });
}

/** Non-interactive category line — not a chip or control (plain metadata). */
function ActivityCardTypeLabel({ icon, children, color }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.75}
      sx={{
        userSelect: 'none',
        cursor: 'default',
        color: color || 'text.secondary',
        pointerEvents: 'none',
      }}
    >
      <Iconify icon={icon} width={15} sx={{ opacity: 0.88, flexShrink: 0 }} />
      <Typography
        component="span"
        variant="caption"
        sx={{
          fontWeight: 700,
          fontSize: '0.6875rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          lineHeight: 1.25,
        }}
      >
        {children}
      </Typography>
    </Stack>
  );
}

ActivityCardTypeLabel.propTypes = {
  icon: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  color: PropTypes.string,
};

/** Static panel — links inside are clickable; whole card is not a control (no primary hover). */
const activityCardSx = {
  borderRadius: '16px',
  p: { xs: 1.5, sm: 2 },
  cursor: 'default',
  boxShadow: 'none',
  borderColor: 'divider',
  bgcolor: (t2) => alpha(t2.palette.grey[500], 0.06),
};

/**
 * Wrapper for activity feed cards on a profile. Shared shell — each card kind
 * (review, list_spot, list_published) supplies its own body via `children`.
 */
function ActivityCard({ icon, typeLabel, when, children }) {
  return (
    <Card variant="outlined" sx={activityCardSx}>
      <Stack spacing={1.25}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
          flexWrap="wrap"
        >
          <ActivityCardTypeLabel icon={icon} color="text.primary">
            {typeLabel}
          </ActivityCardTypeLabel>
          {when ? (
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {when}
            </Typography>
          ) : null}
        </Stack>
        {children}
      </Stack>
    </Card>
  );
}

ActivityCard.propTypes = {
  icon: PropTypes.string.isRequired,
  typeLabel: PropTypes.node.isRequired,
  when: PropTypes.string,
  children: PropTypes.node.isRequired,
};

function formatCompactCount(n) {
  const x = Math.max(0, Number(n) || 0);
  if (x >= 1_000_000) {
    return `${(x / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (x >= 1000) {
    return `${(x / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(x);
}

function hrefInstagram(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return `https://www.instagram.com/${encodeURIComponent(s.replace(/^@/, ''))}`;
}

function hrefTiktok(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const h = s.replace(/^@/, '');
  return `https://www.tiktok.com/@${encodeURIComponent(h)}`;
}

function hrefYoutube(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return `https://www.youtube.com/@${encodeURIComponent(s.replace(/^@/, ''))}`;
}

function hrefWebsite(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s.replace(/^\/+/, '')}`;
}

// ----------------------------------------------------------------------

export default function UserPublicProfileView({
  profile,
  lists,
  recentActivity = [],
  layout = 'public',
  viewerUserId = null,
  initialFollowing = false,
}) {
  const theme = useTheme();
  const { t, currentLang } = useTranslate();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { trackEvent, setGroup } = useAnalytics();
  const [following, setFollowing] = useState(initialFollowing);
  const [followBusy, setFollowBusy] = useState(false);
  const followInFlightRef = useRef(false);
  const [subscribeBusy, setSubscribeBusy] = useState(false);
  const [subscribeCheckoutError, setSubscribeCheckoutError] = useState(null);
  const subscribeInFlightRef = useRef(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [subscriptionCancelError, setSubscriptionCancelError] = useState(null);
  const subscriptionCancelErrorText = useMemo(
    () => translateCreatorSubscriptionError(t, subscriptionCancelError),
    [subscriptionCancelError, t]
  );
  const [createListOpen, setCreateListOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState(PROFILE_ACTIVITY_FILTER_ALL);
  const [activityRows, setActivityRows] = useState(() => recentActivity ?? []);
  const [activityLoadMoreBusy, setActivityLoadMoreBusy] = useState(false);
  const [activityHasMore, setActivityHasMore] = useState(
    () => (recentActivity ?? []).length >= PROFILE_ACTIVITY_PAGE_SIZE
  );
  /** Newly created lists until server `lists` includes them (same pattern as save-to-list sheet). */
  const [pendingOwnLists, setPendingOwnLists] = useState([]);

  useEffect(() => {
    if (!profile?.id) return;
    setGroup('creator', profile.id);
    trackEvent('creator_profile_viewed', { creator_id: profile.id });
  }, [profile?.id, setGroup, trackEvent]);

  useEffect(() => {
    setPendingOwnLists([]);
  }, [profile?.id]);

  useEffect(() => {
    const ids = new Set((lists ?? []).map((l) => String(l.id)));
    setPendingOwnLists((prev) => prev.filter((l) => !ids.has(String(l.id))));
  }, [lists]);

  const profileListsForDisplay = useMemo(() => {
    const server = lists ?? [];
    const byId = new Map(server.map((l) => [String(l.id), l]));
    pendingOwnLists.forEach((l) => {
      if (l?.id != null && !byId.has(String(l.id))) {
        byId.set(String(l.id), l);
      }
    });
    return [...byId.values()].sort((a, b) => {
      const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return tb - ta;
    });
  }, [lists, pendingOwnLists]);

  const handleProfileListCreated = useCallback(
    ({ id, name: listName, visibility: vis }) => {
      const now = new Date().toISOString();
      setPendingOwnLists((prev) => [
        {
          id,
          name: listName,
          cover_image_url: null,
          visibility: vis ?? 'private',
          item_count: 0,
          updated_at: now,
        },
        ...prev.filter((l) => String(l.id) !== String(id)),
      ]);
      router.refresh();
    },
    [router]
  );

  useEffect(() => {
    setActivityRows(recentActivity ?? []);
    setActivityHasMore((recentActivity ?? []).length >= PROFILE_ACTIVITY_PAGE_SIZE);
  }, [profile?.id, recentActivity]);

  const filteredActivity = useMemo(() => {
    const rows = activityRows ?? [];
    if (activityFilter === PROFILE_ACTIVITY_FILTER_ALL) return rows;
    return rows.filter((row) => row?.kind === activityFilter);
  }, [activityRows, activityFilter]);

  useEffect(() => {
    setFollowing(initialFollowing);
  }, [initialFollowing]);

  const checkoutParam = searchParams.get('checkout');

  /** Stripe Checkout return: strip query params and refresh RSC so subscription state updates. */
  useEffect(() => {
    if (!checkoutParam) return undefined;
    const cleanUrl = window.location.pathname;
    let cancelled = false;

    (async () => {
      trackEvent('creator_checkout_returned', {
        creator_id: profile?.id ?? null,
        checkout_status: checkoutParam,
      });
      if (cancelled) return;
      router.replace(cleanUrl, { scroll: false });
      if (checkoutParam === 'success') {
        router.refresh();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [checkoutParam, profile?.id, router, trackEvent]);

  const isOwnProfile = Boolean(viewerUserId && profile?.id && viewerUserId === profile.id);
  const subscribeListId = profile?.subscribe_list_id ?? null;
  const creatorPayoutReady = Boolean(profile?.creator_payout_ready);
  const viewerSubscribedToCreator = Boolean(profile?.viewer_subscribed_to_creator);
  const viewerSubscriptionRowId = profile?.viewer_subscription_row_id ?? null;
  const viewerSubscriptionPeriodEnd = profile?.viewer_subscription_period_end ?? null;
  const viewerSubscriptionCancelAtPeriodEnd = Boolean(
    profile?.viewer_subscription_cancel_at_period_end
  );

  useEffect(() => {
    setSubscribeCheckoutError(null);
  }, [profile?.id, subscribeListId, viewerSubscribedToCreator]);
  // Only show subscribe CTA when the creator has Stripe charges enabled, has a
  // subscription list configured, and the viewer hasn't already subscribed.
  const showProfileSubscribe =
    creatorPayoutReady && Boolean(subscribeListId) && !isOwnProfile && !viewerSubscribedToCreator;
  // Show "Subscribed" pill (with cancel affordance) when the viewer is a paid subscriber.
  const showSubscribedState = creatorPayoutReady && viewerSubscribedToCreator && !isOwnProfile;

  const handleProfileSubscribe = useCallback(async () => {
    if (!subscribeListId || !viewerUserId) return;
    if (subscribeInFlightRef.current) return;
    subscribeInFlightRef.current = true;
    setSubscribeBusy(true);
    setSubscribeCheckoutError(null);
    trackEvent('creator_subscription_checkout_started', {
      creator_id: profile?.id ?? null,
      list_id: subscribeListId,
      viewer_id: viewerUserId,
    });
    try {
      const res = await fetch('/api/stripe/checkout/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId: subscribeListId,
          returnPath: window.location.pathname,
        }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok) {
        trackEvent('creator_subscription_checkout_failed', {
          creator_id: profile?.id ?? null,
          list_id: subscribeListId,
          viewer_id: viewerUserId,
          error_code: data?.error || 'checkout_failed',
        });
        setSubscribeCheckoutError(translateStripeCheckoutError(t, data.error || 'checkout_failed'));
        return;
      }
      if (data.url) {
        trackEvent('creator_subscription_checkout_redirected', {
          creator_id: profile?.id ?? null,
          list_id: subscribeListId,
          viewer_id: viewerUserId,
        });
        window.location.href = data.url;
      }
    } catch {
      trackEvent('creator_subscription_checkout_failed', {
        creator_id: profile?.id ?? null,
        list_id: subscribeListId,
        viewer_id: viewerUserId,
        error_code: 'network_or_unknown',
      });
      setSubscribeCheckoutError(t('pages.lists.paid_checkout_error_generic'));
    } finally {
      subscribeInFlightRef.current = false;
      setSubscribeBusy(false);
    }
  }, [profile?.id, subscribeListId, t, trackEvent, viewerUserId]);

  const handleCancelSubscription = useCallback(async () => {
    if (!viewerSubscriptionRowId) return;
    setCancelBusy(true);
    setSubscriptionCancelError(null);
    trackEvent('creator_subscription_cancel_started', {
      creator_id: profile?.id ?? null,
      subscription_row_id: viewerSubscriptionRowId,
    });
    const { error } = await cancelMyCreatorSubscription(viewerSubscriptionRowId);
    setCancelBusy(false);
    if (error) {
      trackEvent('creator_subscription_cancel_failed', {
        creator_id: profile?.id ?? null,
        subscription_row_id: viewerSubscriptionRowId,
        error_code: error,
      });
      setSubscriptionCancelError(error);
      return;
    }
    trackEvent('creator_subscription_cancel_completed', {
      creator_id: profile?.id ?? null,
      subscription_row_id: viewerSubscriptionRowId,
    });
    setCancelDialogOpen(false);
    router.refresh();
  }, [profile?.id, viewerSubscriptionRowId, router, trackEvent]);

  const handleLoadMoreActivity = async () => {
    if (!profile?.id || activityLoadMoreBusy || !activityHasMore) return;
    setActivityLoadMoreBusy(true);
    try {
      const { activity, error } = await fetchPublicProfileActivityPage(
        profile.id,
        activityRows.length,
        PROFILE_ACTIVITY_PAGE_SIZE
      );
      if (error) return;
      const batch = activity ?? [];
      setActivityRows((prev) => [...(prev ?? []), ...batch]);
      setActivityHasMore(batch.length >= PROFILE_ACTIVITY_PAGE_SIZE);
    } finally {
      setActivityLoadMoreBusy(false);
    }
  };

  if (!profile) {
    return (
      <Container
        data-testid="e2e-user-public-profile-missing"
        maxWidth="sm"
        sx={{ py: { xs: 3, md: 5 } }}
      >
        <Alert severity="info" variant="outlined" role="status">
          {t('pages.lists.profile_not_found')}
        </Alert>
      </Container>
    );
  }

  const handle = profile.username ? `@${profile.username}` : '';
  const isDashboard = layout === 'dashboard';
  /** Public profile: SEO `/lists/:id` (slug URL when available). Dashboard: stays in app shell. */
  const resolveListHref = (listId, listSlug) => {
    if (listId == null || listId === '') return null;
    if (isDashboard) return paths.dashboard.listDetails(String(listId));
    const username = profile.username ?? null;
    return paths.listPublic(
      String(listId),
      username && listSlug ? { username, slug: listSlug } : undefined
    );
  };
  const listsHeadingKey =
    isOwnProfile && isDashboard
      ? 'pages.lists.creator_lists_heading_own'
      : 'pages.lists.creator_lists_heading_visitor';
  const listCount = profileListsForDisplay.length;
  const followerCount = profile.follower_count ?? 0;
  const followingCount = profile.following_count ?? 0;

  const ig = hrefInstagram(profile.social_instagram);
  const tiktokHref = hrefTiktok(profile.social_tiktok);
  const yt = hrefYoutube(profile.social_youtube);
  const web = hrefWebsite(profile.social_website);
  const socials = [
    { href: ig, icon: ic.instagram, labelKey: 'pages.lists.creator_profile_aria_instagram' },
    { href: tiktokHref, icon: ic.tiktok, labelKey: 'pages.lists.creator_profile_aria_tiktok' },
    { href: yt, icon: ic.youtube, labelKey: 'pages.lists.creator_profile_aria_youtube' },
    { href: web, icon: ic.globeLinear, labelKey: 'pages.lists.creator_profile_aria_website' },
  ].filter((s) => s.href);

  const shellSx = isDashboard
    ? { width: 1, maxWidth: 600, mx: 'auto', py: { xs: 0.5, sm: 1 }, pb: 6 }
    : { py: 0, pb: 8 };

  const Outer = isDashboard ? Box : Container;
  const outerProps = isDashboard
    ? { 'data-testid': 'e2e-user-public-profile', sx: shellSx }
    : { 'data-testid': 'e2e-user-public-profile', maxWidth: 'sm', sx: shellSx };

  const primary = theme.palette.primary.main;
  const heroShadow = `0 10px 15px -3px ${alpha(primary, 0.2)}`;

  const activityLinkSx = {
    color: 'primary.main',
    fontWeight: 800,
    textDecoration: 'none',
    wordBreak: 'break-word',
    cursor: 'pointer',
    '&:hover': { textDecoration: 'underline', textUnderlineOffset: 3 },
  };

  const onFollowClick = async () => {
    if (isOwnProfile) return;
    if (!viewerUserId) {
      trackEvent('creator_follow_login_redirected', {
        creator_id: profile?.id ?? null,
      });
      router.push(paths.auth.supabase.login);
      return;
    }
    if (followInFlightRef.current) return;
    followInFlightRef.current = true;
    setFollowBusy(true);
    const next = !following;
    setFollowing(next);
    trackEvent('creator_follow_toggled', {
      creator_id: profile?.id ?? null,
      viewer_id: viewerUserId,
      follow: next,
    });
    try {
      const { error } = await setFollowUser(profile.id, next);
      if (error) {
        trackEvent('creator_follow_toggle_failed', {
          creator_id: profile?.id ?? null,
          viewer_id: viewerUserId,
          follow: next,
        });
        setFollowing(!next);
        return;
      }
      router.refresh();
    } finally {
      followInFlightRef.current = false;
      setFollowBusy(false);
    }
  };

  /** Carousel slot width — matches saved/lists compact grid cards (`NomNomListLinkTile`). */
  const LIST_CARD_W = 140;

  let followPrimaryActionContent;
  if (followBusy) {
    followPrimaryActionContent = <CircularProgress color="inherit" size={22} thickness={4} />;
  } else if (following) {
    followPrimaryActionContent = t('pages.lists.creator_following_btn');
  } else {
    followPrimaryActionContent = t('pages.lists.creator_follow');
  }

  let profileSubscribeCta = null;
  if (showSubscribedState) {
    // Already subscribed — show status chip; click opens cancel dialog.
    const renewsOrEndsLabel = (() => {
      if (!viewerSubscriptionPeriodEnd) return null;
      const d = new Date(viewerSubscriptionPeriodEnd);
      if (Number.isNaN(d.getTime())) return null;
      const dateStr = d.toLocaleDateString(undefined, { dateStyle: 'medium' });
      return viewerSubscriptionCancelAtPeriodEnd
        ? t('pages.lists.subscription_ends_on', { date: dateStr })
        : t('pages.lists.subscription_renews_on', { date: dateStr });
    })();

    profileSubscribeCta = (
      <>
        <Button
          fullWidth
          variant="outlined"
          size="large"
          onClick={() => {
            setSubscriptionCancelError(null);
            setCancelDialogOpen(true);
          }}
          startIcon={<Iconify icon={ic.checkCircleBold} width={20} />}
          sx={{
            fontWeight: 800,
            py: 1.4,
            minHeight: 48,
            borderRadius: 4,
            color: 'success.main',
            borderColor: 'success.main',
            '&:hover': {
              borderColor: 'success.dark',
              bgcolor: (tt) => alpha(tt.palette.success.main, 0.06),
            },
            '&:active': { transform: 'scale(0.98)' },
          }}
        >
          {t('pages.lists.subscription_active_btn')}
        </Button>
        {renewsOrEndsLabel && (
          <Typography
            variant="caption"
            sx={{ display: 'block', color: 'text.secondary', textAlign: 'center', mt: -0.5 }}
          >
            {renewsOrEndsLabel}
          </Typography>
        )}

        <DeleteDialog
          open={cancelDialogOpen}
          onClose={() => {
            if (!cancelBusy) {
              setCancelDialogOpen(false);
              setSubscriptionCancelError(null);
            }
          }}
          onConfirm={handleCancelSubscription}
          isDeleting={cancelBusy}
          title={t('pages.lists.subscription_cancel_title')}
          confirmationMessage={
            viewerSubscriptionPeriodEnd
              ? t('pages.lists.subscription_cancel_body_with_date', {
                  date: new Date(viewerSubscriptionPeriodEnd).toLocaleDateString(undefined, {
                    dateStyle: 'medium',
                  }),
                })
              : t('pages.lists.subscription_cancel_body')
          }
          cancelButtonText={t('pages.lists.subscription_keep')}
          confirmButtonText={t('pages.lists.subscription_cancel_confirm')}
        >
          {subscriptionCancelError ? (
            <Alert severity="error" variant="outlined" role="alert">
              {subscriptionCancelErrorText}
            </Alert>
          ) : null}
        </DeleteDialog>
      </>
    );
  } else if (showProfileSubscribe) {
    profileSubscribeCta = viewerUserId ? (
      <Stack spacing={1} sx={{ width: 1 }}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          size="large"
          loading={subscribeBusy}
          disabled={subscribeBusy}
          onClick={handleProfileSubscribe}
          sx={{
            fontWeight: 800,
            py: 1.4,
            minHeight: 48,
            borderRadius: 4,
            '&:active': { transform: subscribeBusy ? 'none' : 'scale(0.98)' },
          }}
        >
          {t('pages.lists.creator_profile_subscribe')}
        </Button>
        {subscribeCheckoutError ? (
          <Alert severity="error" variant="outlined" role="alert">
            {subscribeCheckoutError}
          </Alert>
        ) : null}
      </Stack>
    ) : (
      <Button
        fullWidth
        component={RouterLink}
        href={paths.auth.supabase.login}
        variant="contained"
        color="primary"
        size="large"
        sx={{
          fontWeight: 800,
          py: 1.4,
          minHeight: 48,
          borderRadius: 4,
          '&:active': { transform: 'scale(0.98)' },
        }}
      >
        {t('pages.lists.creator_profile_subscribe')}
      </Button>
    );
  }

  return (
    <Outer {...outerProps}>
      <Box sx={{ ...profileSectionInsetSx, pb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Stack alignItems="center" textAlign="center" spacing={2}>
          <Box sx={{ position: 'relative' }}>
            <Box
              sx={{
                p: '3px',
                borderRadius: '50%',
                bgcolor: alpha(primary, theme.palette.mode === 'light' ? 0.22 : 0.42),
              }}
            >
              <Avatar
                src={profile.avatar_url || undefined}
                alt={profile.display_name || ''}
                sx={{
                  width: 96,
                  height: 96,
                  border: '4px solid',
                  borderColor: 'background.paper',
                  boxShadow: theme.shadows[4],
                }}
              />
            </Box>
          </Box>

          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.02em',
                fontSize: { xs: '1.5rem', sm: '1.75rem' },
                overflowWrap: 'anywhere',
              }}
            >
              {profile.display_name || handle || '—'}
            </Typography>
            {handle && profile.username ? (
              <Link
                component={RouterLink}
                href={
                  isDashboard
                    ? paths.dashboard.userPublic(profile.username)
                    : paths.userPublic(profile.username)
                }
                variant="body2"
                underline="hover"
                color="primary"
                sx={{ fontWeight: 800, mt: 0.5, fontSize: '0.875rem', display: 'inline-block' }}
              >
                {handle}
              </Link>
            ) : null}
          </Box>

          {profile.bio ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                maxWidth: 360,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
              }}
            >
              {profile.bio}
            </Typography>
          ) : null}

          {socials.length > 0 ? (
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="center"
              spacing={2}
              sx={{ py: 0.5 }}
            >
              {socials.map((s) => (
                <IconButton
                  key={s.labelKey}
                  component="a"
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t(s.labelKey)}
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: 'action.hover',
                    color: 'text.primary',
                    '&:hover': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                    },
                    transition: theme.transitions.create(['background-color', 'color'], {
                      duration: theme.transitions.duration.shorter,
                    }),
                  }}
                >
                  <Iconify icon={s.icon} width={20} />
                </IconButton>
              ))}
            </Stack>
          ) : null}

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="center"
            spacing={{ xs: 2, sm: 4 }}
            sx={{ py: 1 }}
          >
            <Stack
              alignItems="center"
              spacing={0.25}
              component={isOwnProfile ? RouterLink : Stack}
              href={isOwnProfile ? paths.dashboard.settingsSubscribers : undefined}
              sx={
                isOwnProfile
                  ? {
                      textDecoration: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      borderRadius: 1,
                      px: 0.5,
                      py: 0.25,
                      transition: 'opacity 0.15s',
                      '&:hover': { opacity: 0.72 },
                    }
                  : {}
              }
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 800, fontSize: '1.125rem', ...tabularNumsSx }}
              >
                {formatCompactCount(followerCount)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {t('pages.lists.creator_followers')}
              </Typography>
            </Stack>
            <Divider orientation="vertical" flexItem sx={{ height: 32 }} />
            <Stack
              alignItems="center"
              spacing={0.25}
              component={isOwnProfile ? RouterLink : Stack}
              href={isOwnProfile ? paths.dashboard.lists : undefined}
              sx={
                isOwnProfile
                  ? {
                      textDecoration: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      borderRadius: 1,
                      px: 0.5,
                      py: 0.25,
                      transition: 'opacity 0.15s',
                      '&:hover': { opacity: 0.72 },
                    }
                  : {}
              }
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 800, fontSize: '1.125rem', ...tabularNumsSx }}
              >
                {formatCompactCount(listCount)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {t('pages.lists.creator_nom_nom_lists_stat')}
              </Typography>
            </Stack>
            <Divider orientation="vertical" flexItem sx={{ height: 32 }} />
            <Stack
              alignItems="center"
              spacing={0.25}
              component={isOwnProfile ? RouterLink : Stack}
              href={isOwnProfile ? paths.dashboard.settingsMySubscriptions : undefined}
              sx={
                isOwnProfile
                  ? {
                      textDecoration: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      borderRadius: 1,
                      px: 0.5,
                      py: 0.25,
                      transition: 'opacity 0.15s',
                      '&:hover': { opacity: 0.72 },
                    }
                  : {}
              }
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: 800, fontSize: '1.125rem', ...tabularNumsSx }}
              >
                {formatCompactCount(followingCount)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {t('pages.lists.creator_following')}
              </Typography>
            </Stack>
          </Stack>

          {isOwnProfile ? (
            <Button
              fullWidth
              component={RouterLink}
              href={paths.dashboard.settingsEdit}
              variant="contained"
              color="primary"
              size="large"
              sx={{
                fontWeight: 800,
                py: 1.4,
                borderRadius: 4,
                boxShadow: heroShadow,
                '&:active': { transform: 'scale(0.98)' },
              }}
            >
              {t('pages.lists.creator_edit_profile')}
            </Button>
          ) : (
            <Stack spacing={1} sx={{ width: 1 }}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                aria-busy={followBusy}
                onClick={onFollowClick}
                sx={{
                  fontWeight: 800,
                  py: 1.4,
                  minHeight: 48,
                  borderRadius: 4,
                  boxShadow: heroShadow,
                  '&:active': { transform: followBusy ? 'none' : 'scale(0.98)' },
                  ...(followBusy && { pointerEvents: 'none' }),
                }}
              >
                {followPrimaryActionContent}
              </Button>
              {profileSubscribeCta}
            </Stack>
          )}
        </Stack>
      </Box>

      <Box sx={{ py: 4 }} id="section-lists">
        <Box sx={{ ...profileSectionInsetSx, mb: 2.5 }}>
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: '1.25rem' }}
          >
            {t(listsHeadingKey)}
          </Typography>
        </Box>

        <ScrollableChipRow
          forceControls
          gap={2}
          sx={{ ...profileSectionInsetSx, width: 1 }}
          scrollerSx={{ alignItems: 'flex-start', pb: 1 }}
        >
          {profileListsForDisplay.map((list) => {
            const href = resolveListHref(list.id, list.slug);
            if (!href) return null;
            return (
              <Box
                key={list.id}
                sx={{
                  flex: '0 0 auto',
                  width: LIST_CARD_W,
                  maxWidth: LIST_CARD_W,
                  minWidth: 0,
                }}
              >
                <NomNomListLinkTile
                  list={list}
                  href={href}
                  t={t}
                  compact
                  subtitle={listSpotsVisibilitySubtitle(t, list)}
                />
              </Box>
            );
          })}

          {isOwnProfile ? (
            <Box
              sx={{
                flex: '0 0 auto',
                width: LIST_CARD_W,
                maxWidth: LIST_CARD_W,
                minWidth: 0,
              }}
            >
              <NomNomListCreateTile compact onClick={() => setCreateListOpen(true)} t={t} />
            </Box>
          ) : null}

          {(lists ?? []).length === 0 && !isOwnProfile ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              {t('pages.lists.no_public_lists')}
            </Typography>
          ) : null}
        </ScrollableChipRow>
      </Box>

      <Box
        component="section"
        aria-labelledby="creator-profile-recent-activity-label"
        sx={{ width: 1 }}
      >
        <Box
          sx={{
            ...profileSectionInsetSx,
            py: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography
            id="creator-profile-recent-activity-label"
            variant="h5"
            sx={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: '1.25rem', mb: 2 }}
          >
            {t('pages.lists.creator_tab_recent')}
          </Typography>
          <ScrollableChipRow gap={1} sx={{ mx: 0, width: 1 }}>
            <Button
              type="button"
              color="inherit"
              disableElevation
              aria-pressed={activityFilter === PROFILE_ACTIVITY_FILTER_ALL}
              onClick={() => setActivityFilter(PROFILE_ACTIVITY_FILTER_ALL)}
              sx={scrollableChipPillButtonSx(theme, {
                selected: activityFilter === PROFILE_ACTIVITY_FILTER_ALL,
              })}
            >
              {t('pages.lists.creator_activity_filter_all')}
            </Button>
            <Button
              type="button"
              color="inherit"
              disableElevation
              aria-pressed={activityFilter === PROFILE_ACTIVITY_FILTER_REVIEW}
              onClick={() => setActivityFilter(PROFILE_ACTIVITY_FILTER_REVIEW)}
              sx={scrollableChipPillButtonSx(theme, {
                selected: activityFilter === PROFILE_ACTIVITY_FILTER_REVIEW,
              })}
            >
              {t('pages.lists.creator_activity_filter_reviews')}
            </Button>
            <Button
              type="button"
              color="inherit"
              disableElevation
              aria-pressed={activityFilter === PROFILE_ACTIVITY_FILTER_NOM_NOM_ADDED}
              onClick={() => setActivityFilter(PROFILE_ACTIVITY_FILTER_NOM_NOM_ADDED)}
              sx={scrollableChipPillButtonSx(theme, {
                selected: activityFilter === PROFILE_ACTIVITY_FILTER_NOM_NOM_ADDED,
              })}
            >
              {t('pages.lists.creator_activity_filter_nom_nom_added')}
            </Button>
          </ScrollableChipRow>
        </Box>

        <Box sx={{ ...profileSectionInsetSx, pt: 3, pb: 4 }}>
          {(() => {
            if ((activityRows ?? []).length === 0) {
              return (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: 'center', py: 4 }}
                >
                  {t('pages.lists.creator_activity_empty')}
                </Typography>
              );
            }
            if (filteredActivity.length === 0) {
              return (
                <Stack spacing={2} sx={{ width: 1, alignItems: 'center' }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ textAlign: 'center', py: 2 }}
                  >
                    {t('pages.lists.creator_activity_filter_empty')}
                  </Typography>
                  {activityHasMore ? (
                    <Button
                      type="button"
                      variant="outlined"
                      color="inherit"
                      size="medium"
                      disabled={activityLoadMoreBusy}
                      onClick={handleLoadMoreActivity}
                    >
                      {activityLoadMoreBusy
                        ? t('pages.lists.creator_activity_loading_more')
                        : t('pages.lists.creator_activity_load_more')}
                    </Button>
                  ) : null}
                </Stack>
              );
            }
            return (
              <Stack spacing={1.75} sx={{ width: 1 }}>
                {filteredActivity.map((row, i) => {
                  const kind = row?.kind;
                  const at = row?.at;
                  const rest = row?.restaurant;
                  const list = row?.list;
                  const ratingStr = formatStarRating(row?.rating, currentLang);
                  const when = fToNow(at) || '';
                  let restaurantBase = null;
                  if (rest?.id != null) {
                    restaurantBase =
                      layout === 'dashboard'
                        ? paths.dashboard.restaurant(String(rest.id))
                        : paths.restaurantPublic(String(rest.id));
                  }
                  const restaurantMentionsHref =
                    restaurantBase != null ? `${restaurantBase}${RESTAURANT_MENTIONS_HASH}` : null;
                  const listPageHref =
                    list?.id != null ? resolveListHref(list.id, list.slug) : null;

                  if (kind === 'review' && rest?.name && restaurantMentionsHref) {
                    return (
                      <ActivityCard
                        key={`${kind}-${String(row?.reviewId ?? '')}-${String(rest?.id ?? '')}-${String(at)}-${i}`}
                        icon={row?.isUpdate ? ic.penBold : ic.starBold}
                        typeLabel={t('pages.lists.creator_activity_type_review')}
                        when={when}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.3 }}>
                          {row?.isUpdate
                            ? t('pages.lists.creator_activity_head_review_edit')
                            : t('pages.lists.creator_activity_head_review_new')}
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          <Iconify icon={ic.starBold} width={18} sx={{ color: 'warning.main' }} />
                          <Typography variant="body2" sx={{ fontWeight: 800, ...tabularNumsSx }}>
                            {ratingStr}
                            <Box
                              component="span"
                              sx={{ color: 'text.secondary', fontWeight: 600, ml: 0.5 }}
                            >
                              / 5
                            </Box>
                          </Typography>
                        </Stack>
                        <Stack
                          direction="row"
                          alignItems="center"
                          flexWrap="wrap"
                          sx={{ columnGap: 1, rowGap: 0.5 }}
                        >
                          <Typography
                            component={RouterLink}
                            href={restaurantBase ?? restaurantMentionsHref}
                            variant="body2"
                            sx={activityLinkSx}
                          >
                            {rest.name}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            ·
                          </Typography>
                          <Typography
                            component={RouterLink}
                            href={restaurantMentionsHref}
                            variant="body2"
                            sx={{ ...activityLinkSx, fontWeight: 700 }}
                          >
                            {t('pages.lists.creator_activity_link_mentions_section')}
                          </Typography>
                        </Stack>
                      </ActivityCard>
                    );
                  }

                  if (
                    kind === 'list_spot' &&
                    rest?.name &&
                    list?.name &&
                    restaurantBase &&
                    listPageHref
                  ) {
                    return (
                      <ActivityCard
                        key={`${kind}-${String(list?.id ?? '')}-${String(rest?.id ?? '')}-${String(at)}-${i}`}
                        icon={ic.bookmarkBold}
                        typeLabel={t('pages.lists.creator_activity_type_list_spot')}
                        when={when}
                      >
                        <Box
                          sx={{
                            typography: 'body2',
                            lineHeight: 1.65,
                            color: 'text.secondary',
                          }}
                        >
                          <Box
                            component={RouterLink}
                            href={restaurantBase}
                            sx={{ ...activityLinkSx, typography: 'body2', display: 'inline' }}
                          >
                            {rest.name}
                          </Box>{' '}
                          <Box component="span" sx={{ fontWeight: 500 }}>
                            {t('pages.lists.creator_activity_list_spot_mid')}
                          </Box>{' '}
                          <Box
                            component={RouterLink}
                            href={listPageHref}
                            sx={{ ...activityLinkSx, typography: 'body2', display: 'inline' }}
                          >
                            {list.name}
                          </Box>
                        </Box>
                      </ActivityCard>
                    );
                  }

                  if (kind === 'list_published' && list?.name && listPageHref) {
                    return (
                      <ActivityCard
                        key={`${kind}-${String(list?.id ?? '')}-${String(at)}-${i}`}
                        icon={ic.eyeBold}
                        typeLabel={t('pages.lists.creator_activity_type_published')}
                        when={when}
                      >
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                          {t('pages.lists.creator_activity_published_lead')}
                        </Typography>
                        <Typography
                          component={RouterLink}
                          href={listPageHref}
                          variant="subtitle1"
                          sx={{ ...activityLinkSx, fontSize: '1rem' }}
                        >
                          {list.name}
                        </Typography>
                      </ActivityCard>
                    );
                  }

                  return null;
                })}
                {activityHasMore ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5 }}>
                    <Button
                      type="button"
                      variant="outlined"
                      color="inherit"
                      size="medium"
                      disabled={activityLoadMoreBusy}
                      onClick={handleLoadMoreActivity}
                    >
                      {activityLoadMoreBusy
                        ? t('pages.lists.creator_activity_loading_more')
                        : t('pages.lists.creator_activity_load_more')}
                    </Button>
                  </Box>
                ) : null}
              </Stack>
            );
          })()}
        </Box>
      </Box>

      {isOwnProfile ? (
        <CreateListModal
          open={createListOpen}
          onClose={() => setCreateListOpen(false)}
          onCreated={handleProfileListCreated}
        />
      ) : null}
    </Outer>
  );
}

UserPublicProfileView.propTypes = {
  profile: PropTypes.object,
  lists: PropTypes.array,
  recentActivity: PropTypes.array,
  layout: PropTypes.oneOf(['public', 'dashboard']),
  viewerUserId: PropTypes.string,
  initialFollowing: PropTypes.bool,
};
