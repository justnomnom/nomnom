import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getSiteUrl } from '../site-url.js';

// Save and restore env vars around each test
let savedEnv;
beforeEach(() => {
  savedEnv = {
    SITE_URL: process.env.SITE_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  };
  delete process.env.SITE_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.VERCEL_URL;
});
afterEach(() => {
  if (savedEnv.SITE_URL !== undefined) process.env.SITE_URL = savedEnv.SITE_URL;
  else delete process.env.SITE_URL;
  if (savedEnv.NEXT_PUBLIC_SITE_URL !== undefined) process.env.NEXT_PUBLIC_SITE_URL = savedEnv.NEXT_PUBLIC_SITE_URL;
  else delete process.env.NEXT_PUBLIC_SITE_URL;
  if (savedEnv.VERCEL_URL !== undefined) process.env.VERCEL_URL = savedEnv.VERCEL_URL;
  else delete process.env.VERCEL_URL;
});

test('falls back to localhost when no env set', () => {
  assert.equal(getSiteUrl(), 'http://localhost:3032');
});
test('uses SITE_URL when set with https', () => {
  process.env.SITE_URL = 'https://example.com';
  assert.equal(getSiteUrl(), 'https://example.com');
});
test('strips trailing slash from SITE_URL', () => {
  process.env.SITE_URL = 'https://example.com/';
  assert.equal(getSiteUrl(), 'https://example.com');
});
test('adds https:// when SITE_URL has no protocol', () => {
  process.env.SITE_URL = 'example.com';
  assert.equal(getSiteUrl(), 'https://example.com');
});
test('uses NEXT_PUBLIC_SITE_URL when SITE_URL absent', () => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://app.example.com';
  assert.equal(getSiteUrl(), 'https://app.example.com');
});
test('SITE_URL "tbd" treated as absent, falls back to VERCEL_URL', () => {
  process.env.SITE_URL = 'tbd';
  process.env.VERCEL_URL = 'my-app.vercel.app';
  assert.equal(getSiteUrl(), 'https://my-app.vercel.app');
});
test('uses VERCEL_URL when other env absent', () => {
  process.env.VERCEL_URL = 'my-app.vercel.app';
  assert.equal(getSiteUrl(), 'https://my-app.vercel.app');
});
test('VERCEL_URL strips trailing slash', () => {
  process.env.VERCEL_URL = 'my-app.vercel.app/';
  assert.equal(getSiteUrl(), 'https://my-app.vercel.app');
});
