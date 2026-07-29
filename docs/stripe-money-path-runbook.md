# Stripe paid-list money-path E2E runbook

Automates TEST-PLAN §5 **B9–B12** — the live paid-list money path against Stripe **test mode**:
subscription checkout → webhook grants access → paywall unlocks → cancel revokes, plus a snapshot
purchase and a failed-card case.

Spec: [`tests/e2e/dashboard/monetization-money-path.spec.ts`](../tests/e2e/dashboard/monetization-money-path.spec.ts)
Complements `monetization-guards.spec.ts` (guard-rail cases that stop before Stripe).

## How payment is completed (and why not the hosted page)

Each test **calls the app's `/api/stripe/checkout/list` route and asserts it returns a real
`checkout.stripe.com` session** on the connected account — so the route (guards + Stripe session
creation) is exercised. It then **completes the equivalent payment via the Stripe API** using
tokenized test cards (`pm_card_visa` = 4242, `pm_card_chargeCustomerFail` = 4000…0341), which fires
the *identical* real webhooks that grant/deny access.

Why not drive the hosted Checkout page with Playwright? Stripe's hosted Checkout presents an
**hCaptcha bot challenge on submit** that a headless browser cannot solve — the session stays
`open/unpaid` and no PaymentIntent is ever created (verified: the confirm request loads
`hcaptcha.com` assets and the button spins on "Processing" forever). API completion is the
industry-standard way to automate Stripe test-mode money flows and keeps the whole webhook →
access-row → paywall → cancel path real.

Snapshot (B10): a real one-time `PaymentIntent` is charged on the connected account, then a
**signed** `checkout.session.completed` event (real `pi_…`, `purchase_type=snapshot`) is delivered
to the local webhook — a Checkout Session can't be confirmed via the API, so this drives the
handler's snapshot branch against a real charge. The `verify-snapshot` route's redirect happy path
(which needs a *paid Checkout Session*) still requires the hosted page and stays manual.

## Why the DB-only seed isn't enough

`tests/e2e/support/seed.ts` can mark a list monetized at the DB level, but it uses a **fake**
`stripe_price_id` and no real Connect account. Stripe rejects a Checkout Session on a connected
account whose `card_payments` capability is inactive, so the happy path needs a **real** Connect
test account (charges enabled) + a real recurring Price. The setup script creates those once.

## One-time setup

1. **Stripe test keys** in `.env.local`:
   - `STRIPE_SECRET_KEY=sk_test_…`
   - `STRIPE_WEBHOOK_SECRET=whsec_…` — must equal the Stripe CLI signing secret so forwarded
     events verify. Check with `npm run stripe:webhook-secret` (prints the CLI secret); it should
     match the value in `.env.local`.
2. **Dashboard E2E auth** already configured (`npm run e2e:setup-user` writes the `E2E_*` block).
3. **Create the Connect account + price** (idempotent; ~60–90s the first time because Stripe's
   test-mode card_payments review is asynchronous):

   ```bash
   npm run stripe:e2e:setup
   ```

   This writes `E2E_STRIPE_CONNECT_ACCOUNT_ID`, `E2E_STRIPE_PRICE_ID`, `E2E_STRIPE_PRICE_AMOUNT_CENTS`,
   `E2E_STRIPE_PRICE_CURRENCY` to a managed block in `.env.local`. Re-running reuses the account if
   it is still charges-enabled; pass `-- --force` to recreate.

## Webhook forwarding

The spec **spawns its own `stripe listen`** (forwarding to `localhost:3032/api/webhooks/stripe`) for
the duration of the run and tears it down after — no separate terminal required, as long as the
Stripe CLI is installed and logged in (`stripe login`). It is harmless if you also have
`npm run stripe:listen` running; Stripe delivers to both and the handler is idempotent
(`stripe_events`). If the CLI isn't available, the spec skips with a hint.

## Run

```bash
# In one terminal: the app server (see "Server stability" below).
# In another:
npm run test:e2e:money-path
```

The spec skips cleanly (not fails) when prerequisites are missing: no test keys, no
`E2E_STRIPE_*` block, dashboard auth not configured, or the Stripe CLI can't start.

## Server stability (important on the webpack dev server)

The default E2E server is `npm run dev:webpack`. On large machines its cold route compiles can take
30–70s and it can restart near its memory threshold (documented in TEST-PLAN "Known environmental
flakiness"), which shows up here as `ERR_CONNECTION_RESET` / `Timeout` on the first hit of a route.
The spec already retries transient resets and uses generous per-navigation timeouts, but for a
reliable single run prefer one of:

- **Production server (most reliable):** `npm run build` then
  `E2E_WEBSERVER_COMMAND="npm run start" E2E_SKIP_WEBSERVER=1 …` with `npm run start` running
  separately — routes are pre-compiled, so there are no per-request compile spikes.
- **Warm the dev server first:** start `npm run dev:webpack`, hit `/dashboard`, one
  `/dashboard/lists/<id>` and `/api/stripe/checkout/list` once so they compile, then run with
  `E2E_SKIP_WEBSERVER=1` so Playwright reuses your server instead of managing (and killing) its own.

## What each test asserts

| Test | TEST-PLAN | Assertion |
|---|---|---|
| subscription happy path | B9 | route returns a real `checkout.stripe.com` session → `pm_card_visa` (4242) subscription via API → forwarded webhook writes an `active` `list_subscriptions` row → paywall gone on `/dashboard/lists/[id]` |
| cancel revokes | B11 | `stripe.subscriptions.cancel` → `customer.subscription.deleted` → row `canceled` → paywall returns |
| snapshot | B10 | route returns a real one-time session → real `pi_…` charge + signed `checkout.session.completed` → webhook persists `list_snapshot_purchases` (pi_…) → paywall gone |
| failed card | B12 | `pm_card_chargeCustomerFail` (4000…0341) → subscription `incomplete`, never `active` → no active row → paywall stays |

## Test data lifecycle

Each test creates a fresh creator user (linked to the shared Connect account), a monetized list
pointing at the real price, and one list item; teardown removes the access rows, list, customers
row, and auth user. The Connect account + price persist across runs (reused by the setup script).
