'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { SPACE, RADIUS } from 'src/theme/spacing';
import { hoverable } from 'src/theme/overrides/hoverable';

import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

const ICON_BOX_PX = 48;

/**
 * Discover promo card for Table and Roulette. Same chrome as those product pages
 * (paper + `customShadows.card` + rotated terracotta icon stamp) so the two sit as a
 * matching pair rather than a hero row stacked on a smaller tile.
 */
export default function DiscoverFeaturePromo({
  href,
  icon,
  iconClassName,
  title,
  subtitle,
  onNavigate,
  rotateDeg = 3,
}) {
  return (
    <Button
      component={RouterLink}
      href={href}
      fullWidth
      onClick={onNavigate}
      sx={{
        height: 1,
        minWidth: 0,
        minHeight: 0,
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        gap: SPACE.sm,
        textAlign: 'left',
        textTransform: 'none',
        borderRadius: 2,
        px: SPACE.md,
        py: SPACE.md,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        color: 'text.primary',
        boxShadow: (tt) => tt.customShadows.card,
        transition: (tt) =>
          tt.transitions.create(['box-shadow', 'transform'], {
            duration: tt.transitions.duration.shorter,
          }),
        ...hoverable({
          // Keep paper — inherit text buttons otherwise paint `action.hover` grey.
          bgcolor: 'background.paper',
          boxShadow: (tt) => tt.customShadows.z4,
          [`& .${iconClassName}`]: {
            transform: 'rotate(-4deg) scale(1.06)',
          },
        }),
        '&:active': { transform: 'scale(0.98)' },
        '@media (prefers-reduced-motion: reduce)': {
          '&:active': { transform: 'none' },
          [`&:hover .${iconClassName}`]: { transform: 'none' },
        },
      }}
    >
      <Box
        className={iconClassName}
        sx={{
          width: ICON_BOX_PX,
          height: ICON_BOX_PX,
          borderRadius: `${RADIUS.base}px`,
          bgcolor: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `rotate(${rotateDeg}deg)`,
          flexShrink: 0,
          boxShadow: (tt) => `0 8px 20px ${alpha(tt.palette.primary.main, 0.25)}`,
          transition: (tt) =>
            tt.transitions.create('transform', {
              duration: tt.transitions.duration.shorter,
            }),
          '@media (prefers-reduced-motion: reduce)': {
            transform: 'none',
            transition: 'none',
          },
        }}
      >
        <Iconify icon={icon} width={28} sx={{ color: 'primary.contrastText' }} />
      </Box>
      <Box sx={{ minWidth: 0, width: 1 }}>
        <Typography
          sx={{
            fontWeight: 800,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontWeight: 700,
            display: '-webkit-box',
            overflow: 'hidden',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {subtitle}
        </Typography>
      </Box>
    </Button>
  );
}

DiscoverFeaturePromo.propTypes = {
  href: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  iconClassName: PropTypes.string.isRequired,
  title: PropTypes.node.isRequired,
  subtitle: PropTypes.node.isRequired,
  onNavigate: PropTypes.func,
  rotateDeg: PropTypes.number,
};
