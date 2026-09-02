'use client';

import PropTypes from 'prop-types';
import Skeleton from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { usePrefersReducedMotion } from 'src/hooks/use-prefers-reduced-motion';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { readableAccent } from 'src/theme/readable-accent';
import { followCircleMemberLabel } from 'src/libs/restaurant/follow-circle';

import Iconify from 'src/components/iconify';
import { m as motion } from 'src/components/animate';

// ----------------------------------------------------------------------

const SLOT_COUNT = 3;
const AVATAR_EASE = [0.22, 1, 0.36, 1];

const avatarSx = {
  width: { xs: 32, sm: 36 },
  height: { xs: 32, sm: 36 },
  ml: -1,
  border: '2px solid',
  borderColor: 'background.paper',
  boxShadow: 2,
  bgcolor: (tt) => alpha(tt.palette.primary.main, 0.12),
  color: (theme) => readableAccent(theme),
};

const iconSx = { width: { xs: 16, sm: 18 }, height: { xs: 16, sm: 18 } };

function RenderAvatar({ avatarUrl, animate, delay, label, href }) {
  // `label` is present only for savers the RPC identified — i.e. those who also wrote a
  // review, which is already public. Anonymous savers get alt="" and no link, so the avatar
  // row never becomes a way to work out who saved a place privately.
  const node = (
    <Avatar
      src={avatarUrl || undefined}
      alt={label ?? ''}
      sx={avatarSx}
      {...(href ? { component: 'a', href, 'aria-label': label ?? undefined } : {})}
      {...(label && !href ? { title: label } : {})}
    >
      {!avatarUrl ? <Iconify icon={ic.userBold} width={18} sx={iconSx} /> : null}
    </Avatar>
  );
  if (!animate) return <Box sx={{ display: 'inline-flex' }}>{node}</Box>;
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, scale: 0.55 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: AVATAR_EASE, delay }}
      sx={{ display: 'inline-flex', transformOrigin: 'center' }}
    >
      {node}
    </Box>
  );
}

RenderAvatar.propTypes = {
  avatarUrl: PropTypes.string,
  animate: PropTypes.bool,
  delay: PropTypes.number,
  label: PropTypes.string,
  href: PropTypes.string,
};

export default function RestaurantFollowCircleCard({
  followCircle,
  followCircleLoading = false,
  mapsHref = null,
  onMapsClick,
  mapsDisabled = false,
  trailing = null,
  hideCircle = false,
  sx,
}) {
  const { t } = useTranslate();
  const prefersReducedMotion = usePrefersReducedMotion();

  const total =
    followCircle && typeof followCircle.total === 'number' && Number.isFinite(followCircle.total)
      ? followCircle.total
      : 0;
  const useFollowCircle = total > 0;
  const members =
    useFollowCircle && Array.isArray(followCircle?.members) ? followCircle.members : [];
  const extra = useFollowCircle ? Math.max(0, total - SLOT_COUNT) : 0;

  let circleSubText = t('pages.dashboard.restaurant.meter_circle_sub');
  if (useFollowCircle && total === 1) {
    circleSubText = t('pages.dashboard.restaurant.meter_circle_sub_follows_one');
  } else if (useFollowCircle) {
    circleSubText = t('pages.dashboard.restaurant.meter_circle_sub_follows', { count: total });
  }

  const avatarSlots = [];
  if (followCircleLoading) {
    for (let i = 0; i < SLOT_COUNT; i += 1) {
      avatarSlots.push(
        <Box
          key={`loading-${i}`}
          sx={{
            ...avatarSx,
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'inline-block',
          }}
        >
          <Skeleton circle width="100%" height="100%" style={{ display: 'block' }} />
        </Box>
      );
    }
  } else if (useFollowCircle) {
    members.slice(0, SLOT_COUNT).forEach((m, i) => {
      const label = followCircleMemberLabel(m);
      avatarSlots.push(
        <RenderAvatar
          key={m.userId ?? `member-${i}`}
          avatarUrl={m.avatarUrl}
          animate={!prefersReducedMotion}
          delay={i * 0.08}
          label={label ?? undefined}
          // Only a named member gets a profile link. `username` is the public handle the
          // profile route is keyed on, so a member without one stays unlinked even if named.
          href={label && m.username ? paths.dashboard.userPublic(m.username) : undefined}
        />
      );
    });
  } else {
    for (let i = 0; i < SLOT_COUNT; i += 1) {
      avatarSlots.push(<RenderAvatar key={`ph-${i}`} animate={false} />);
    }
  }

  const extraAvatar =
    !followCircleLoading && useFollowCircle && extra > 0 ? (
      <Box
        component={prefersReducedMotion ? 'span' : motion.div}
        {...(!prefersReducedMotion && {
          initial: { opacity: 0, scale: 0.55 },
          animate: { opacity: 1, scale: 1 },
          transition: {
            duration: 0.2,
            ease: AVATAR_EASE,
            delay: Math.min(members.length, SLOT_COUNT) * 0.08,
          },
        })}
        sx={{ display: 'inline-flex', transformOrigin: 'center' }}
      >
        <Avatar
          sx={{
            ...avatarSx,
            fontSize: { xs: '0.5625rem', sm: '0.625rem' },
            fontWeight: 800,
          }}
        >
          {t('pages.dashboard.restaurant.meter_circle_extra', { count: extra })}
        </Avatar>
      </Box>
    ) : null;

  const mapsButtonSx = {
    // Do not shrink beside the circle — wrap to the next row instead of crushing copy.
    flex: '1 0 11rem',
    maxWidth: '100%',
    fontWeight: 800,
    fontStyle: 'italic',
    fontSize: { xs: '0.65rem', sm: '0.75rem' },
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    borderRadius: '16px',
    py: 1.5,
    px: 2.5,
    minHeight: 48,
    whiteSpace: 'nowrap',
    WebkitTapHighlightColor: 'transparent',
    boxShadow: (tt) => `0 12px 24px -6px ${alpha(tt.palette.primary.main, 0.35)}`,
    '& .MuiButton-startIcon': { transition: 'transform 0.2s' },
    '&:hover .MuiButton-startIcon': { transform: 'scale(1.15)' },
  };

  const mapsButtonCommon = {
    variant: 'contained',
    color: 'primary',
    size: 'large',
    startIcon: <Iconify icon={ic.mapPointBold} width={20} />,
    sx: mapsButtonSx,
    children: t('pages.dashboard.restaurant.open_maps'),
  };

  let mapsButton = null;
  if (mapsHref) {
    mapsButton = (
      <Button
        {...mapsButtonCommon}
        component="a"
        href={mapsHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onMapsClick}
      />
    );
  } else if (onMapsClick) {
    mapsButton = <Button {...mapsButtonCommon} onClick={onMapsClick} disabled={mapsDisabled} />;
  }

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: { xs: '24px', sm: '32px' },
        p: { xs: 2, sm: 3 },
        border: (tt) => `1px solid ${alpha(tt.palette.primary.main, 0.2)}`,
        bgcolor: (tt) => alpha(tt.palette.primary.main, 0.05),
        ...sx,
      }}
    >
      <Stack
        direction="row"
        flexWrap="wrap"
        useFlexGap
        alignItems="center"
        justifyContent={hideCircle ? 'center' : 'space-between'}
        spacing={2}
      >
        {hideCircle ? null : (
          <Stack
            direction="row"
            alignItems="center"
            spacing={{ xs: 1.5, sm: 2 }}
            sx={{
              // Keep enough room for the title + sub; Maps wraps instead of crushing to 1-word lines.
              flex: '1 1 18rem',
              minWidth: { xs: '100%', sm: '14rem' },
              maxWidth: '100%',
            }}
          >
            <Stack direction="row" alignItems="center" sx={{ pl: 0.5, flexShrink: 0 }}>
              <Stack direction="row">
                {avatarSlots}
                {extraAvatar}
              </Stack>
              {trailing}
            </Stack>
            <Box sx={{ flex: '1 1 auto', minWidth: '7.5rem' }}>
              <Typography
                variant="caption"
                sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem' }}
              >
                {t('pages.dashboard.restaurant.meter_circle_title')}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: 'block',
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  lineHeight: 1.45,
                }}
              >
                {followCircleLoading ? (
                  <Skeleton width={120} height={10} style={{ borderRadius: 4 }} />
                ) : (
                  circleSubText
                )}
              </Typography>
            </Box>
          </Stack>
        )}
        {mapsButton}
      </Stack>
    </Box>
  );
}

RestaurantFollowCircleCard.propTypes = {
  followCircle: PropTypes.shape({
    total: PropTypes.number,
    members: PropTypes.arrayOf(
      PropTypes.shape({
        // Null for savers the RPC deliberately did not identify.
        userId: PropTypes.string,
        avatarUrl: PropTypes.string,
        displayName: PropTypes.string,
        username: PropTypes.string,
      })
    ),
  }),
  followCircleLoading: PropTypes.bool,
  mapsHref: PropTypes.string,
  onMapsClick: PropTypes.func,
  mapsDisabled: PropTypes.bool,
  trailing: PropTypes.node,
  hideCircle: PropTypes.bool,
  sx: PropTypes.object,
};
