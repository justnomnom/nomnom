'use client';

import { m } from 'framer-motion';
import PropTypes from 'prop-types';

import { usePrefersReducedMotion } from 'src/hooks/use-prefers-reduced-motion';

// ----------------------------------------------------------------------

/**
 * Framer `m.div` with variants, or a static `div` when `prefers-reduced-motion: reduce`.
 * Use for staggered / entrance blocks inside a parent `MotionContainer` or standalone.
 */
export default function MotionPart({ children, variants, ...rest }) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (prefersReducedMotion) {
    return <div {...rest}>{children}</div>;
  }

  return (
    <m.div variants={variants} {...rest}>
      {children}
    </m.div>
  );
}

MotionPart.propTypes = {
  children: PropTypes.node,
  variants: PropTypes.object,
};
