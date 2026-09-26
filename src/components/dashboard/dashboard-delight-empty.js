'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { usePrefersReducedMotion } from 'src/hooks/use-prefers-reduced-motion';

import { SPACE, RADIUS, TOUCH_TARGET_SIZE } from 'src/theme/spacing';

import { m } from 'src/components/animate';
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

/**
 * Empty CTA layout: full-width under the copy column on mobile, natural width when centered on sm+.
 * (Parent action slot is a centered flex column — see DashboardDelightEmpty.)
 */
const delightEmptyCtaSx = {
  width: { xs: '100%', sm: 'auto' },
  minWidth: { sm: TOUCH_TARGET_SIZE },
  minHeight: TOUCH_TARGET_SIZE,
};

/**
 * Empty-state CTA (DESIGN.md §7 + button hierarchy).
 * Contained primary by default; use `variant="soft"` when another contained CTA owns the screen.
 */
export function DashboardDelightEmptyCta({ children, variant = 'contained', sx, ...other }) {
  return (
    <Button
      variant={variant}
      color="primary"
      size="small"
      sx={[delightEmptyCtaSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
      {...other}
    >
      {children}
    </Button>
  );
}

DashboardDelightEmptyCta.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['contained', 'soft', 'outlined', 'text']),
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

/**
 * Empty state that teaches the next step (DESIGN.md §7): muted icon, heading, one-line how-to, CTA.
 * @param {object} props
 * @param {boolean} [props.compact] Nested surfaces (sheets, cards, popovers) use a tighter panel.
 */
export default function DashboardDelightEmpty({ icon, title, body, action, compact = false, sx }) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const enterMotion = prefersReducedMotion
    ? {}
    : {
        component: m.div,
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35, ease: [0.25, 1, 0.5, 1] },
      };

  const iconWrap = compact ? 56 : 72;
  const iconSize = compact ? 28 : 36;
  const copyMaxWidth = compact ? 320 : 440;

  return (
    <Box
      role="status"
      sx={{
        py: compact ? SPACE.lg : SPACE.xl,
        px: SPACE.md,
        textAlign: 'center',
        borderRadius: `${RADIUS.base}px`,
        bgcolor: (th) => alpha(th.palette.primary.main, 0.04),
        border: (th) => `1px dashed ${alpha(th.palette.primary.main, 0.22)}`,
        ...sx,
      }}
    >
      <Box {...enterMotion} sx={{ display: 'flex', justifyContent: 'center' }}>
        <Box
          sx={{
            width: iconWrap,
            height: iconWrap,
            mb: compact ? SPACE.sm : SPACE.md,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            bgcolor: (th) =>
              alpha(th.palette.text.primary, th.palette.mode === 'dark' ? 0.08 : 0.05),
          }}
        >
          <Iconify icon={icon} width={iconSize} sx={{ color: 'text.disabled' }} />
        </Box>
      </Box>

      <Typography
        variant={compact ? 'subtitle2' : 'subtitle1'}
        sx={{ mb: SPACE.xxs, fontWeight: 700 }}
      >
        {title}
      </Typography>
      {body ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ maxWidth: copyMaxWidth, mx: 'auto' }}
        >
          {body}
        </Typography>
      ) : null}
      {action ? (
        <Box
          sx={{
            mt: compact ? SPACE.sm : SPACE.md,
            mx: 'auto',
            width: 1,
            maxWidth: copyMaxWidth,
            display: 'flex',
            flexDirection: 'column',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: SPACE.xs,
          }}
        >
          {action}
        </Box>
      ) : null}
    </Box>
  );
}

DashboardDelightEmpty.propTypes = {
  icon: PropTypes.string.isRequired,
  title: PropTypes.node.isRequired,
  body: PropTypes.node,
  action: PropTypes.node,
  compact: PropTypes.bool,
  sx: PropTypes.object,
};
