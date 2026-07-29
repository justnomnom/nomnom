/**
 * Frontend QA — OAuth redirect origin (env + loopback rewrite).
 */
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { getAuthRedirectOrigin } from '../auth-utils.js';

let savedOrigin;
let savedNodeEnv;
let prevWindow;

beforeEach(() => {
  savedOrigin = process.env.NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN;
  savedNodeEnv = process.env.NODE_ENV;
  prevWindow = globalThis.window;
  delete process.env.NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN;
});

afterEach(() => {
  if (savedOrigin !== undefined) process.env.NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN = savedOrigin;
  else delete process.env.NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN;
  if (savedNodeEnv !== undefined) process.env.NODE_ENV = savedNodeEnv;
  else delete process.env.NODE_ENV;
  if (prevWindow === undefined) delete globalThis.window;
  else globalThis.window = prevWindow;
});

test('SSR / no window → empty string', () => {
  delete globalThis.window;
  assert.equal(getAuthRedirectOrigin(), '');
});

test('NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN wins (strips trailing slash)', () => {
  process.env.NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN = 'https://tunnel.example/';
  globalThis.window = { location: { hostname: 'tunnel.example', port: '', origin: 'https://tunnel.example' } };
  assert.equal(getAuthRedirectOrigin(), 'https://tunnel.example');
});

test('dev 127.0.0.1 rewritten to localhost', () => {
  process.env.NODE_ENV = 'development';
  globalThis.window = {
    location: { hostname: '127.0.0.1', port: '3032', origin: 'http://127.0.0.1:3032' },
  };
  assert.equal(getAuthRedirectOrigin(), 'http://localhost:3032');
});

test('production uses window.location.origin', () => {
  process.env.NODE_ENV = 'production';
  globalThis.window = {
    location: {
      hostname: 'app.nomnom.example',
      port: '',
      origin: 'https://app.nomnom.example',
    },
  };
  assert.equal(getAuthRedirectOrigin(), 'https://app.nomnom.example');
});
