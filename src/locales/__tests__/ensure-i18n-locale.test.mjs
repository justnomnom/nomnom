/**
 * Locale JSON is bundled; ensureI18nLocale still maps pt* → pt.
 * Does not import `i18n.js` (Next JSON imports need webpack; Node needs `with { type: 'json' }`).
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import pt from '../langs/pt.json' with { type: 'json' };
import en from '../langs/en.json' with { type: 'json' };

const SRC = fs.readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../i18n.js'),
  'utf8'
);

test('ensureI18nLocale maps any pt* code to pt and everything else to en', () => {
  assert.match(
    SRC,
    /String\(lng \|\| ''\)\s*\.toLowerCase\(\)\s*\.startsWith\('pt'\)\s*\?\s*'pt'\s*:\s*'en'/
  );
});

test('Portuguese JSON is importable and shares English top-level namespaces', () => {
  assert.equal(pt.app, 'aplicação');
  assert.equal(typeof pt.header?.open_main_nav, 'string');
  const enKeys = Object.keys(en).sort();
  const ptKeys = Object.keys(pt).sort();
  assert.deepEqual(ptKeys, enKeys);
});

test('D6 map token-missing copy exists in both locales', () => {
  assert.match(en.pages?.dashboard?.map?.map_placeholder ?? '', /unavailable/i);
  assert.match(pt.pages?.dashboard?.map?.map_placeholder ?? '', /indisponível/i);
});

test('contentHub chrome keys exist in English and Portuguese', () => {
  const enHub = en.pages?.contentHub ?? {};
  const ptHub = pt.pages?.contentHub ?? {};
  const keys = Object.keys(enHub).sort();
  assert.ok(keys.includes('explore_title'));
  assert.ok(keys.includes('continue_reading'));
  assert.deepEqual(Object.keys(ptHub).sort(), keys);
  assert.match(enHub.continue_reading, /Continue reading/);
  assert.match(ptHub.continue_reading, /Continuar a ler/);
});
