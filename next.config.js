// Injected content via Sentry wizard below
const { withSentryConfig } = require('@sentry/nextjs');
const createWithMdx = require('@next/mdx');
const { REMOTE_IMAGE_REMOTE_PATTERNS } = require('./src/config/remote-image-patterns.cjs');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';

/** Baseline security headers (CSP omitted — Next.js + third-party scripts need a dedicated policy pass). */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  },
];

if (isProd && process.env.VERCEL) {
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  });
}

/** Native MDX for optional `.mdx` route modules; primary content uses `next-mdx-remote` + `/content`. */
const withMDX = createWithMdx({
  extension: /\.mdx$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

/** Must match INTEGRATION_FLAGS.sentry in src/config-global.js */
const SENTRY_NEXTJS_PLUGIN_ENABLED = false;

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'mdx'],
  trailingSlash: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: REMOTE_IMAGE_REMOTE_PATTERNS,
  },
  logging: {
    fetches: {
      fullUrl: !isDev, // Disable full URL logging in dev for faster compilation
    },
  },
  /**
   * Force-include the /content directory in every serverless function bundle.
   * NFT (Output File Tracing) can't statically trace fs.readdirSync calls that
   * use a dynamic process.cwd() path, so MDX/JSON content files are excluded
   * from the Vercel bundle unless listed here explicitly.
   * (Top-level in Next.js 15+; was `experimental.outputFileTracingIncludes`.)
   */
  outputFileTracingIncludes: {
    '/**': [
      './content/**/*.mdx',
      './content/**/*.json',
      // Share-card typefaces, read through a process.cwd() path for the same reason.
      // Without this the OG routes render in satori's fallback face. See src/libs/og/og-fonts.js.
      './src/libs/og/fonts/**',
    ],
  },
  /**
   * Carve build cache and repo junk out of the serverless function trace.
   *
   * The `(frontend)` content pages read MDX/JSON via a dynamic `process.cwd()`
   * path that NFT can't resolve statically, so it conservatively traces the
   * ENTIRE project root into every one of those functions — ~2.4 GB each,
   * dominated by `.next/cache` (webpack/turbopack build cache that Vercel
   * restores on each deploy), `.git`, generator caches, SQL migrations, and the
   * Android build dir. The build itself succeeds, but uploading multi-GB
   * functions makes Vercel's "Deploying outputs" phase run 15-20 min and then
   * fail with a generic transient error. None of these paths are read at
   * runtime, so excluding them is safe and cuts each function from ~2.4 GB to a
   * few MB. (Verified against the `.nft.json` traces: the actual runtime deps —
   * mdx/unified/etc. — are only a few MB and are left untouched.)
   */
  outputFileTracingExcludes: {
    '/**': [
      '**/*.pack',
      '**/*.pack.old',
      '**/*.sst',
      '.next/cache/**/*',
      '.next/dev/**/*',
      '.git/**/*',
      'scripts/.cache/**/*',
      'supabase/**/*',
      'android/**/*',
      'public/admin/**/*',
      'node_modules/.cache/**/*',
    ],
  },
  experimental: {
    serverComponentsHmrCache: true,
    /**
     * Enables browser View Transitions for App Router navigations so
     * `transitionTypes` on `next/link` (via RouterLink) can drive CSS animations.
     */
    viewTransition: true,
    /** Next.js 16: faster Turbopack cold starts / restarts (beta). */
    turbopackFileSystemCacheForDev: true,
    /**
     * Next.js 16 writes a transient best-effort lock at `.next/lock` during
     * `next build` (default on) and removes it on process exit. Vercel's build
     * pipeline walks `.next` to assemble the output and races on that file,
     * failing with `ENOENT: lstat '/vercel/path0/.next/lock'` even though the
     * build itself succeeds. We don't run `next dev` and `next build` against
     * the same distDir concurrently, so the lock buys us nothing — disable it.
     */
    lockDistDir: false,
    // Optimize for faster dev compilation
    optimizePackageImports: [
      '@mui/material',
      '@mui/icons-material',
      '@mui/lab',
      '@mui/x-data-grid',
      '@mui/x-date-pickers',
      'lodash',
      'date-fns',
      '@iconify/react',
      'framer-motion',
      'lucide-react',
    ],
  },
  // Next.js 16: Turbopack is the default bundler; use `next dev --webpack` / `next build --webpack` if you need custom webpack-only plugins.
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/api/webhooks',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Dashboard index redirects — HTTP level only (no redirect-only page.js).
      // Server redirect() in page.js caused React hooks violations on client nav
      // (Next.js 16 + React 19) and broke Vercel builds (missing client manifests).
      {
        source: '/dashboard',
        destination: '/dashboard/discover',
        permanent: false,
      },
      {
        source: '/dashboard/account',
        destination: '/dashboard/settings',
        permanent: false,
      },
      {
        source: '/dashboard/profile',
        destination: '/dashboard/settings',
        permanent: true,
      },
      {
        source: '/dashboard/profile/:path*',
        destination: '/dashboard/settings/:path*',
        permanent: true,
      },
      {
        source: '/dashboard/settings/edit',
        destination: '/dashboard/settings/profile/edit',
        permanent: true,
      },
      {
        source: '/dashboard/saved',
        destination: '/dashboard/lists',
        permanent: true,
      },
    ];
  },
  modularizeImports: {
    '@mui/icons-material': {
      transform: '@mui/icons-material/{{member}}',
    },
    '@mui/material': {
      transform: '@mui/material/{{member}}',
    },
    '@mui/lab': {
      transform: '@mui/lab/{{member}}',
    },
  },
  // Webpack configuration (only used when NOT using Turbopack)
  webpack(config, { isServer, dev }) {
    // @sentry/node → OpenTelemetry uses dynamic require(); webpack flags it but runtime is fine.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /@opentelemetry\/instrumentation/ },
    ];

    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    if (dev) {
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };

      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    }

    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        pino: 'pino/browser',
        'pino-abstract-transport': false,
        'node:async_hooks': false,
        'node:assert': false,
        'node:buffer': false,
        'node:console': false,
        'node:crypto': false,
        'node:fs': false,
        'node:path': false,
        'node:process': false,
        'node:stream': false,
        'node:util': false,
        'pg-connection-string': false,
        pg: false,
        readline: false,
        sharp: false,
        'fs/promises': false,
        'path/posix': false,
        'path/win32': false,
        'util/types': false,
        'crypto/webcrypto': false,
      };
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
        worker_threads: false,
        async_hooks: false,
        assert: false,
        readline: false,
        child_process: false,
        cluster: false,
        dgram: false,
        dns: false,
        domain: false,
        events: false,
        http: false,
        https: false,
        net: false,
        querystring: false,
        tls: false,
        tty: false,
        url: false,
        vm: false,
        zlib: false,
        'fs/promises': false,
        'path/posix': false,
        'path/win32': false,
        'util/types': false,
        'crypto/webcrypto': false,
      };

      config.externals = config.externals || [];
      config.externals.push({
        sharp: 'commonjs sharp',
        pg: 'commonjs pg',
        'pg-connection-string': 'commonjs pg-connection-string',
      });
    }

    return config;
  },
};

const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG || 'nomnom-ek',
  project: process.env.SENTRY_PROJECT || 'nomnom',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  reactComponentAnnotation: {
    enabled: true,
  },
  disable: isDev,
  hideSourceMaps: isDev,
};

/** MDX first so `@next/mdx` mutates the config; bundle analyzer wraps next; Sentry stays outermost (source maps / build instrumentation). */
const configWithMdx = withBundleAnalyzer(withMDX(nextConfig));

module.exports =
  isDev || !SENTRY_NEXTJS_PLUGIN_ENABLED
    ? configWithMdx
    : withSentryConfig(configWithMdx, sentryWebpackPluginOptions);
