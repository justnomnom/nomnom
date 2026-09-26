'use client';

import PropTypes from 'prop-types';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { normalizeSuggestedCreator } from 'src/utils/suggested-creator';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { useAuthContext } from 'src/auth/hooks';
import { setFollowUser } from 'src/auth/actions/profile-actions';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import { SPACE, RADIUS, touchTargetSx, TOUCH_TARGET_SIZE } from 'src/theme/spacing';

import Iconify from 'src/components/iconify';

import { dashboardSectionLabelSx } from 'src/sections/profile/view';
import ProfileListItemRow from 'src/sections/profile/profile-list-item-row';

const SUGGESTED_CREATORS_MAX = 4;

/**
 * @param {string[]} ids
 * @returns {Set<string>}
 */
function followingIdSet(ids) {
  return new Set((Array.isArray(ids) ? ids : []).map((id) => String(id).toLowerCase()));
}

/**
 * Suggested people to follow for the current Discover market.
 */
export default function DiscoverSuggestedCreators({
  creators,
  followingIds = [],
  onFollowed,
  onFollowFailed,
}) {
  const { t } = useTranslate();
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthContext();
  const { trackEvent } = useAnalytics();
  const normalized = useMemo(
    () =>
      (Array.isArray(creators) ? creators.map(normalizeSuggestedCreator).filter(Boolean) : []).slice(
        0,
        SUGGESTED_CREATORS_MAX
      ),
    [creators]
  );
  const followingKeySig = (Array.isArray(followingIds) ? followingIds : [])
    .map((id) => String(id).toLowerCase())
    .filter(Boolean)
    .sort()
    .join(',');
  const [localFollowing, setLocalFollowing] = useState(() => followingIdSet(followingIds));
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    setLocalFollowing(followingIdSet(followingKeySig ? followingKeySig.split(',') : []));
  }, [followingKeySig]);

  const handleFollow = useCallback(
    async (creator) => {
      if (!creator?.userId) return;
      if (!user?.id) {
        trackEvent('creator_follow_login_redirected', { creator_id: creator.userId });
        router.push(paths.auth.supabase.login);
        return;
      }
      if (busyId) return;
      const next = !localFollowing.has(creator.userId);
      setBusyId(creator.userId);
      setLocalFollowing((prev) => {
        const copy = new Set(prev);
        if (next) copy.add(creator.userId);
        else copy.delete(creator.userId);
        return copy;
      });
      trackEvent('creator_follow_toggled', {
        creator_id: creator.userId,
        follow: next,
      });
      const { error } = await setFollowUser(creator.userId, next);
      if (error) {
        trackEvent('creator_follow_toggle_failed', {
          creator_id: creator.userId,
          follow: next,
        });
        setLocalFollowing((prev) => {
          const copy = new Set(prev);
          if (next) copy.delete(creator.userId);
          else copy.add(creator.userId);
          return copy;
        });
        setBusyId('');
        onFollowFailed?.();
        return;
      }
      if (next) {
        trackEvent('activation_item_completed', { item: 'follow' });
        onFollowed?.();
      }
      setBusyId('');
    },
    [busyId, localFollowing, onFollowed, onFollowFailed, router, trackEvent, user?.id]
  );

  if (normalized.length === 0) return null;

  return (
    <Box
      component="section"
      aria-labelledby="discover-suggested-people-label"
      data-testid="e2e-suggested-creators"
      sx={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}
    >
      <Typography
        id="discover-suggested-people-label"
        variant="overline"
        sx={dashboardSectionLabelSx(theme)}
      >
        {t('pages.dashboard.discover.suggested_people_title')}
      </Typography>
      <Stack spacing={1}>
        {normalized.map((c) => {
          const following = localFollowing.has(c.userId);
          const busy = busyId === c.userId;
          const title = c.name || t('pages.dashboard.discover.creator_fallback');
          return (
            <ProfileListItemRow
              key={c.userId}
              avatarSrc={c.avatar}
              avatarFallback={<Iconify icon={ic.userSpeakRoundedBold} width={22} />}
              title={title}
              subtitle={c.subtitle}
              username={c.username || undefined}
              trailingAction={
                <Button
                  size="small"
                  color="primary"
                  variant={following ? 'outlined' : 'soft'}
                  disabled={busy}
                  aria-busy={busy}
                  aria-label={
                    following
                      ? t('pages.onboarding.creators.following')
                      : t('pages.onboarding.creators.follow')
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleFollow(c);
                  }}
                  sx={{
                    ...touchTargetSx,
                    height: TOUCH_TARGET_SIZE,
                    minHeight: TOUCH_TARGET_SIZE,
                    minWidth: 88,
                    fontWeight: 800,
                    borderRadius: `${RADIUS.tight}px`,
                    px: 1.5,
                  }}
                >
                  {busy ? <CircularProgress size={16} color="inherit" thickness={5} /> : null}
                  {!busy && following ? t('pages.onboarding.creators.following') : null}
                  {!busy && !following ? t('pages.onboarding.creators.follow') : null}
                </Button>
              }
            />
          );
        })}
      </Stack>
    </Box>
  );
}

DiscoverSuggestedCreators.propTypes = {
  creators: PropTypes.arrayOf(PropTypes.object),
  followingIds: PropTypes.arrayOf(PropTypes.string),
  onFollowed: PropTypes.func,
  onFollowFailed: PropTypes.func,
};
