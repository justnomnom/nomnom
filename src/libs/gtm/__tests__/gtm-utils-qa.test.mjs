/**
 * Frontend QA — GTM helpers are SSR-safe no-ops when disabled / no window.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pushToDataLayer, trackGTMEvent, trackGTMPageView } from '../gtm-utils.js';

test('pushToDataLayer: no-op without window (does not throw)', () => {
  assert.equal(typeof window, 'undefined');
  pushToDataLayer({ event: 'test' });
  trackGTMEvent('click', { a: 1 });
  trackGTMPageView('/x', 'X');
});

test('pushToDataLayer: when window present and GTM enabled-or-not, never throws', () => {
  const prev = globalThis.window;
  const dataLayer = [];
  globalThis.window = { dataLayer };
  try {
    pushToDataLayer({ event: 'qa_event', value: 1 });
    // If GTM_API.enabled is false, dataLayer stays empty; if true, event is pushed.
    assert.ok(Array.isArray(globalThis.window.dataLayer));
  } finally {
    if (prev === undefined) delete globalThis.window;
    else globalThis.window = prev;
  }
});
