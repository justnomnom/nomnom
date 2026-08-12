/**
 * Hub rename: `pages.dashboard.lists` must exist in both locales with matching keys
 * (was `pages.dashboard.saved`). Also guards ListsHubView wiring strings.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

function loadLocale(name) {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'src/locales/langs', name), 'utf8'));
}

function leafKeys(obj, prefix = '') {
  /** @type {string[]} */
  const out = [];
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...leafKeys(v, next));
    else out.push(next);
  }
  return out.sort();
}

test('pages.dashboard.lists exists in en + pt with the same leaf keys', () => {
  const en = loadLocale('en.json');
  const pt = loadLocale('pt.json');
  assert.ok(en.pages?.dashboard?.lists, 'en pages.dashboard.lists missing');
  assert.ok(pt.pages?.dashboard?.lists, 'pt pages.dashboard.lists missing');
  assert.equal('saved' in (en.pages.dashboard || {}), false);
  assert.equal('saved' in (pt.pages.dashboard || {}), false);

  const enKeys = leafKeys(en.pages.dashboard.lists);
  const ptKeys = leafKeys(pt.pages.dashboard.lists);
  assert.deepEqual(ptKeys, enKeys);
  assert.ok(enKeys.includes('page_heading'));
  assert.ok(typeof en.pages.dashboard.lists.page_heading === 'string');
  assert.ok(en.pages.dashboard.lists.page_heading.length > 0);
});

test('lists hub view + route skeleton modules are present under sections/lists', () => {
  const hub = path.join(REPO_ROOT, 'src/sections/lists/view/lists-hub-view.js');
  const skel = path.join(REPO_ROOT, 'src/sections/lists/view/lists-hub-route-skeleton.js');
  const page = path.join(REPO_ROOT, 'src/app/(frontend)/dashboard/lists/page.js');
  const loading = path.join(REPO_ROOT, 'src/app/(frontend)/dashboard/lists/loading.js');
  for (const p of [hub, skel, page, loading]) {
    assert.ok(fs.existsSync(p), `missing ${path.relative(REPO_ROOT, p)}`);
  }
  const pageSrc = fs.readFileSync(page, 'utf8');
  assert.match(pageSrc, /ListsHubView/);
  assert.match(pageSrc, /pages\.dashboard\.lists\.page_heading/);
  assert.doesNotMatch(pageSrc, /SavedView|pages\.dashboard\.saved/);
});
