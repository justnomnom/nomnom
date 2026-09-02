/**
 * Server viewer lang matches cookie first, then Accept-Language pt*, else en.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';

/** @type {Record<string, string>} */
let cookieStore = {};
let acceptLanguage = '';

mock.module('next/headers', {
  exports: {
    cookies: async () => ({
      get(name) {
        return cookieStore[name] ? { value: cookieStore[name] } : undefined;
      },
    }),
    headers: async () => ({
      get(name) {
        return String(name).toLowerCase() === 'accept-language' ? acceptLanguage : null;
      },
    }),
  },
});

const { getServerViewerLang } = await import('../i18n-server.js');

describe('getServerViewerLang', { concurrency: false }, () => {
  beforeEach(() => {
    cookieStore = {};
    acceptLanguage = '';
  });

  test('ui_locale cookie wins over i18next', async () => {
    cookieStore.ui_locale = 'pt';
    cookieStore.i18next = 'en';
    assert.equal(await getServerViewerLang(), 'pt');
  });

  test('i18next cookie wins when ui_locale is absent', async () => {
    cookieStore.i18next = 'pt-BR';
    assert.equal(await getServerViewerLang(), 'pt');
  });

  test('NEXT_LOCALE cookie is used when i18next is absent', async () => {
    cookieStore.NEXT_LOCALE = 'pt';
    assert.equal(await getServerViewerLang(), 'pt');
  });

  test('Accept-Language pt* when no cookie', async () => {
    acceptLanguage = 'pt-PT,pt;q=0.9,en;q=0.8';
    assert.equal(await getServerViewerLang(), 'pt');
  });

  test('defaults to en', async () => {
    acceptLanguage = 'en-US,en;q=0.9';
    assert.equal(await getServerViewerLang(), 'en');
  });
});
