import { test } from 'node:test';
import assert from 'node:assert/strict';

import { shouldDeferInitialBboxFetch } from '../map-initial-fetch-gate.js';

test('defers until home locality is ready', () => {
  assert.equal(
    shouldDeferInitialBboxFetch({
      homeLocalityReady: false,
      hasReceivedInitialBounds: true,
      hasMapToken: true,
    }),
    true
  );
});

test('with a live map, defers until real bounds have been received (the "searches twice" guard)', () => {
  assert.equal(
    shouldDeferInitialBboxFetch({
      homeLocalityReady: true,
      hasReceivedInitialBounds: false,
      hasMapToken: true,
    }),
    true
  );
});

test('fetches once real bounds have landed', () => {
  assert.equal(
    shouldDeferInitialBboxFetch({
      homeLocalityReady: true,
      hasReceivedInitialBounds: true,
      hasMapToken: true,
    }),
    false
  );
});

test('with no map token there are no bounds to wait for — fetch against the preview bbox', () => {
  assert.equal(
    shouldDeferInitialBboxFetch({
      homeLocalityReady: true,
      hasReceivedInitialBounds: false,
      hasMapToken: false,
    }),
    false
  );
});

test('home-locality gate wins even without a map token', () => {
  assert.equal(
    shouldDeferInitialBboxFetch({
      homeLocalityReady: false,
      hasReceivedInitialBounds: false,
      hasMapToken: false,
    }),
    true
  );
});
