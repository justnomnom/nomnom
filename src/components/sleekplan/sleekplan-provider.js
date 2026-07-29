'use client';

import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { usePathname } from 'next/navigation';

import { initializeSleekplan } from 'src/libs/sleekplan/sleekplan-service';

export function SleekplanProvider({ children }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname?.startsWith('/dashboard')) {
      return undefined;
    }

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(() => {
        initializeSleekplan();
      });

      return () => {
        window.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = window.setTimeout(() => {
      initializeSleekplan();
    }, 1);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pathname]);

  return children;
}

SleekplanProvider.propTypes = {
  children: PropTypes.node,
};
