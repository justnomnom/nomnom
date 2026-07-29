import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getSupabaseAuthCookiePrefix } from '../supabase-cookie-helpers.js';

test('getSupabaseAuthCookiePrefix: project ref from URL host', () => {
  assert.equal(getSupabaseAuthCookiePrefix('https://abc123.supabase.co'), 'sb-abc123-');
  assert.equal(getSupabaseAuthCookiePrefix(undefined), 'sb-');
  assert.equal(getSupabaseAuthCookiePrefix('bad'), 'sb-');
});
