/**
 * Locks feature coverage so new server actions / App Router handlers / TEST-PLAN rows
 * cannot ship without a unit or e2e mention.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/**
 * Recursively collect files matching `pred`.
 *
 * @param {string} dir
 * @param {(name: string) => boolean} pred
 * @returns {string[]}
 */
function walk(dir, pred) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'graphify-out'].includes(entry.name)) continue;
      out.push(...walk(abs, pred));
    } else if (pred(entry.name)) out.push(abs);
  }
  return out;
}

/**
 * @param {string} filePath
 * @returns {string[]}
 */
function exportedFns(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  return [
    ...[...src.matchAll(/^export async function (\w+)/gm)].map((m) => m[1]),
    ...[...src.matchAll(/^export function (\w+)/gm)].map((m) => m[1]),
    ...[...src.matchAll(/^export const (\w+) = cache\(async function \1\b/gm)].map((m) => m[1]),
  ];
}

const unitBlob = walk(path.join(ROOT, 'src'), (n) => n.endsWith('.test.mjs'))
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('\n');

const e2eBlob = walk(path.join(ROOT, 'tests', 'e2e'), (n) => n.endsWith('.spec.ts') || n.endsWith('.ts'))
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('\n');

const coverageBlob = `${unitBlob}\n${e2eBlob}`;

test('every auth/actions export (except the list barrel) is mentioned in a unit test', () => {
  const actionDir = path.join(ROOT, 'src', 'auth', 'actions');
  const missing = [];
  for (const file of fs.readdirSync(actionDir).filter((n) => n.endsWith('.js'))) {
    if (file === 'list-actions.js') continue;
    for (const name of exportedFns(path.join(actionDir, file))) {
      if (!new RegExp(`\\b${name}\\b`).test(unitBlob)) missing.push(`${file}:${name}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('every list server-action export is mentioned in a unit test', () => {
  const listDir = path.join(ROOT, 'src', 'libs', 'lists', 'actions');
  const missing = [];
  for (const file of fs.readdirSync(listDir).filter((n) => n.endsWith('actions.js'))) {
    for (const name of exportedFns(path.join(listDir, file))) {
      if (!new RegExp(`\\b${name}\\b`).test(unitBlob)) missing.push(`${file}:${name}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('every other `use server` module export is mentioned in a unit test', () => {
  const missing = [];
  const alreadyCovered = new Set([
    path.join(ROOT, 'src', 'auth', 'actions').replaceAll('\\', '/'),
    path.join(ROOT, 'src', 'libs', 'lists', 'actions').replaceAll('\\', '/'),
  ]);
  for (const file of walk(path.join(ROOT, 'src'), (n) => n.endsWith('.js'))) {
    const abs = file.replaceAll('\\', '/');
    if ([...alreadyCovered].some((dir) => abs.startsWith(dir))) continue;
    const src = fs.readFileSync(file, 'utf8');
    if (!/^['"]use server['"]/m.test(src)) continue;
    for (const name of exportedFns(file)) {
      if (!new RegExp(`\\b${name}\\b`).test(unitBlob)) {
        missing.push(`${path.relative(ROOT, file).replaceAll('\\', '/')}:${name}`);
      }
    }
  }
  assert.deepEqual(missing, []);
});

/** Hard-external TEST-PLAN rows (email loop, live OAuth, session expiry, resilience, reduced-motion). */
const MANUAL_TEST_PLAN_IDS = new Set(['A7', 'A10', 'E2', 'E3', 'P3', 'RO3', 'M3']);

test('every automatable TEST-PLAN case id is mentioned in unit or e2e tests', () => {
  const plan = fs.readFileSync(path.join(ROOT, 'docs', 'TEST-PLAN.md'), 'utf8');
  const ids = [...plan.matchAll(/^\| ([A-Z]+[0-9]+) \|/gm)].map((m) => m[1]);
  assert.ok(ids.length > 40, `parsed ${ids.length} TEST-PLAN ids`);
  const missing = ids.filter((id) => !MANUAL_TEST_PLAN_IDS.has(id) && !coverageBlob.includes(id));
  assert.deepEqual(missing, [], `unmentioned TEST-PLAN ids: ${missing.join(', ')}`);
});
