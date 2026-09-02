'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { usePrefersReducedMotion } from 'src/hooks/use-prefers-reduced-motion';

import { readableAccent } from 'src/theme/readable-accent';

import { m } from 'src/components/animate';
import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

/**
 * Warm empty state for dashboard drill pages — soft primary halo + gentle icon motion.
 */
export default function DashboardDelightEmpty({ icon, title, body, action, sx }) {
  const theme = useTheme();
  const prefersReducedMotion = usePrefersReducedMotion();

  const enterMotion = prefersReducedMotion
    ? {}
    : {
        component: m.div,
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35, ease: [0.25, 1, 0.5, 1] },
      };

  const floatMotion = prefersReducedMotion
    ? {}
    : {
        component: m.div,
        animate: { y: [0, -5, 0] },
        transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
      };

  return (
    <Box
      role="status"
      sx={{
        py: 5,
        px: 2,
        textAlign: 'center',
        borderRadius: 2,
        bgcolor: (th) => alpha(th.palette.primary.main, 0.04),
        border: (th) => `1px dashed ${alpha(th.palette.primary.main, 0.22)}`,
        ...sx,
      }}
    >
      <Box {...enterMotion} sx={{ display: 'flex', justifyContent: 'center' }}>
        <Box
          sx={{
            position: 'relative',
            width: 72,
            height: 72,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.primary.main, 0.12),
            }}
          />
          <Box {...floatMotion} sx={{ position: 'relative', zIndex: 1, lineHeight: 0 }}>
            <Iconify icon={icon} width={40} sx={{ color: readableAccent(theme) }} />
          </Box>
        </Box>
      </Box>

      <Typography variant="subtitle1" sx={{ mb: 0.75, fontWeight: 800 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440, mx: 'auto' }}>
        {body}
      </Typography>
      {action ? <Box sx={{ mt: 2.5 }}>{action}</Box> : null}
    </Box>
  );
}

DashboardDelightEmpty.propTypes = {
  icon: PropTypes.string.isRequired,
  title: PropTypes.node.isRequired,
  body: PropTypes.node,
  action: PropTypes.node,
  sx: PropTypes.object,
};
