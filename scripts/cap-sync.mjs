/**
 * `cap sync` with .env.local loaded and CAPACITOR_SERVER_URL resolved from NEXT_PUBLIC_SITE_URL.
 * Use for day-to-day native work; store builds should use `cap:sync:release` (CAPACITOR_LOGGING=none).
 */
import { spawnSync } from 'node:child_process';
import { loadDotenvLocal, resolveCapacitorServerUrl } from './lib/android-play-env.mjs';

loadDotenvLocal();

const serverUrl = resolveCapacitorServerUrl();
const env = { ...process.env };

if (serverUrl) {
  env.CAPACITOR_SERVER_URL = serverUrl;
  console.log(`[cap:sync] CAPACITOR_SERVER_URL=${serverUrl}`);
  if (/^http:\/\//i.test(serverUrl)) {
    console.warn(
      '[cap:sync] HTTP LAN URL — use a debug Android build so cleartext is allowed (see android/app/src/debug/).',
    );
  }
} else {
  console.warn(
    '[cap:sync] CAPACITOR_SERVER_URL not set — native WebView will show the capacitor-www stub until you set it in .env.local.',
  );
}

const result = spawnSync('npx', ['cap', 'sync'], {
  stdio: 'inherit',
  shell: true,
  env,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status === null ? 1 : result.status);
