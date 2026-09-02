/**
 * Every App Router `route.js` must have a unit test so new handlers cannot ship untested.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** Relative to repo root → unit test that imports or exercises that handler. */
const ROUTE_UNIT_TESTS = {
  'src/app/(frontend)/api/webhooks/stripe/route.js':
    'src/auth/__tests__/stripe-webhook-route.test.mjs',
  'src/app/(frontend)/api/stripe/checkout/verify-snapshot/route.js':
    'src/auth/__tests__/stripe-verify-snapshot-route.test.mjs',
  'src/app/(frontend)/api/stripe/checkout/list/route.js':
    'src/auth/__tests__/stripe-checkout-list-route.test.mjs',
  'src/app/(frontend)/api/stripe/connect/onboard/route.js':
    'src/auth/__tests__/stripe-connect-onboard-route.test.mjs',
  'src/app/(frontend)/api/stripe/billing-portal/route.js':
    'src/auth/__tests__/stripe-billing-portal-route.test.mjs',
  'src/app/(frontend)/api/email/send/route.js': 'src/auth/__tests__/email-send-route.test.mjs',
  'src/app/(frontend)/api/restaurants/ingest/route.js':
    'src/auth/__tests__/restaurants-ingest-route.test.mjs',
  'src/app/(frontend)/api/notifications/route.js':
    'src/auth/__tests__/notifications-mutation-route.test.mjs',
  'src/app/(frontend)/api/notifications/read/route.js':
    'src/auth/__tests__/notifications-mutation-route.test.mjs',
  'src/app/(frontend)/api/notifications/delete/route.js':
    'src/auth/__tests__/notifications-mutation-route.test.mjs',
  'src/app/(frontend)/api/push/subscribe/route.js': 'src/auth/__tests__/push-routes.test.mjs',
  'src/app/(frontend)/api/push/unsubscribe/route.js': 'src/auth/__tests__/push-routes.test.mjs',
  'src/app/(frontend)/api/auth/session-setup/route.js':
    'src/auth/__tests__/session-setup-route.test.mjs',
  'src/app/(frontend)/api/cron/notification-digest/route.js':
    'src/auth/__tests__/cron-digest-route.test.mjs',
  'src/app/(frontend)/auth/callback/route.js': 'src/auth/__tests__/oauth-callback-route.test.mjs',
};

/**
 * Recursively collect `route.js` files under `src/app`.
 *
 * @param {string} dir
 * @returns {string[]}
 */
function walkRouteFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkRouteFiles(abs));
    else if (entry.name === 'route.js') out.push(path.relative(ROOT, abs).replaceAll('\\', '/'));
  }
  return out.sort();
}

test('every src/app route.js has a mapped unit test file', () => {
  const routes = walkRouteFiles(path.join(ROOT, 'src', 'app'));
  assert.ok(routes.length > 0);
  const missingMap = routes.filter((r) => !ROUTE_UNIT_TESTS[r]);
  assert.deepEqual(missingMap, [], `unmapped routes: ${missingMap.join(', ')}`);
  const extraMap = Object.keys(ROUTE_UNIT_TESTS).filter((r) => !routes.includes(r));
  assert.deepEqual(extraMap, [], `stale map entries: ${extraMap.join(', ')}`);
  for (const testFile of new Set(Object.values(ROUTE_UNIT_TESTS))) {
    assert.equal(fs.existsSync(path.join(ROOT, testFile)), true, testFile);
  }
});
