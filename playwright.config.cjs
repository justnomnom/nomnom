const path = require('path');

const { defineConfig, devices } = require('@playwright/test');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

/** Absolute repo root — `process.cwd()` can be wrong when Playwright spawns the web server on Windows. */
const repoRoot = __dirname;

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3032';

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  /** Default 1: one Next webpack dev server cannot serve many parallel browsers without timeouts / OOM restarts. Override: PW_WORKERS=4 */
  workers: Number(process.env.PW_WORKERS) || 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  globalSetup: './tests/e2e/global-setup.ts',
  /** Webpack first-compile of a cold dashboard route often exceeds 60s. Override: PW_TIMEOUT. */
  timeout: Number(process.env.PW_TIMEOUT) || 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    /**
     * `retain-on-failure` still records every test, then keeps failures. On a near-full
     * disk that filled C: mid-run (ENOSPC writing error-context.md / videos). Opt in with
     * PW_VIDEO=1 when debugging a specific failure.
     */
    video: process.env.PW_VIDEO === '1' ? 'retain-on-failure' : 'off',
    locale: 'en-US',
  },
  projects: [
    {
      name: 'public',
      testMatch: /public\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'dashboard',
      testMatch: /dashboard\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/storage-state.json',
      },
      dependencies: [],
    },
  ],
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : {
        /** Webpack dev tends to be more predictable for CI than Turbopack; override with E2E_WEBSERVER_COMMAND */
        command: process.env.E2E_WEBSERVER_COMMAND || 'npm run dev:webpack',
        cwd: repoRoot,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        /**
         * The server binds in ~3s, but this timeout covers the first HTTP response, and on a
         * cold `.next` the initial webpack compile of `/` alone takes ~2min on a dev laptop
         * (other routes are worse). At the old 180s this raced the compiler and lost, and the
         * failure mode is silent: `Timed out waiting ... from config.webServer` skips every
         * spec, so a run that executed zero tests still looks like it "ran". Override with
         * PW_WEBSERVER_TIMEOUT. Already-warm servers are reused and return immediately, so a
         * high ceiling costs nothing in the common case.
         */
        timeout: Number(process.env.PW_WEBSERVER_TIMEOUT) || 600_000,
        /** Keep E2E-prefixed lists visible on /dashboard/lists while dev UI hides them for design QA */
        env: {
          ...process.env,
          NEXT_PUBLIC_SHOW_E2E_LISTS_IN_UI: 'true',
          WEBPACK_CACHE: 'off',
        },
      },
});
