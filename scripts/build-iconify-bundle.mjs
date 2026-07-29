/**
 * Regenerates src/components/iconify/iconify-bundle-data.json with only the
 * eva and solar icons actually referenced in the codebase.
 *
 * Run: node scripts/build-iconify-bundle.mjs
 * Re-run whenever you add a new eva: or solar: icon import.
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const evaAll = require('@iconify-json/eva/icons.json');
const solarAll = require('@iconify-json/solar/icons.json');

const srcGlob = execSync('git ls-files src/', { cwd: root }).toString().trim().split('\n');

const evaUsed = new Set();
const solarUsed = new Set();

for (const rel of srcGlob) {
  const ext = path.extname(rel);
  if (!['.js', '.ts', '.tsx', '.jsx'].includes(ext)) continue;
  const content = readFileSync(path.join(root, rel), 'utf8');
  for (const [, name] of content.matchAll(/['"`]eva:([a-z0-9_-]+)['"`]/g)) evaUsed.add(name);
  for (const [, name] of content.matchAll(/['"`]solar:([a-z0-9_-]+)['"`]/g)) solarUsed.add(name);
}

function filterCollection(full, used) {
  const icons = {};
  for (const name of used) {
    if (full.icons[name]) icons[name] = full.icons[name];
    else console.warn(`[iconify-bundle] missing: ${full.prefix}:${name}`);
  }
  return { prefix: full.prefix, icons, ...(full.width ? { width: full.width } : {}), ...(full.height ? { height: full.height } : {}) };
}

const out = {
  eva: filterCollection(evaAll, evaUsed),
  solar: filterCollection(solarAll, solarUsed),
};

const dest = path.join(root, 'src/components/iconify/iconify-bundle-data.json');
writeFileSync(dest, JSON.stringify(out));
console.log(`eva: ${Object.keys(out.eva.icons).length} icons`);
console.log(`solar: ${Object.keys(out.solar.icons).length} icons`);
console.log(`written ${dest} (${Buffer.byteLength(JSON.stringify(out))} bytes)`);
