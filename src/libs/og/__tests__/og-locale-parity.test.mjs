/**
 * Guards the share cards against silent locale drift.
 *
 * `ogText` returns `''` for a key it cannot resolve, so a typo or a key added to `en.json`
 * but not `pt.json` ships a card with a blank line and nothing fails. Rather than listing the
 * keys by hand (which drifts the moment someone adds a card), this scans the card sources for
 * `ogText(...)` / `ogPlural(...)` and checks whatever it finds against both locale files.
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test, describe } from 'node:test';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const SCAN_DIRS = [path.join(REPO_ROOT, 'src', 'libs', 'og'), path.join(REPO_ROOT, 'src', 'app')];
const SCAN_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx']);

const en = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'src/locales/langs/en.json'), 'utf8')
);
const pt = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'src/locales/langs/pt.json'), 'utf8')
);

/** @returns {string[]} every source file under `dir`, recursively. */
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      out.push(...walk(full));
    } else if (SCAN_EXTS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

/** Mirrors `getDefaultTranslation`: walk the dotted path, return the leaf only if it is a string. */
function lookup(bundle, key) {
  const value = key.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), bundle);
  return typeof value === 'string' ? value : undefined;
}

const TEXT_CALL = /\bogText\(\s*'([^']+)'/g;
const PLURAL_CALL = /\bogPlural\(\s*'([^']+)'/g;

function collectKeys() {
  /** @type {Set<string>} */
  const keys = new Set();
  for (const dir of SCAN_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir)) {
      const src = fs.readFileSync(file, 'utf8');
      if (!src.includes('ogText(') && !src.includes('ogPlural(')) continue;
      for (const [, key] of src.matchAll(TEXT_CALL)) keys.add(key);
      for (const [, base] of src.matchAll(PLURAL_CALL)) {
        keys.add(`${base}_one`);
        keys.add(`${base}_other`);
      }
    }
  }
  return [...keys].sort();
}

describe('share-card locale keys', () => {
  const keys = collectKeys();

  test('the scan actually found the card copy', () => {
    // A regex that silently stops matching would make every assertion below vacuous.
    assert.ok(keys.length >= 8, `expected the card sources to yield keys, got ${keys.length}`);
    assert.ok(keys.includes('pages.lists.og_profile_tagline'), 'known key missing from scan');
  });

  test('every key resolves to a non-empty string in en', () => {
    const missing = keys.filter((k) => !lookup(en, k)?.trim());
    assert.deepEqual(missing, [], `missing from en.json: ${missing.join(', ')}`);
  });

  test('every key resolves to a non-empty string in pt', () => {
    const missing = keys.filter((k) => !lookup(pt, k)?.trim());
    assert.deepEqual(missing, [], `missing from pt.json: ${missing.join(', ')}`);
  });

  test('placeholders match between locales, so no card loses an interpolated value', () => {
    const mismatched = keys.filter((k) => {
      const a = [...(lookup(en, k) ?? '').matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
      const b = [...(lookup(pt, k) ?? '').matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
      return a.join(',') !== b.join(',');
    });
    assert.deepEqual(mismatched, [], `placeholder mismatch: ${mismatched.join(', ')}`);
  });
});
