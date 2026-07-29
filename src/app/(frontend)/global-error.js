'use client';

import { useEffect } from 'react';
import PropTypes from 'prop-types';
import * as Sentry from '@sentry/nextjs';

import { INTEGRATION_FLAGS } from 'src/config-global';

import { MotionLazy } from 'src/components/animate/motion-lazy';

import Error500View from 'src/sections/error/500-view';

// ----------------------------------------------------------------------

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    if (INTEGRATION_FLAGS.sentry) {
      Sentry.captureException(error);
    }
  }, [error]);

  // global-error replaces the root layout entirely, so it must render its own
  // <html>/<body> and a LazyMotion provider — Error500View's m.* content stays
  // at opacity 0 without one.
  return (
    <html lang="en">
      <body>
        <MotionLazy>
          <Error500View reset={reset} />
        </MotionLazy>
      </body>
    </html>
  );
}

GlobalError.propTypes = {
  error: PropTypes.instanceOf(Error).isRequired,
  reset: PropTypes.func.isRequired,
};
