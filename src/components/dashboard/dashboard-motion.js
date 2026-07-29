'use client';

import PropTypes from 'prop-types';
import { usePathname } from 'next/navigation';

import { usePrefersReducedMotion } from 'src/hooks/use-prefers-reduced-motion';

import { varFade } from 'src/components/animate/variants';
import { MotionPart, MotionContainer } from 'src/components/animate';

// ----------------------------------------------------------------------

/** Subtle entrance motion for signed-in drill pages (shorter travel than marketing). */
export const dashboardFade = () =>
  varFade({
    distance: 20,
    durationIn: 0.32,
    durationOut: 0.22,
    easeIn: [0.22, 1, 0.36, 1],
    easeOut: [0.25, 1, 0.5, 1],
  });

/**
 * Page-body entrance for dashboard routes. Re-runs on pathname change.
 * Use `stagger` when children are `DashboardMotionSection` blocks.
 */
export function DashboardPageMotion({ children, disabled = false, stagger = false }) {
  const pathname = usePathname();
  const prefersReducedMotion = usePrefersReducedMotion();

  if (disabled || prefersReducedMotion) {
    return children;
  }

  if (stagger) {
    return <MotionContainer key={pathname}>{children}</MotionContainer>;
  }

  return (
    <MotionContainer key={pathname}>
      <MotionPart variants={dashboardFade().inUp}>{children}</MotionPart>
    </MotionContainer>
  );
}

DashboardPageMotion.propTypes = {
  children: PropTypes.node,
  disabled: PropTypes.bool,
  stagger: PropTypes.bool,
};

/** Stagger child inside `DashboardPageMotion` (`stagger` mode). */
export function DashboardMotionSection({ children, ...other }) {
  return (
    <MotionPart variants={dashboardFade().inUp} {...other}>
      {children}
    </MotionPart>
  );
}

DashboardMotionSection.propTypes = {
  children: PropTypes.node,
};
