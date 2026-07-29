/**
 * Shared env + paths for Android Play Store scripts.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const PATHS = {
  root,
  androidDir: path.join(root, 'android'),
  keystoreProps: path.join(root, 'android', 'keystore.properties'),
  keystoreFile: path.join(root, 'android', 'nomnom-upload.keystore'),
  keystoreExample: path.join(root, 'android', 'keystore.properties.example'),
  packageJson: path.join(root, 'package.json'),
  aab: path.join(
    root,
    'android',
    'app',
    'build',
    'outputs',
    'bundle',
    'release',
    'app-release.aab',
  ),
  credentialsBackup: path.join(root, 'android', '.play-signing-secrets.txt'),
};

export function loadDotenvLocal() {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (existsSync(p)) {
      dotenv.config({ path: p });
    }
  }
}

/** Production WebView origin for cap sync (required for store builds). */
export function resolveCapacitorServerUrl() {
  const fromEnv = process.env.CAPACITOR_SERVER_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    return site.replace(/\/$/, '');
  }
  return null;
}

export function readPackageVersion() {
  const pkg = JSON.parse(readFileSync(PATHS.packageJson, 'utf8'));
  return pkg.version;
}

export function bumpSemver(version, part = 'patch') {
  const m = /^(\d+)\.(\d+)\.(\d+)(.*)?$/.exec(version);
  if (!m) {
    throw new Error(`Invalid semver: ${version}`);
  }
  let major = Number(m[1]);
  let minor = Number(m[2]);
  let patch = Number(m[3]);
  const suffix = m[4] || '';
  if (part === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (part === 'minor') {
    minor += 1;
    patch = 0;
  } else if (part === 'patch') {
    patch += 1;
  } else {
    throw new Error(`Unknown bump: ${part} (use patch, minor, major)`);
  }
  return `${major}.${minor}.${patch}${suffix}`;
}

export function writePackageVersion(nextVersion) {
  const raw = readFileSync(PATHS.packageJson, 'utf8');
  const updated = raw.replace(/"version":\s*"[^"]+"/, `"version": "${nextVersion}"`);
  if (!updated.includes(`"version": "${nextVersion}"`)) {
    throw new Error('Failed to update version in package.json');
  }
  writeFileSync(PATHS.packageJson, updated, 'utf8');
}

export function androidVersionCode(version) {
  const parts = version.split('.');
  const major = Number(parts[0]) || 0;
  const minor = Number(parts[1]) || 0;
  const patch = Number(parts[2]) || 0;
  return major * 10000 + minor * 100 + patch;
}
