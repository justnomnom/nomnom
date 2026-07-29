import { paths } from 'src/routes/paths';

// =============================================================================
// Brand & contact
// =============================================================================

export const APP = {
  name: 'NomNom',
  shortName: 'NomNom',
  description:
    'Restaurant picks from people you trust. Not algorithms. Follow creators and locals who actually eat where they recommend.',
  themeColor: '#FF6B35',
  /** Bare domain (no scheme) shown in user-facing copy (e.g. legal pages). */
  domain: process.env.NEXT_PUBLIC_APP_DOMAIN || 'nomnom.app',
  supportEmailDefault: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
  /** Public App Store product URL — enables “verify rating” links on the homepage when set. */
  appStoreUrl: process.env.NEXT_PUBLIC_APP_STORE_URL || '',
  socials: {
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || '',
  },
  get keywords() {
    return `${this.name},restaurants,food discovery,dining,creators,reviews,local food,where to eat,restaurant recommendations`;
  },
};

/** Shown in footer and similar; set `NEXT_PUBLIC_CONTACT_EMAIL` in env */
export const APP_SUPPORT_EMAIL = APP.supportEmailDefault;

// =============================================================================
// Site URLs
// =============================================================================

/** Same port as `package.json` `dev` / `start` (`next dev -p 3032`) — keep aligned with `getSiteUrl()` in `src/content-platform/site-url.ts`. */
const LOCAL_SITE_FALLBACK = 'http://localhost:3032';

/**
 * Client-visible absolute origin (uses `NEXT_PUBLIC_SITE_URL`). In production, set this to the same
 * canonical host as `SITE_URL` so metadata, JSON-LD, and client-side links agree.
 */
export const SITE = {
  url: process.env.NEXT_PUBLIC_SITE_URL,
  devFallbackUrl: LOCAL_SITE_FALLBACK,
};

export const SITE_PUBLIC_BASE_URL = SITE.url || SITE.devFallbackUrl;

// =============================================================================
// Layout shell (px)
// =============================================================================

export const HEADER = {
  H_MOBILE: 64,
  H_DESKTOP: 65,
  H_DESKTOP_OFFSET: 65,
};

/**
 * CSS `padding-top` for dashboard `Main` when the fixed AppBar is visible (`lg+`).
 * AppBar uses `pt: env(safe-area-inset-top)`, toolbar `H_DESKTOP`, and a 1px bottom border on the bar.
 */
export const DASHBOARD_MAIN_TOP_BELOW_APPBAR = `calc(${HEADER.H_DESKTOP + 1}px + env(safe-area-inset-top, 0px))`;

export const NAV = {
  W_VERTICAL: 280,
  W_MINI: 88,
  /** Mobile bottom bar (horizontal layout); padding included for icon + label */
  H_MOBILE_BOTTOM: 72,
};

// =============================================================================
// Feature toggles (must match env when enabling a vendor)
// =============================================================================

/**
 * All `false` = integrations off regardless of env. Set one to `true` and add env vars
 * (see table). PostHog/Sleekplan/etc. read these before initializing clients.
 *
 * | Flag     | Typical env |
 * |----------|-------------|
 * | push     | NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (auto-on when set) |
 * | sleekplan| NEXT_PUBLIC_SLEEKPLAN_PRODUCT_ID |
 * | posthog  | NEXT_PUBLIC_POSTHOG_KEY, HOST |
 * | sentry   | NEXT_PUBLIC_SENTRY_DSN, SENTRY_* + `next.config.js` plugin |
 */
export const INTEGRATION_FLAGS = {
  push: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
  sleekplan: false,
  posthog: Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY),
  sentry: false,
};

// =============================================================================
// Backends & assets
// =============================================================================

export const HOST_API = process.env.NEXT_PUBLIC_HOST_API;
export const ASSETS_API = process.env.NEXT_PUBLIC_ASSETS_API;

export const BACKEND_API = {
  host: process.env.NEXT_PUBLIC_BACKEND_API_HOST,
};

/**
 * Alibaba Qwen via DashScope's OpenAI-compatible endpoint. Used for cheap
 * review-consensus extraction during restaurant ingest (`src/libs/restaurant-ingest/review-consensus-ai.js`).
 * Default endpoint is the international DashScope host (accepts non-Chinese cards).
 */
export const QWEN_API = {
  key: process.env.QWEN_API_KEY,
  model: process.env.QWEN_MODEL || 'qwen-turbo',
  baseUrl: process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
};

/** Min new Google reviews in the sampled set before re-running review-consensus AI on re-ingest. */
const minNewReviewsRaw = parseInt(process.env.RESTAURANT_INGEST_MIN_NEW_REVIEWS_FOR_AI ?? '10', 10);
export const RESTAURANT_INGEST_MIN_NEW_REVIEWS_FOR_AI =
  Number.isFinite(minNewReviewsRaw) && minNewReviewsRaw >= 0 ? minNewReviewsRaw : 10;

/** Public Mapbox token for GL JS (`react-map-gl` / map tiles). Create at https://account.mapbox.com/ */
export const MAPBOX_API = {
  accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
};

/**
 * Supabase API keys (hosted): publishable + secret.
 * @see https://supabase.com/docs/guides/api/api-keys
 */
export const SUPABASE_API = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  /** Publishable key — `createClient` / SSR helpers (bundled for the browser). */
  key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
  /** Secret key — server-only; never use `NEXT_PUBLIC_*`. */
  secretKey: process.env.SUPABASE_SECRET_KEY || '',
  /** Server-side / tooling only — not from `NEXT_PUBLIC_*` */
  dbPassword: process.env.POSTGRES_PASSWORD,
};

// =============================================================================
// Email (Resend)
// =============================================================================

export const RESEND_API = {
  key: process.env.RESEND_API_KEY,
  from: process.env.RESEND_FROM_EMAIL,
  to: process.env.RESEND_TO_EMAIL,
};

/** Server-only: required for `POST /api/email/send` (Bearer). Public forms use server actions instead. */
export const EMAIL_OUTBOUND_SECRET = process.env.EMAIL_OUTBOUND_SECRET || '';

/** Server-only Bearer for `POST /api/restaurants/ingest` (Google Maps place JSON → DB). */
export const RESTAURANT_INGEST_SECRET = process.env.RESTAURANT_INGEST_SECRET || '';

/** Server-only Bearer for scheduled cron routes (e.g. the notification email digest). */
export const CRON_SECRET = process.env.CRON_SECRET || '';

/** `RESEND_API.to` wins when set; otherwise public contact / default inbox */
export const FEEDBACK_INBOUND_EMAIL = RESEND_API.to || APP_SUPPORT_EMAIL;

// =============================================================================
// Web Push (PWA notifications)
// =============================================================================

/**
 * Web Push (VAPID). `publicKey` is exposed to the browser to create push
 * subscriptions; `privateKey` is server-only and used by `web-push` to send.
 * Generate a keypair with `npx web-push generate-vapid-keys`. When keys are
 * absent the whole push layer no-ops (the in-app bell still works).
 */
export const WEB_PUSH = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
  subject: process.env.VAPID_SUBJECT || `mailto:${APP_SUPPORT_EMAIL}`,
};

// =============================================================================
// Observability
// =============================================================================

export const SENTRY_API = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG || 'nomnom',
  project: process.env.SENTRY_PROJECT || 'frontend',
  environment: process.env.NODE_ENV || 'development',
  debug: process.env.NEXT_PUBLIC_SENTRY_DEBUG === 'true',
  tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE) || 1.0,
  replaysOnErrorSampleRate:
    parseFloat(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE) || 1.0,
  replaysSessionSampleRate:
    parseFloat(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE) || 0.1,
};

export const POSTHOG_API = {
  key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  devMode: process.env.NEXT_PUBLIC_POSTHOG_DEV_MODE === 'true',
  /**
   * In dev, PostHog stays off unless `NEXT_PUBLIC_POSTHOG_DEV_MODE=true`.
   * Also gated by `INTEGRATION_FLAGS.posthog`.
   */
  disabled:
    !INTEGRATION_FLAGS.posthog ||
    (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_POSTHOG_DEV_MODE),
};

const POSTHOG_JS_PRESETS = {
  analyticsClient: {
    capture_pageview: true,
    capture_pageleave: true,
    respect_dnt: true,
    bootstrap: {
      featureFlags: {},
    },
  },
  init: {
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    disable_session_recording: false,
  },
};

/** Merged into provider `options` (not the same shape as `posthog.init` args) */
export const POSTHOG_CLIENT_OPTIONS = POSTHOG_JS_PRESETS.analyticsClient;
/** Passed to `posthog.init` besides `api_key` / `api_host` */
export const POSTHOG_JS_INIT_OPTIONS = POSTHOG_JS_PRESETS.init;

// =============================================================================
// Embeds (feedback widget, GTM)
// =============================================================================

export const SLEEKPLAN_API = {
  productId: process.env.NEXT_PUBLIC_SLEEKPLAN_PRODUCT_ID,
  sdkUrl: 'https://client.sleekplan.com/sdk/e.js',
};

export const GTM_API = {
  id: process.env.NEXT_PUBLIC_GTM_ID,
  enabled: !!process.env.NEXT_PUBLIC_GTM_ID,
};

// =============================================================================
// Next.js App Router + settings drawer
// =============================================================================

export const APP_VIEWPORT = {
  themeColor: APP.themeColor,
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  /** Lets `env(safe-area-inset-*)` reflect notches / home indicator when combined with CSS padding. */
  viewportFit: 'cover',
};

/** Relative to `metadataBase` (root `layout.js`). Served by `src/app/opengraph-image.tsx`. */
const APP_OG_IMAGE = '/opengraph-image';

export const APP_OG_IMAGE_PATH = APP_OG_IMAGE;

export const APP_METADATA = {
  title: {
    default: APP.name,
  },
  description: APP.description,
  keywords: APP.keywords,
  manifest: '/manifest.json',
  icons: [
    { rel: 'icon', url: '/favicon/favicon.ico' },
    { rel: 'icon', type: 'image/png', sizes: '16x16', url: '/favicon/favicon-16x16.png' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', url: '/favicon/favicon-32x32.png' },
    { rel: 'apple-touch-icon', sizes: '180x180', url: '/favicon/apple-touch-icon.png' },
  ],
  appleWebApp: {
    capable: true,
    title: APP.name,
    statusBarStyle: 'default',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: APP.name,
    title: APP.name,
    description: APP.description,
    images: [
      {
        url: APP_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: APP.name,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: APP.name,
    description: APP.description,
    images: [APP_OG_IMAGE],
  },
};

/**
 * Canonical PWA fields in JS; `public/manifest.json` cannot import this file —
 * update both when changing install / theme behavior.
 */
export const APP_WEB_MANIFEST = {
  name: APP.name,
  short_name: APP.shortName,
  display: 'standalone',
  start_url: '/',
  theme_color: APP.themeColor,
  background_color: '#faf9f5',
  icons: [
    { src: 'favicon/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: 'favicon/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
  ],
};

/**
 * Initial state for `SettingsProvider` / `useSettingsContext` before localStorage overrides.
 * Option strings match MUI Settings theme layout presets.
 */
export const DEFAULT_APP_SETTINGS = {
  themeMode: 'light',
  themeDirection: 'ltr',
  themeContrast: 'bold',
  themeLayout: 'horizontal',
  themeColorPresets: 'default',
  themeStretch: false,
};

// =============================================================================
// Routing & palettes
// =============================================================================

export const PATH_AFTER_LOGIN = paths.dashboard.discover;

/** Series colors — align with Tailwind / export-html chart CSS vars if you change them */
export const CHART_COLORS = {
  1: '#FF5A5F',
  2: '#3B82F6',
  3: '#10B981',
  4: '#F59E0B',
  5: '#8B5CF6',
};

export const CALENDAR_COLOR_OPTIONS = [
  CHART_COLORS[1],
  CHART_COLORS[2],
  CHART_COLORS[3],
  CHART_COLORS[4],
  CHART_COLORS[5],
];

/** Maps goal/task status to `theme.palette` path strings (e.g. `info.main`) */
export const STATUS_COLORS = {
  not_started: 'grey.500',
  in_progress: 'info.main',
  completed: 'success.main',
  blocked: 'error.main',
};

export const getStatusColor = (theme, status) => {
  const colorKey = STATUS_COLORS[status];
  if (!colorKey) return theme.palette.grey[500];
  const [paletteKey, shade] = colorKey.split('.');
  return theme.palette[paletteKey]?.[shade] || theme.palette.grey[500];
};
