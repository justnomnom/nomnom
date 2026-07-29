/**
 * Frontend QA — Supabase auth cookie prefix + UI locale cookie helpers.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getSupabaseAuthCookiePrefix } from '../supabase/supabase-cookie-helpers.js';
import {
  UI_LOCALE_COOKIE,
  htmlLangFromUiLocaleCookie,
  readUiLocaleCookie,
  setUiLocaleCookie,
} from '../ui-locale.js';

test('getSupabaseAuthCookiePrefix: nullish → sb-', () => {
  assert.equal(getSupabaseAuthCookiePrefix(undefined), 'sb-');
  assert.equal(getSupabaseAuthCookiePrefix(''), 'sb-');
});

test('getSupabaseAuthCookiePrefix: project ref from hostname', () => {
  assert.equal(
    getSupabaseAuthCookiePrefix('https://abcdefghijklmnop.supabase.co'),
    'sb-abcdefghijklmnop-'
  );
});

test('getSupabaseAuthCookiePrefix: invalid URL → sb-', () => {
  assert.equal(getSupabaseAuthCookiePrefix('not a url'), 'sb-');
});

test('htmlLangFromUiLocaleCookie: only pt is pt; everything else en', () => {
  assert.equal(htmlLangFromUiLocaleCookie('pt'), 'pt');
  assert.equal(htmlLangFromUiLocaleCookie('en'), 'en');
  assert.equal(htmlLangFromUiLocaleCookie('pt-BR'), 'en');
  assert.equal(htmlLangFromUiLocaleCookie(undefined), 'en');
  assert.equal(htmlLangFromUiLocaleCookie(''), 'en');
});

test('readUiLocaleCookie / setUiLocaleCookie: SSR-safe without document', () => {
  assert.equal(UI_LOCALE_COOKIE, 'ui_locale');
  assert.equal(readUiLocaleCookie(), null);
  // Should no-op without throwing when document is undefined (Node).
  setUiLocaleCookie('pt');
});

test('readUiLocaleCookie: parses document.cookie when present', () => {
  const prev = globalThis.document;
  globalThis.document = {
    cookie: 'foo=1; ui_locale=pt; bar=2',
  };
  try {
    assert.equal(readUiLocaleCookie(), 'pt');
  } finally {
    if (prev === undefined) delete globalThis.document;
    else globalThis.document = prev;
  }
});

test('setUiLocaleCookie: normalizes pt-* → pt and writes cookie', () => {
  const prev = globalThis.document;
  let written = '';
  globalThis.document = {
    get cookie() {
      return written;
    },
    set cookie(v) {
      written = v;
    },
  };
  try {
    setUiLocaleCookie('pt-BR');
    assert.match(written, /^ui_locale=pt;/);
    setUiLocaleCookie('en-US');
    assert.match(written, /^ui_locale=en;/);
  } finally {
    if (prev === undefined) delete globalThis.document;
    else globalThis.document = prev;
  }
});
