/**
 * Removes JSON translation leaves not referenced in src/.
 * Keeps a leaf if any collected "used" string equals the leaf or is a prefix (for dynamic keys).
 */
const fs = require('fs');
const path = require('path');

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', '.next', '.git', '.cursor'].includes(ent.name)) continue;
      walk(p, acc);
    } else if (/\.(jsx?|tsx?)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

function collectUsed(files) {
  const used = new Set();

  const add = (k) => {
    if (k && typeof k === 'string') used.add(k.trim());
  };

  const runRe = (text, re, fn) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) add(fn(m));
  };

  for (const f of files) {
    let text;
    try {
      text = fs.readFileSync(f, 'utf8');
    } catch {
      continue;
    }

    runRe(text, /\bt\(\s*['"]([^'"]+)['"]/g, (m) => m[1]);
    runRe(text, /getDefaultTranslation\(\s*['"]([^'"]+)['"]/g, (m) => m[1]);
    runRe(text, /titleKey=["']([^'"]+)["']/g, (m) => m[1]);
    runRe(text, /i18nKey=["']([^'"]+)["']/g, (m) => m[1]);

    // t(`prefix.${expr}`) → keep everything under prefix
    const rePref = /\bt\(\s*`([^$`]*)\$\{/g;
    rePref.lastIndex = 0;
    let m;
    while ((m = rePref.exec(text))) {
      const pref = m[1].replace(/\.\s*$/, '').trim();
      add(pref);
    }
  }

  return used;
}

function leafNeeded(leafPath, usedSet) {
  for (const u of usedSet) {
    if (leafPath === u || leafPath.startsWith(`${u}.`)) return true;
  }
  return false;
}

function pruneTree(node, pathPrefix) {
  if (typeof node === 'string') {
    return leafNeeded(pathPrefix, USED) ? node : undefined;
  }
  if (node === null || typeof node !== 'object') return undefined;

  const out = {};
  for (const [k, v] of Object.entries(node)) {
    const p = pathPrefix ? `${pathPrefix}.${k}` : k;
    if (typeof v === 'string') {
      const pruned = pruneTree(v, p);
      if (pruned !== undefined) out[k] = pruned;
    } else {
      const pruned = pruneTree(v, p);
      if (pruned && Object.keys(pruned).length > 0) out[k] = pruned;
    }
  }
  return out;
}

const ROOT = path.join(__dirname, '..');
const files = walk(path.join(ROOT, 'src'));
const USED = collectUsed(files);

for (const name of ['en', 'pt']) {
  const fp = path.join(ROOT, 'src', 'locales', 'langs', `${name}.json`);
  const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const pruned = pruneTree(raw, '');
  fs.writeFileSync(fp, `${JSON.stringify(pruned, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${name}.json (${Object.keys(pruned).length} top-level keys)`);
}
