/**
 * Per-release Play Store build: optional version bump → preflight → signed .aab
 *
 * Reads CAPACITOR_SERVER_URL from env or .env.local (falls back to NEXT_PUBLIC_SITE_URL).
 *
 * Usage:
 *   npm run cap:android:release
 *   npm run cap:android:release -- --bump patch
 *   npm run cap:android:release -- --version 5.8.0
 *   npm run cap:android:release -- --no-bump
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  PATHS,
  loadDotenvLocal,
  resolveCapacitorServerUrl,
  readPackageVersion,
  bumpSemver,
  writePackageVersion,
  androidVersionCode,
} from './lib/android-play-env.mjs';

const TAG = '[cap:android:release]';

function log(msg) {
  console.log(`${TAG} ${msg}`);
}

function fail(msg) {
  console.error(`${TAG} ${msg}`);
  process.exit(1);
}

function parseArgs(argv) {
  const opts = { bump: null, version: null, skipBump: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--no-bump') {
      opts.skipBump = true;
    } else if (a === '--bump' && argv[i + 1]) {
      opts.bump = argv[++i];
    } else if (a === '--version' && argv[i + 1]) {
      opts.version = argv[++i];
    } else if (a === '--help' || a === '-h') {
      console.log(`Usage:
  npm run cap:android:release              # bump patch, then build
  npm run cap:android:release -- --no-bump   # keep package.json version
  npm run cap:android:release -- --bump minor
  npm run cap:android:release -- --version 5.8.0

Env: CAPACITOR_SERVER_URL or NEXT_PUBLIC_SITE_URL in .env.local
`);
      process.exit(0);
    }
  }
  return opts;
}

function runNpm(script) {
  const r = spawnSync('npm', ['run', script], {
    cwd: PATHS.root,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (r.status !== 0) {
    process.exit(r.status === null ? 1 : r.status);
  }
}

loadDotenvLocal();

const opts = parseArgs(process.argv.slice(2));

if (!existsSync(PATHS.keystoreProps)) {
  fail('Run one-time setup first: npm run cap:android:setup');
}

const serverUrl = resolveCapacitorServerUrl();
if (!serverUrl) {
  fail(
    'Set CAPACITOR_SERVER_URL or NEXT_PUBLIC_SITE_URL in .env.local (HTTPS production origin).',
  );
}

if (!/^https:\/\//i.test(serverUrl)) {
  console.warn(`${TAG} Warning: server URL is not HTTPS: ${serverUrl}`);
}

process.env.CAPACITOR_SERVER_URL = serverUrl;

const prevVersion = readPackageVersion();
let nextVersion = prevVersion;

if (opts.version) {
  nextVersion = opts.version;
} else if (!opts.skipBump) {
  const part = opts.bump || 'patch';
  nextVersion = bumpSemver(prevVersion, part);
}

if (nextVersion !== prevVersion) {
  writePackageVersion(nextVersion);
  log(`Version: ${prevVersion} → ${nextVersion} (versionCode ${androidVersionCode(nextVersion)})`);
} else {
  log(`Version: ${nextVersion} (versionCode ${androidVersionCode(nextVersion)})`);
}

log(`WebView origin: ${serverUrl}`);

runNpm('cap:android:preflight');
runNpm('cap:android:bundle');

if (existsSync(PATHS.aab)) {
  log('');
  log('Release artifact ready:');
  log(`  ${PATHS.aab}`);
  log('');
  log('Upload in Play Console → Release → Create new release → Upload App Bundle.');
  log('https://play.google.com/console');
} else {
  fail('Build finished but .aab not found at expected path.');
}
