'use client';

import { m } from 'framer-motion';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';

import { useResponsive } from 'src/hooks/use-responsive';
import { usePrefersReducedMotion } from 'src/hooks/use-prefers-reduced-motion';

import { varContainer } from './variants';

// ----------------------------------------------------------------------

/**
 * Scroll-triggered animation container.
 *
 * Three render paths:
 *   1. prefers-reduced-motion OR mobile (disableAnimatedMobile) → plain Box, content always visible.
 *   2. SSR (typeof window === 'undefined') → plain Box so server HTML / crawlers see content
 *      at full opacity. Framer Motion takes over after hydration.
 *   3. Client with animations enabled → m.div with whileInView, fires when ANY pixel enters
 *      the viewport (amount: 0) with a 60px bottom rootMargin so content starts animating
 *      slightly before it's fully in view.
 */
export default function MotionViewport({ children, disableAnimatedMobile = true, ...other }) {
  const smDown = useResponsive('down', 'sm');
  const prefersReducedMotion = usePrefersReducedMotion();

  // SSR: render plain Box so server-rendered HTML and crawlers see fully visible content.
  // Framer Motion will re-render on the client after hydration.
  if (typeof window === 'undefined') {
    return <Box {...other}>{children}</Box>;
  }

  if (prefersReducedMotion || (smDown && disableAnimatedMobile)) {
    return <Box {...other}>{children}</Box>;
  }

  return (
    <Box
      component={m.div}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, amount: 0, margin: '0px 0px -60px 0px' }}
      variants={varContainer()}
      {...other}
    >
      {children}
    </Box>
  );
}

MotionViewport.propTypes = {
  children: PropTypes.node,
  disableAnimatedMobile: PropTypes.bool,
};
