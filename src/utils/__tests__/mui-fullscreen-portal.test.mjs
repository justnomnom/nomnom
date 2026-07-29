/**
 * Frontend QA — fullscreen portal props (SSR-safe).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { muiFullscreenPortalContainerProps } from '../mui-fullscreen-portal.js';

test('muiFullscreenPortalContainerProps: SSR (no document) → {}', () => {
  // node:test has no document by default
  assert.deepEqual(muiFullscreenPortalContainerProps(true), {});
  assert.deepEqual(muiFullscreenPortalContainerProps(false), {});
});
