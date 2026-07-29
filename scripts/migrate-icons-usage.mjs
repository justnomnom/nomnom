/**
 * One-off: replace icon="…" / icon='…' with ic.* from src/assets/icons/iconify.js
 * Run: node scripts/migrate-icons-usage.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const iconifyPath = path.join(root, 'src/assets/icons/iconify.js');
const iconifyText = fs.readFileSync(iconifyPath, 'utf8');
const valueToKey = {};
for (const m of iconifyText.matchAll(/^\s{2}(\w+):\s*'([^']+)'\s*,?\s*$/gm)) {
  valueToKey[m[2]] = m[1];
}

const skipFiles = new Set([
  path.join(root, 'src/assets/icons/iconify.js'),
  path.join(root, 'scripts/migrate-icons-usage.mjs'),
]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules') walk(p, out);
    else if (e.isFile() && e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

function replaceIconStrings(src) {
  let s = src;
  const keys = Object.keys(valueToKey).sort((a, b) => b.length - a.length);
  for (const val of keys) {
    const k = valueToKey[val];
    const reD = new RegExp(`icon=\\{"${escapeRe(val)}"\\}`, 'g');
    const reS = new RegExp(`icon=\\{'${escapeRe(val)}'\\}`, 'g');
    s = s.replace(reD, `icon={ic.${k}}`);
    s = s.replace(reS, `icon={ic.${k}}`);
    s = s.replaceAll(`icon="${val}"`, `icon={ic.${k}}`);
    s = s.replaceAll(`icon='${val}'`, `icon={ic.${k}}`);
  }
  return s;
}

function escapeRe(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function needsIcImport(text) {
  return /\bic\.\w+/.test(text);
}

function hasIcImport(text) {
  return /\bfrom\s+['"]src\/assets\/icons['"]/.test(text) || /\bfrom\s+['"]\.\.\/assets\/icons['"]/.test(text);
}

function addIcImport(text) {
  const lines = text.split('\n');
  let insertAt = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) insertAt = i + 1;
    else if (lines[i].trim() === '' && insertAt > 0) break;
  }
  const importLine = `import { ic } from 'src/assets/icons';`;
  if (lines.some((l) => l.includes("from 'src/assets/icons'"))) return text;
  lines.splice(insertAt, 0, importLine);
  return lines.join('\n');
}

const files = walk(path.join(root, 'src'));
let touched = 0;

for (const file of files) {
  if (skipFiles.has(file)) continue;
  const raw = fs.readFileSync(file, 'utf8');
  let next = replaceIconStrings(raw);
  if (next === raw) continue;
  if (needsIcImport(next) && !hasIcImport(next)) {
    next = addIcImport(next);
  }
  fs.writeFileSync(file, next);
  touched += 1;
  console.log('updated', path.relative(root, file));
}

console.log('done, files touched:', touched);
