/**
 * Frontend QA — Capacitor platform helpers (web/SSR defaults).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  getCapacitorPlatform,
  isCapacitorNative,
  isCapacitorPluginAvailable,
} from '../platform.js';

test('isCapacitorNative: false in Node/web test env', () => {
  assert.equal(isCapacitorNative(), false);
});

test('getCapacitorPlatform: web in Node/web test env', () => {
  assert.equal(getCapacitorPlatform(), 'web');
});

test('isCapacitorPluginAvailable: unknown plugin is false', () => {
  assert.equal(isCapacitorPluginAvailable('DefinitelyNotAPlugin'), false);
});
