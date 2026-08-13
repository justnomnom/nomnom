'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { ic } from 'src/assets/icons';
import { SPACE } from 'src/theme/spacing';

import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

/**
 * Discover home feature promo row (Decide / Tonight / Roulette).
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
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: SPACE.xs,
        borderRadius: 4,
        px: { xs: SPACE.sm, sm: SPACE.md },
        py: { xs: 1.25, sm: SPACE.sm },
        minHeight: { xs: 56, sm: undefined },
        textAlign: 'left',
        border: (tt) => `2px solid ${alpha(tt.palette.primary.main, 0.15)}`,
        bgcolor: (tt) => alpha(tt.palette.primary.main, 0.06),
        color: 'text.primary',
        transition: (tt) =>
          tt.transitions.create(['background-color', 'border-color', 'transform'], {
            duration: tt.transitions.duration.shorter,
          }),
        '&:hover': {
          bgcolor: (tt) => alpha(tt.palette.primary.main, 0.1),
          borderColor: (tt) => alpha(tt.palette.primary.main, 0.28),
          [`& .${iconClassName}`]: {
            transform: 'rotate(-4deg) scale(1.06)',
          },
        },
        [`@media (prefers-reduced-motion: reduce)`]: {
          [`&:hover .${iconClassName}`]: {
            transform: 'none',
          },
        },
      }}
    >
      <Stack
        direction="row"
        spacing={SPACE.md}
        alignItems="center"
        sx={{ minWidth: 0, flex: 1, textAlign: 'left' }}
      >
        <Box
          className={iconClassName}
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
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
        <Box sx={{ minWidth: 0 }}>
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
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {subtitle}
          </Typography>
        </Box>
      </Stack>
      <Iconify icon={ic.arrowRightBold} width={22} sx={{ color: 'primary.main', flexShrink: 0 }} />
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
