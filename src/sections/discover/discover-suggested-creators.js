'use client';

import PropTypes from 'prop-types';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { normalizeSuggestedCreator } from 'src/utils/suggested-creator';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { useAuthContext } from 'src/auth/hooks';
import { setFollowUser } from 'src/auth/actions/profile-actions';
import { SPACE, RADIUS, touchTargetSx } from 'src/theme/spacing';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';

import Iconify from 'src/components/iconify';

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
}) {
  const { t } = useTranslate();
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
        return;
      }
      if (next) {
        trackEvent('activation_item_completed', { item: 'follow' });
        onFollowed?.();
      }
      setBusyId('');
    },
    [busyId, localFollowing, onFollowed, router, trackEvent, user?.id]
  );

  if (normalized.length === 0) return null;

  return (
    <Box data-testid="e2e-suggested-creators" sx={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
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
                  variant={following ? 'outlined' : 'contained'}
                  disabled={busy}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleFollow(c);
                  }}
                  sx={{
                    ...touchTargetSx,
                    minWidth: 88,
                    fontWeight: 800,
                    borderRadius: `${RADIUS.tight}px`,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontSize: 12,
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
};
