/**
 * Removes translation leaf keys from en.json / pt.json that never appear referenced in src/.
 * Does not follow runtime-composed keys unless listed in EXPAND_* below.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

function walkDir(dir, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.next') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(p, acc);
    else if (/\.(js|jsx|ts|tsx|mjs)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function collectCorpus() {
  const files = walkDir(SRC);
  return files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
}

function extractUsedKeys(corpus) {
  const used = new Set();

  const add = (k) => {
    if (k && typeof k === 'string') used.add(k.trim());
  };

  const reT = /\bt\(\s*'([^']+)'\s*[,)}]/g;
  const reT2 = /\bt\(\s*"([^"]+)"\s*[,)}]/g;
  const reGd = /getDefaultTranslation\(\s*'([^']+)'\s*\)/g;
  const reGd2 = /getDefaultTranslation\(\s*"([^"]+)"\s*\)/g;
  const reTitle = /titleKey=\{?['"]([^'"]+)['"]\}?/g;
  const reLabelKey = /labelKey:\s*['"]([^'"]+)['"]/g;
  const reTitleKeyProp = /titleKey:\s*['"]([^'"]+)['"]/g;
  const reDescKey = /descriptionKey:\s*['"]([^'"]+)['"]/g;
  const reQuotedI18n =
    /'((?:pages|common|footer|navigation|header|components|calendar|validation)\.[a-zA-Z0-9_.]+)'/g;

  for (const re of [reT, reT2, reGd, reGd2, reTitle, reLabelKey, reTitleKeyProp, reDescKey]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(corpus))) add(m[1]);
  }

  // Quoted i18n-like paths in objects (e.g. CARDS titleKey, account-popover labels)
  reQuotedI18n.lastIndex = 0;
  let m;
  while ((m = reQuotedI18n.exec(corpus))) add(m[1]);

  // Broader: label: 'components.account_popover.home'
  const reLabel = /label:\s*['"]([a-z][a-z0-9_]*(?:\.[a-zA-Z0-9_]+)+)['"]/g;
  while ((m = reLabel.exec(corpus))) add(m[1]);

  return used;
}

function expandDynamicKeys() {
  const keys = new Set();

  const feedbackTypes = ['plan', 'summary', 'reflection', 'chat'];
  const thumbs = ['thumbs_up', 'thumbs_down'];
  for (const ft of feedbackTypes) {
    for (const th of thumbs) {
      for (let i = 1; i <= 5; i += 1) {
        keys.add(`pages.dashboard.settings.feedback.options.${ft}.${th}.option${i}`);
      }
    }
  }
  keys.add('pages.dashboard.settings.feedback.options.more');

  const faqItems = [
    { id: 'general-1', category: 'general' },
    { id: 'general-2', category: 'general' },
    { id: 'payment-1', category: 'payment' },
    { id: 'payment-2', category: 'payment' },
    { id: 'getting_started-1', category: 'getting_started' },
    { id: 'getting_started-2', category: 'getting_started' },
  ];
  for (const it of faqItems) {
    keys.add(`pages.faqs.${it.category}.${it.id}.question`);
    keys.add(`pages.faqs.${it.category}.${it.id}.answer`);
  }

  for (const x of ['company', 'contact', 'email', 'contact_us', 'faqs']) {
    keys.add(`footer.links.${x}`);
  }

  for (const s of ['not_started', 'in_progress', 'completed', 'blocked']) {
    keys.add(`pages.goals.task.status.${s}`);
  }

  for (const x of ['latest', 'popular', 'oldest']) {
    keys.add(`components.empty_content.blog.sort_options.${x}`);
  }

  return keys;
}

function flattenLeaves(obj, prefix = '') {
  /** @type [string, unknown][] */
  const out = [];
  if (obj === null || typeof obj !== 'object') {
    return [[prefix, obj]];
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      out.push(...flattenLeaves(item, `${prefix}.${i}`));
    });
    return out;
  }
  for (const k of Object.keys(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    const v = obj[k];
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...flattenLeaves(v, p));
    } else {
      out.push([p, v]);
    }
  }
  return out;
}

function pruneNode(node, pathPrefix, usedSet) {
  if (node === null || typeof node !== 'object') {
    return node;
  }
  if (Array.isArray(node)) {
    return node.map((item, i) => pruneNode(item, `${pathPrefix}.${i}`, usedSet));
  }
  const out = {};
  for (const k of Object.keys(node)) {
    const p = pathPrefix ? `${pathPrefix}.${k}` : k;
    const v = node[k];
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      const pruned = pruneNode(v, p, usedSet);
      if (Object.keys(pruned).length > 0) {
        out[k] = pruned;
      }
    } else if (usedSet.has(p)) {
      out[k] = v;
    }
  }
  return out;
}

const corpus = collectCorpus();
const used = extractUsedKeys(corpus);
for (const k of expandDynamicKeys()) used.add(k);

const enPath = path.join(ROOT, 'src/locales/langs/en.json');
const ptPath = path.join(ROOT, 'src/locales/langs/pt.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const pt = JSON.parse(fs.readFileSync(ptPath, 'utf8'));

const allLeaves = flattenLeaves(en);
const unused = allLeaves.map(([k]) => k).filter((k) => !used.has(k));

console.log(`Referenced keys: ${used.size}`);
console.log(`Removed leaf keys: ${unused.length}`);
if (unused.length <= 80) unused.forEach((u) => console.log('  -', u));

const enPruned = pruneNode(en, '', used);
const ptPruned = pruneNode(pt, '', used);

fs.writeFileSync(enPath, `${JSON.stringify(enPruned, null, 2)}\n`);
fs.writeFileSync(ptPath, `${JSON.stringify(ptPruned, null, 2)}\n`);
console.log('Wrote en.json and pt.json');
