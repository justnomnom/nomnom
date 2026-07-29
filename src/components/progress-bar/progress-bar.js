'use client';

import NProgress from 'nprogress';
import { Suspense, useEffect } from 'react';

import { usePathname, useSearchParams } from 'src/routes/hooks';

import StyledProgressBar from './styles';

// ----------------------------------------------------------------------

export default function ProgressBar() {
  useEffect(() => {
    NProgress.configure({ showSpinner: false });

    const boundAnchors = new Set();
    const originalPushState = window.history.pushState;

    const handleAnchorClick = (event) => {
      const targetUrl = event.currentTarget.href;

      const currentUrl = window.location.href;

      if (targetUrl !== currentUrl) {
        NProgress.start();
      }
    };

    const bindAnchors = () => {
      const anchorElements = document.querySelectorAll('a[href]');

      const filteredAnchors = Array.from(anchorElements).filter((element) => {
        const href = element.getAttribute('href');
        return href && href.startsWith('/');
      });

      filteredAnchors.forEach((anchor) => {
        if (boundAnchors.has(anchor)) {
          return;
        }
        anchor.addEventListener('click', handleAnchorClick);
        boundAnchors.add(anchor);
      });
    };

    bindAnchors();

    const mutationObserver = new MutationObserver(bindAnchors);

    mutationObserver.observe(document, { childList: true, subtree: true });

    window.history.pushState = new Proxy(originalPushState, {
      apply: (target, thisArg, argArray) => {
        NProgress.done();
        return target.apply(thisArg, argArray);
      },
    });

    return () => {
      mutationObserver.disconnect();
      boundAnchors.forEach((anchor) => {
        anchor.removeEventListener('click', handleAnchorClick);
      });
      window.history.pushState = originalPushState;
    };
  }, []);

  return (
    <>
      <StyledProgressBar />

      <Suspense fallback={null}>
        <NProgressDone />
      </Suspense>
    </>
  );
}

// ----------------------------------------------------------------------

function NProgressDone() {
  const pathname = usePathname();

  const searchParams = useSearchParams();

  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);

  return null;
}
