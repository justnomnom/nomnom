/**
 * Play Store release pipeline: cap sync (release) + Gradle bundleRelease → .aab
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PATHS, loadDotenvLocal, resolveCapacitorServerUrl } from './lib/android-play-env.mjs';

loadDotenvLocal();

const isWin = process.platform === 'win32';
const gradlew = path.join(PATHS.androidDir, isWin ? 'gradlew.bat' : 'gradlew');

function fail(message) {
  console.error(message);
  process.exit(1);
}

let serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();
if (!serverUrl) {
  serverUrl = resolveCapacitorServerUrl();
}
if (!serverUrl) {
  fail(
    '[cap:android:bundle] CAPACITOR_SERVER_URL or NEXT_PUBLIC_SITE_URL is required.\n' +
      '  Set in .env.local or pass CAPACITOR_SERVER_URL=https://your-domain.com',
  );
}

process.env.CAPACITOR_SERVER_URL = serverUrl.replace(/\/$/, '');

if (!/^https:\/\//i.test(process.env.CAPACITOR_SERVER_URL)) {
  console.warn(
    '[cap:android:bundle] Warning: server URL is not https:// — use production HTTPS for Play Store builds.',
  );
}

if (!existsSync(PATHS.keystoreProps)) {
  fail('[cap:android:bundle] Missing android/keystore.properties — run: npm run cap:android:setup');
}

console.log(`[cap:android:bundle] Syncing Capacitor → ${process.env.CAPACITOR_SERVER_URL}`);
const sync = spawnSync('npm', ['run', 'cap:sync:release'], {
  cwd: PATHS.root,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

if (sync.status !== 0) {
  process.exit(sync.status === null ? 1 : sync.status);
}

if (!existsSync(gradlew)) {
  fail(`[cap:android:bundle] Gradle wrapper not found at ${gradlew}`);
}

console.log('[cap:android:bundle] Building signed release App Bundle (bundleRelease)…');
const bundle = spawnSync(gradlew, ['bundleRelease'], {
  cwd: PATHS.androidDir,
  stdio: 'inherit',
  shell: isWin,
});

if (bundle.status !== 0) {
  process.exit(bundle.status === null ? 1 : bundle.status);
}

if (existsSync(PATHS.aab)) {
  console.log(`\n[cap:android:bundle] Done:\n  ${PATHS.aab}\n`);
} else {
  console.warn('[cap:android:bundle] bundleRelease finished but app-release.aab was not found.');
}
