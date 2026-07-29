'use client';

import PropTypes from 'prop-types';
import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion';

// ----------------------------------------------------------------------

/** Framer `reducedMotion="user"` plus static branches on MotionContainer / MotionViewport / MotionPart.
 *  Uses domAnimation (not domMax) — drag and layout-animation features are not used in this project.
 */
export function MotionLazy({ children }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion strict features={domAnimation}>
        {/*
          Use a plain div — an animated m.* root can apply transform, which makes
          position:fixed AppBars resolve to this ancestor instead of the viewport
          (header clips / sits under content on mobile home).
        */}
        <div style={{ minHeight: '100%' }}>{children}</div>
      </LazyMotion>
    </MotionConfig>
  );
}

MotionLazy.propTypes = {
  children: PropTypes.node,
};
