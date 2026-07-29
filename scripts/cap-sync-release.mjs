/**
 * Runs `cap sync` with CAPACITOR_LOGGING=none so native projects do not ship debug logging
 * to store builds (see capacitor.config.ts). Cross-platform (Windows/macOS/Linux).
 *
 * Requires CAPACITOR_SERVER_URL so embedded `capacitor.config.json` gets `server.url` and the
 * WebView loads your hosted Next app — not the `capacitor-www` stub.
 */
import { spawnSync } from 'node:child_process';
import { loadDotenvLocal, resolveCapacitorServerUrl } from './lib/android-play-env.mjs';

loadDotenvLocal();

const serverUrl = resolveCapacitorServerUrl();
if (!serverUrl) {
  console.error(
    '[cap:sync:release] CAPACITOR_SERVER_URL or NEXT_PUBLIC_SITE_URL is required.\n' +
      '  Example (production): set CAPACITOR_SERVER_URL=https://your-domain.com in .env.local\n' +
      '  LAN dev: CAPACITOR_SERVER_URL=http://192.168.x.x:3032\n' +
      '  See .env.example (Capacitor section).',
  );
  process.exit(1);
}

process.env.CAPACITOR_SERVER_URL = serverUrl;

const env = { ...process.env, CAPACITOR_LOGGING: 'none' };

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
