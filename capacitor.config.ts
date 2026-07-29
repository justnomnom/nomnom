import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native shells load your hosted Next.js app via `server.url` (SSR, API routes, auth).
 * Set `CAPACITOR_SERVER_URL` when running `npx cap sync` — never hardcode production URLs here.
 *
 * Security: `cleartext` is **false** for `https://` (store builds). Only plain `http://`
 * (LAN dev) uses cleartext on Android. See `.env.example`.
 *
 * Local dev: `CAPACITOR_SERVER_URL=http://YOUR_LAN_IP:3032 npx cap sync` + `npm run dev`
 *
 * Note: Capacitor’s docs warn `server.url` is not for “production” in the live-reload sense;
 * loading your **own** HTTPS deployment from the WebView is still the standard pattern for
 * SSR frameworks that cannot static-export.
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

/** Android: cleartext only for `http://` (LAN dev). `https://` never uses cleartext. */
const androidCleartext = Boolean(serverUrl && /^http:\/\//i.test(serverUrl));

/** In-WebView navigation to OAuth / Stripe (not `*` — Capacitor security best practice). */
const NAVIGATION_ALLOWLIST = [
  'https://accounts.google.com',
  'https://checkout.stripe.com',
  'https://billing.stripe.com',
  'https://js.stripe.com',
];

function resolveAllowNavigation(url: string | undefined): string[] | undefined {
  if (!url) {
    return undefined;
  }
  const origins = new Set<string>(NAVIGATION_ALLOWLIST);
  try {
    origins.add(new URL(url).origin);
  } catch {
    return NAVIGATION_ALLOWLIST;
  }
  return [...origins];
}

const config: CapacitorConfig = {
  appId: 'com.nomnom.app',
  appName: 'NomNom',
  webDir: 'capacitor-www',
  /** Match DESIGN.md parchment; avoids white flash behind remote content */
  backgroundColor: '#faf7f2',
  zoomEnabled: false,
  /**
   * Use CAPACITOR_LOGGING=none for release archives to avoid leaking logs on device.
   * @see https://capacitorjs.com/docs/config#loggingbehavior
   */
  loggingBehavior: (() => {
    const v = process.env.CAPACITOR_LOGGING;
    if (v === 'none' || v === 'debug' || v === 'production') {
      return v;
    }
    if (serverUrl && /^https:\/\//i.test(serverUrl)) {
      return 'production';
    }
    return 'debug';
  })(),
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: androidCleartext,
          androidScheme: 'https',
          allowNavigation: resolveAllowNavigation(serverUrl),
        },
      }
    : {}),
  ios: {
    /** Better keyboard / safe-area behavior than default `never` for scrollable web apps */
    contentInset: 'automatic',
    backgroundColor: '#faf7f2',
    zoomEnabled: false,
  },
  android: {
    backgroundColor: '#faf7f2',
    zoomEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: '#faf7f2',
      showSpinner: false,
    },
  },
};

export default config;
