/**
 * Regression: list server-action split must keep the full public export surface
 * and re-export barrel. Parses sources only (no Next/Supabase runtime).
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const ACTIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../actions');
const AUTH_REEXPORT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../auth/actions/list-actions.js'
);

/** @param {string} filePath */
function exportedAsyncFns(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const names = [
    ...[...src.matchAll(/^export async function (\w+)/gm)].map((m) => m[1]),
    // `React.cache()` wrappers: `export const foo = cache(async function foo...)`
    ...[...src.matchAll(/^export const (\w+) = cache\(async function \1\b/gm)].map((m) => m[1]),
  ];
  return [...new Set(names)].sort();
}

/** @param {string} filePath */
function namedExportsInBarrel(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const names = new Set();
  for (const block of src.matchAll(/export\s*\{([^}]+)\}/gs)) {
    for (const part of block[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name && /^[A-Za-z_]/.test(name)) names.add(name);
    }
  }
  return [...names].sort();
}

const ACTION_FILES = [
  'mentions-actions.js',
  'crud-hub-actions.js',
  'map-actions.js',
  'items-actions.js',
  'list-page-actions.js',
  'decide-actions.js',
  'night-actions.js',
  'members-profile-actions.js',
];

test('list actions modules expose the expected export surface', () => {
  const fromModules = new Set();
  for (const file of ACTION_FILES) {
    const abs = path.join(ACTIONS_DIR, file);
    assert.ok(fs.existsSync(abs), `missing ${file}`);
    for (const name of exportedAsyncFns(abs)) fromModules.add(name);
  }

  const fromIndex = namedExportsInBarrel(path.join(ACTIONS_DIR, 'index.js'));
  const fromAuth = namedExportsInBarrel(AUTH_REEXPORT);

  assert.equal(fromModules.size, 52, `expected 52 action exports, got ${fromModules.size}`);
  assert.ok(!fromModules.has('ensureListSlug'), 'ensureListSlug must not be a public server action');
  assert.deepEqual(fromIndex, [...fromModules].sort());
  assert.deepEqual(fromAuth, fromIndex);
});

test('list actions index re-exports only from sibling action modules', () => {
  const src = fs.readFileSync(path.join(ACTIONS_DIR, 'index.js'), 'utf8');
  const froms = [...src.matchAll(/from ['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assert.ok(froms.length > 0);
  for (const spec of froms) {
    assert.match(spec, /^src\/libs\/lists\/actions\/[a-z-]+-actions$/);
  }
});
