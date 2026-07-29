import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  UI_LOCALE_COOKIE,
  htmlLangFromUiLocaleCookie,
  readUiLocaleCookie,
  setUiLocaleCookie,
} from '../ui-locale.js';

test('htmlLangFromUiLocaleCookie: pt exact else en', () => {
  assert.equal(htmlLangFromUiLocaleCookie('pt'), 'pt');
  assert.equal(htmlLangFromUiLocaleCookie('en'), 'en');
  assert.equal(htmlLangFromUiLocaleCookie('pt-PT'), 'en');
  assert.equal(UI_LOCALE_COOKIE, 'ui_locale');
});

test('read/set UiLocaleCookie: no document → safe', () => {
  assert.equal(readUiLocaleCookie(), null);
  setUiLocaleCookie('pt');
});
