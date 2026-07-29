#!/usr/bin/env node
/**
 * Sync Vercel production env vars with a local `.env.production` file.
 *
 * Usage:
 *   node scripts/vercel-env-sync.mjs pull   # download production → .env.production
 *   node scripts/vercel-env-sync.mjs push   # upload .env.production → production
 *
 * The file is gitignored. Edit it locally, then push when ready.
 * A redeploy is required for changes to take effect on the live site.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env.production');
const LOCAL_ENV_FILE = path.join(ROOT, '.env.local');
const ENVIRONMENT = 'production';

/** System / runtime keys injected by Vercel — never treat as source of truth. */
const SKIP_KEY =
  /^(VERCEL($|_)|NX_DAEMON|TURBO_|VERCEL_OIDC_TOKEN)/;

/**
 * Run a Vercel CLI command in the repo root.
 * @param {string[]} args
 * @param {{ input?: string, inheritStdio?: boolean }} [opts]
 */
function runVercel(args, opts = {}) {
  const result = spawnSync('npx', ['vercel', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    input: opts.input,
    stdio: opts.inheritStdio ? 'inherit' : ['pipe', 'pipe', 'pipe'],
    shell: true,
  });

  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || '').trim();
    throw new Error(`vercel ${args.join(' ')} failed:\n${err}`);
  }

  return result.stdout || '';
}

/**
 * Parse a dotenv file into a Map (last key wins). Skips comments/blank lines.
 * @param {string} filePath
 */
function parseEnvFile(filePath) {
  const text = readFileSync(filePath, 'utf8');
  /** @type {Map<string, string>} */
  const map = new Map();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1);

    // Strip matching surrounding quotes from `vercel env pull` output.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
      value = value.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }

    if (SKIP_KEY.test(key)) continue;
    map.set(key, value);
  }

  return map;
}

/**
 * Encode a dotenv value for round-trip parsing.
 * @param {string} value
 */
function encodeValue(value) {
  const needsQuote = /[\s#"'$\\]/.test(value) || value === '';
  if (!needsQuote) return value;
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}

/**
 * Write env map to `.env.production`.
 * Prefer `.env.local` comment/key order when that file exists.
 * @param {Map<string, string>} map
 */
function writeEnvFile(map) {
  if (existsSync(LOCAL_ENV_FILE)) {
    writeEnvFileMirroredFromLocal(map);
    return;
  }

  const keys = [...map.keys()].sort((a, b) => a.localeCompare(b));
  const lines = [
    '# Vercel production environment — local source of truth.',
    '# Pull: npm run env:production:pull',
    '# Push: npm run env:production:push',
    '# Do not commit this file (gitignored). Redeploy after pushing.',
    '',
  ];

  for (const key of keys) {
    lines.push(`${key}=${encodeValue(map.get(key) ?? '')}`);
  }

  lines.push('');
  writeFileSync(ENV_FILE, lines.join('\n'), 'utf8');
}

/**
 * Mirror `.env.local` structure; fill with production values.
 * @param {Map<string, string>} map
 */
function writeEnvFileMirroredFromLocal(map) {
  const localText = readFileSync(LOCAL_ENV_FILE, 'utf8');
  /** @type {string[]} */
  const lines = [
    '# Vercel production environment — source of truth for `npm run env:production:push`.',
    '# Key order / comments mirror `.env.local`. Do not commit this file.',
    '# Pull: npm run env:production:pull   |   Push: npm run env:production:push',
    '',
  ];
  /** @type {Set<string>} */
  const seen = new Set();

  for (const raw of localText.split(/\r?\n/)) {
    const stripped = raw.trim();
    if (
      stripped === '# Setup' ||
      stripped.startsWith('# Copy values into') ||
      stripped.startsWith('# Next.js merges') ||
      stripped.startsWith('# Playwright loads') ||
      stripped.startsWith('# the same vars as')
    ) {
      continue;
    }

    if (stripped && !stripped.startsWith('#') && stripped.includes('=')) {
      const eq = stripped.indexOf('=');
      const key = stripped.slice(0, eq).trim();
      if (SKIP_KEY.test(key)) continue;
      seen.add(key);
      const indent = raw.slice(0, raw.length - raw.trimStart().length);
      lines.push(`${indent}${key}=${encodeValue(map.get(key) ?? '')}`);
      continue;
    }

    lines.push(raw);
  }

  const missing = [...map.keys()].filter((k) => !seen.has(k)).sort();
  if (missing.length) {
    if (lines.length && lines[lines.length - 1].trim() !== '') lines.push('');
    lines.push('# =============================================================================');
    lines.push('# Extra production keys not present in .env.local structure');
    lines.push('# =============================================================================');
    for (const key of missing) {
      lines.push(`${key}=${encodeValue(map.get(key) ?? '')}`);
    }
    lines.push('');
  }

  writeFileSync(ENV_FILE, `${lines.join('\n').replace(/\n+$/, '\n')}`, 'utf8');
}

/** Download production env vars into `.env.production`. */
function pull() {
  console.log(`Pulling ${ENVIRONMENT} env → ${path.basename(ENV_FILE)}…`);
  runVercel(['env', 'pull', ENV_FILE, '--environment', ENVIRONMENT, '--yes'], {
    inheritStdio: true,
  });

  const map = parseEnvFile(ENV_FILE);
  writeEnvFile(map);
  console.log(`✓ Wrote ${map.size} keys to ${path.basename(ENV_FILE)} (system keys stripped).`);
}

/**
 * List remote production env var names.
 * @returns {Set<string>}
 */
function listRemoteProductionKeys() {
  const raw = runVercel(['env', 'list', ENVIRONMENT, '--format', 'json']);
  const parsed = JSON.parse(raw);
  const rows = Array.isArray(parsed) ? parsed : parsed?.envs || parsed?.environmentVariables || [];

  /** @type {Set<string>} */
  const keys = new Set();
  for (const row of rows) {
    const name = row?.key || row?.name;
    if (!name || SKIP_KEY.test(name)) continue;
    const targets = row?.target || row?.targets || row?.environments || [];
    const targetList = Array.isArray(targets)
      ? targets.map((t) => String(t).toLowerCase())
      : [];
    // Include if production-targeted, or if format has no target info.
    if (
      targetList.length === 0 ||
      targetList.includes('production') ||
      targetList.includes('prod')
    ) {
      keys.add(name);
    }
  }
  return keys;
}

/**
 * Upsert one key into production via stdin (handles special characters).
 * @param {string} key
 * @param {string} value
 * @param {boolean} exists
 */
function upsertKey(key, value, exists) {
  if (exists) {
    runVercel(['env', 'update', key, ENVIRONMENT, '--yes'], { input: value });
    return 'updated';
  }

  runVercel(['env', 'add', key, ENVIRONMENT, '--yes'], { input: value });
  return 'added';
}

/** Upload `.env.production` keys to Vercel production. */
function push() {
  if (!existsSync(ENV_FILE)) {
    throw new Error(
      `${path.basename(ENV_FILE)} not found. Run: npm run env:production:pull`
    );
  }

  const local = parseEnvFile(ENV_FILE);
  if (local.size === 0) {
    throw new Error(`${path.basename(ENV_FILE)} has no keys to push.`);
  }

  console.log(`Listing remote ${ENVIRONMENT} keys…`);
  const remote = listRemoteProductionKeys();

  let added = 0;
  let updated = 0;
  let failed = 0;

  for (const [key, value] of local) {
    process.stdout.write(`  ${key}… `);
    try {
      const action = upsertKey(key, value, remote.has(key));
      if (action === 'added') added += 1;
      else updated += 1;
      console.log(action);
    } catch (err) {
      failed += 1;
      console.log('FAILED');
      console.error(`    ${(err instanceof Error ? err.message : String(err)).split('\n')[0]}`);
    }
  }

  console.log(
    `\n✓ Push done — added ${added}, updated ${updated}, failed ${failed}.`
  );
  console.log('Redeploy production for changes to take effect:');
  console.log('  npx vercel --prod');
}

function main() {
  const cmd = process.argv[2];

  if (cmd === 'pull') {
    pull();
    return;
  }
  if (cmd === 'push') {
    push();
    return;
  }

  console.error(`Usage:
  node scripts/vercel-env-sync.mjs pull
  node scripts/vercel-env-sync.mjs push`);
  process.exit(1);
}

main();
