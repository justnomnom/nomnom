/**
 * Connected-account calls must send the `Stripe-Account` header.
 *
 * stripe-node decides whether an argument is *params* or *per-request options* by
 * position, and `utils.isOptionsHash` only inspects the LAST argument. So
 * `stripe.subscriptions.cancel(id, { stripeAccount })` does not configure the account —
 * the object lands in the params slot, `stripeAccount` is serialised into the request
 * (body or query string), no header is sent, and the call silently resolves against the
 * PLATFORM account. Every affected call site then failed with "No such subscription",
 * which the callers' catch blocks treated as an already-cancelled success.
 *
 * These tests assert the wire format rather than the call shape, because the call shape
 * is exactly what looked correct while being wrong.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import Stripe from 'stripe';

const ACCOUNT = 'acct_TEST_CONNECTED';

/**
 * Capture the request a single Stripe call would put on the wire.
 * @param {(stripe: Stripe) => Promise<unknown>} run
 * @returns {Promise<{ url: string, body: string | null, account: string | null }>}
 */
async function captureRequest(run) {
  /** @type {{ url: string, body: string | null, account: string | null } | null} */
  let seen = null;
  const fakeFetch = async (/** @type {string} */ url, /** @type {any} */ init) => {
    const pairs = Array.isArray(init.headers) ? init.headers : Object.entries(init.headers ?? {});
    const hit = pairs.find(([k]) => String(k).toLowerCase() === 'stripe-account');
    seen = { url, body: init.body ?? null, account: hit ? String(hit[1]) : null };
    return new Response(JSON.stringify({ id: 'obj_1', object: 'subscription' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  const stripe = new Stripe('sk_test_stripe_connect_account_arg', {
    httpClient: Stripe.createFetchHttpClient(fakeFetch),
  });
  await run(stripe);
  assert.ok(seen, 'no request was captured');
  return seen;
}

/** `stripeAccount` must never leak into the URL or body — that is the broken shape. */
function assertTargetsConnectedAccount(req, label) {
  assert.equal(req.account, ACCOUNT, `${label}: Stripe-Account header missing`);
  assert.ok(!req.url.includes('stripeAccount'), `${label}: stripeAccount leaked into the URL`);
  assert.ok(
    !String(req.body ?? '').includes('stripeAccount'),
    `${label}: stripeAccount leaked into the body`
  );
}

test('subscriptions.cancel targets the connected account', async () => {
  const req = await captureRequest((s) => s.subscriptions.cancel('sub_1', {}, { stripeAccount: ACCOUNT }));
  assertTargetsConnectedAccount(req, 'subscriptions.cancel');
});

test('subscriptions.update sends both the param and the account header', async () => {
  const req = await captureRequest((s) =>
    s.subscriptions.update('sub_1', { cancel_at_period_end: true }, { stripeAccount: ACCOUNT })
  );
  assertTargetsConnectedAccount(req, 'subscriptions.update');
  assert.ok(
    String(req.body ?? '').includes('cancel_at_period_end=true'),
    'cancel_at_period_end must still reach Stripe'
  );
});

test('subscriptions.retrieve keeps expand as params and the account as options', async () => {
  const req = await captureRequest((s) =>
    s.subscriptions.retrieve('sub_1', { expand: ['items.data.price'] }, { stripeAccount: ACCOUNT })
  );
  assertTargetsConnectedAccount(req, 'subscriptions.retrieve');
  assert.ok(req.url.includes('expand'), 'expand must still reach Stripe');
});

test('checkout.sessions.retrieve targets the connected account', async () => {
  const req = await captureRequest((s) =>
    s.checkout.sessions.retrieve('cs_1', {}, { stripeAccount: ACCOUNT })
  );
  assertTargetsConnectedAccount(req, 'checkout.sessions.retrieve');
});

test('balance.retrieve reads the connected account, not the platform', async () => {
  const req = await captureRequest((s) => s.balance.retrieve({}, { stripeAccount: ACCOUNT }));
  assertTargetsConnectedAccount(req, 'balance.retrieve');
});

test('billingPortal.sessions.create targets the connected account', async () => {
  const req = await captureRequest((s) =>
    s.billingPortal.sessions.create(
      { customer: 'cus_1', return_url: 'https://example.test/back' },
      { stripeAccount: ACCOUNT }
    )
  );
  assertTargetsConnectedAccount(req, 'billingPortal.sessions.create');
});

/**
 * The regression itself, pinned: the shape the codebase used produced a request with no
 * account header. If a future stripe-node makes this shape work, this test fails and the
 * comments warning against it can go.
 */
test('the mixed-argument shape does NOT set the account header', async () => {
  const req = await captureRequest((s) =>
    // @ts-expect-error deliberately the wrong shape
    s.subscriptions.update('sub_1', { cancel_at_period_end: true, stripeAccount: ACCOUNT })
  );
  assert.equal(req.account, null, 'mixed shape unexpectedly set Stripe-Account');
  assert.ok(
    String(req.body ?? '').includes('stripeAccount'),
    'mixed shape should serialise stripeAccount as a request param'
  );
});
