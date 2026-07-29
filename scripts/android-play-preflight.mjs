/**
 * Preflight checks before a Play Store bundle build (no Gradle).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  PATHS,
  loadDotenvLocal,
  resolveCapacitorServerUrl,
  readPackageVersion,
} from './lib/android-play-env.mjs';

loadDotenvLocal();

const errors = [];
const warnings = [];

function check(condition, message, level = 'error') {
  if (!condition) {
    (level === 'error' ? errors : warnings).push(message);
  }
}

const serverUrl = resolveCapacitorServerUrl();
check(Boolean(serverUrl), 'CAPACITOR_SERVER_URL / NEXT_PUBLIC_SITE_URL is not set');
if (serverUrl && !/^https:\/\//i.test(serverUrl)) {
  warnings.push('Production server URL should use https:// for store builds');
}

check(existsSync(PATHS.keystoreProps), 'android/keystore.properties missing — run: npm run cap:android:setup');
check(existsSync(PATHS.keystoreFile), 'android/nomnom-upload.keystore missing — run: npm run cap:android:setup');

const version = readPackageVersion();
check(/^\d+\.\d+\.\d+/.test(version), `package.json version must be semver (got "${version}")`);

const capConfig = readFileSync(path.join(PATHS.root, 'capacitor.config.ts'), 'utf8');
check(capConfig.includes("appId: 'com.nomnom.app'"), 'capacitor.config.ts appId mismatch');

if (warnings.length) {
  console.warn('[cap:android:preflight] Warnings:\n' + warnings.map((w) => `  - ${w}`).join('\n'));
}

if (errors.length) {
  console.error('[cap:android:preflight] Failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log('[cap:android:preflight] OK — ready to build');
console.log(`  version ${version} → server ${serverUrl}`);
