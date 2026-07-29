/**
 * Fast pure-logic tests for E2E helpers — no globalSetup, webServer, or Supabase.
 */
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e/support',
  testMatch: /.*\.unit\.spec\.ts$/,
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {},
});
