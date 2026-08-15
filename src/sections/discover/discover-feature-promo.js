'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { ic } from 'src/assets/icons';
import { SPACE, RADIUS } from 'src/theme/spacing';

import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

/**
 * Action inside the Discover "can't decide" group card.
 *
 * Both variants are deliberately container-less: the group card around them supplies the
 * border and tint, so these must not add a second one (DESIGN.md §"No nested cards").
 *
 * - `hero`  — full-width row, 48px icon tile, chevron. The primary action.
 * - `tile`  — half-width region, 36px icon, no chevron. Also surface-less: a filled panel
 *   here out-pops the hero and turns the card into a card-of-cards. Separation comes from
 *   the hairline the parent grid draws between the two. Stacks vertically on `xs` where the
 *   column is ~150px, and goes side-by-side from `sm` up where a vertical stack would leave
 *   a void beside the icon.
 */
export default function DiscoverFeaturePromo({
  href,
  icon,
  iconClassName,
  title,
  subtitle,
  onNavigate,
  rotateDeg = 3,
  variant = 'hero',
}) {
  const isTile = variant === 'tile';
  const iconBoxPx = isTile ? 36 : 48;

  return (
    <Button
      component={RouterLink}
      href={href}
      fullWidth
      onClick={onNavigate}
      sx={{
        justifyContent: isTile ? 'flex-start' : 'space-between',
        alignItems: isTile ? { xs: 'flex-start', sm: 'center' } : 'center',
        flexDirection: isTile ? { xs: 'column', sm: 'row' } : 'row',
        gap: SPACE.xs,
        borderRadius: `${RADIUS.base}px`,
        px: isTile ? SPACE.sm : { xs: SPACE.xs, sm: SPACE.sm },
        py: isTile ? SPACE.sm : { xs: 1.25, sm: SPACE.sm },
        minHeight: isTile ? undefined : { xs: 56, sm: undefined },
        height: isTile ? 1 : undefined,
        textAlign: 'left',
        // Both variants are transparent — the group card's tint is the only surface.
        bgcolor: 'transparent',
        color: 'text.primary',
        transition: (tt) =>
          tt.transitions.create(['background-color', 'transform'], {
            duration: tt.transitions.duration.shorter,
          }),
        '&:hover': {
          bgcolor: (tt) => alpha(tt.palette.primary.main, 0.1),
          [`& .${iconClassName}`]: {
            transform: 'rotate(-4deg) scale(1.06)',
          },
        },
        '&:active': { transform: 'scale(0.98)' },
        // Only the two motion effects are reset; the hover tint is a colour change, not motion,
        // so it survives — the row must still look interactive.
        '@media (prefers-reduced-motion: reduce)': {
          '&:active': { transform: 'none' },
          [`&:hover .${iconClassName}`]: { transform: 'none' },
        },
      }}
    >
      <Stack
        direction={isTile ? { xs: 'column', sm: 'row' } : 'row'}
        spacing={isTile ? { xs: SPACE.xs, sm: SPACE.sm } : SPACE.md}
        alignItems={isTile ? { xs: 'flex-start', sm: 'center' } : 'center'}
        sx={{ minWidth: 0, flex: 1, width: 1, textAlign: 'left' }}
      >
        <Box
          className={iconClassName}
          sx={{
            width: iconBoxPx,
            height: iconBoxPx,
            borderRadius: `${RADIUS.tight}px`,
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
          <Iconify
            icon={icon}
            width={isTile ? 20 : 28}
            sx={{ color: 'primary.contrastText' }}
          />
        </Box>
        <Box sx={{ minWidth: 0, width: 1 }}>
          <Typography
            sx={{
              fontWeight: 800,
              ...(isTile && { fontSize: 14, lineHeight: 1.3 }),
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
              WebkitLineClamp: isTile ? 3 : 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {subtitle}
          </Typography>
        </Box>
      </Stack>
      {isTile ? null : (
        <Iconify icon={ic.arrowRightBold} width={22} sx={{ color: 'primary.main', flexShrink: 0 }} />
      )}
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
  variant: PropTypes.oneOf(['hero', 'tile']),
};
