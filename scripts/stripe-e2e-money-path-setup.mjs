/**
 * Provision the LIVE (Stripe test-mode) objects the paid-list money-path E2E needs:
 *   - a Connect **custom** test account with `charges_enabled = true`
 *   - a product + monthly recurring **Price** on that connected account
 *
 * The DB-only seed in tests/e2e/support/seed.ts uses a fake price/connect id, which is enough
 * for the checkout *guards* (they return before touching Stripe) but NOT for the happy path:
 * Stripe rejects a Checkout Session on a connected account whose card_payments capability is not
 * active. This script creates the real objects once and stores their ids in `.env.local` so the
 * spec can reuse them (creating + activating a Connect account takes ~60s of async review).
 *
 * Idempotent: if a stored account still has charges enabled and the stored price still exists,
 * it is reused. Pass `--force` to always create fresh objects.
 *
 * Usage:
 *   npm run stripe:e2e:setup
 *   npm run stripe:e2e:setup -- --force
 *
 * Requires: STRIPE_SECRET_KEY (sk_test_...) in .env.local. Connect must be enabled on the platform
 * test account (Dashboard → Connect). Card_payments activation relies on the standard test-mode
 * verification tokens (address_full_match, ssn 0000, file_identity_document_success).
 */
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Stripe from 'stripe';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env.local');

for (const name of ['.env.local', '.env']) {
  const p = path.join(root, name);
  if (fs.existsSync(p)) dotenv.config({ path: p });
}

const FORCE = process.argv.includes('--force');
const ACTIVATION_TIMEOUT_MS = 150_000;
const PRICE_CENTS = 500;
const PRICE_CURRENCY = 'eur';

const START = '# <<< E2E_STRIPE_MONEY_PATH_BLOCK_START >>>';
const END = '# <<< E2E_STRIPE_MONEY_PATH_BLOCK_END >>>';

function log(...a) {
  console.log('[stripe-e2e-setup]', ...a);
}

/** Create a fully-specified custom individual account that can reach charges_enabled in test mode. */
async function createConnectAccount(stripe) {
  const email = `e2e-creator-${Date.now()}@nomnom-e2e.local`;
  const account = await stripe.accounts.create({
    type: 'custom',
    country: 'US',
    email,
    business_type: 'individual',
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      mcc: '5812',
      url: 'https://www.nomnom.pt',
      product_description: 'E2E test — paid restaurant lists',
    },
    individual: {
      first_name: 'E2E',
      last_name: 'Creator',
      email,
      phone: '+15555551234',
      ssn_last_4: '0000',
      id_number: '000000000',
      dob: { day: 1, month: 1, year: 1990 },
      address: {
        line1: 'address_full_match',
        city: 'South San Francisco',
        state: 'CA',
        postal_code: '94080',
      },
      verification: { document: { front: 'file_identity_document_success' } },
    },
    tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: '127.0.0.1' },
    external_account: {
      object: 'bank_account',
      country: 'US',
      currency: 'usd',
      routing_number: '110000000',
      account_number: '000123456789',
    },
    metadata: { purpose: 'nomnom_e2e_money_path' },
  });
  return account;
}

/** Poll until card_payments verification review clears (test mode: ~60s). */
async function waitForChargesEnabled(stripe, accountId) {
  const start = Date.now();
  let acct = await stripe.accounts.retrieve(accountId);
  while (!acct.charges_enabled && Date.now() - start < ACTIVATION_TIMEOUT_MS) {
    log(
      `waiting for charges_enabled… ${Math.round((Date.now() - start) / 1000)}s ` +
        `(card_payments=${acct.capabilities?.card_payments})`
    );
    await new Promise((r) => setTimeout(r, 5000));
    acct = await stripe.accounts.retrieve(accountId);
  }
  return acct;
}

async function createRecurringPrice(stripe, accountId) {
  const product = await stripe.products.create(
    { name: 'E2E Paid List (money-path)', metadata: { purpose: 'nomnom_e2e_money_path' } },
    { stripeAccount: accountId }
  );
  const price = await stripe.prices.create(
    {
      product: product.id,
      currency: PRICE_CURRENCY,
      unit_amount: PRICE_CENTS,
      recurring: { interval: 'month' },
      metadata: { purpose: 'nomnom_e2e_money_path' },
    },
    { stripeAccount: accountId }
  );
  return price;
}

/** True when the stored account is still usable and the stored price still resolves. */
async function existingIsReusable(stripe, accountId, priceId) {
  if (!accountId || !priceId) return false;
  try {
    const acct = await stripe.accounts.retrieve(accountId);
    if (!acct.charges_enabled) return false;
    // retrieve(id, params, options) — the connected account is a request *option*, not a param.
    await stripe.prices.retrieve(priceId, undefined, { stripeAccount: accountId });
    return true;
  } catch {
    return false;
  }
}

function writeEnvBlock({ accountId, priceId, amountCents, currency }) {
  const q = (v) => JSON.stringify(v);
  const block = [
    START,
    '# Written by scripts/stripe-e2e-money-path-setup.mjs — real Stripe test-mode objects for the',
    '# paid-list money-path spec (tests/e2e/dashboard/monetization-money-path.spec.ts).',
    `E2E_STRIPE_CONNECT_ACCOUNT_ID=${q(accountId)}`,
    `E2E_STRIPE_PRICE_ID=${q(priceId)}`,
    `E2E_STRIPE_PRICE_AMOUNT_CENTS=${q(String(amountCents))}`,
    `E2E_STRIPE_PRICE_CURRENCY=${q(currency)}`,
    END,
    '',
  ].join('\n');

  let raw = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  if (raw.includes(START) && raw.includes(END)) {
    raw = raw.replace(new RegExp(`${START}[\\s\\S]*?${END}\\n?`, 'm'), block);
  } else {
    raw = raw.trimEnd() + '\n\n' + block;
  }
  fs.writeFileSync(envPath, raw, 'utf8');
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    console.error('Missing STRIPE_SECRET_KEY in .env.local (need sk_test_… from the Stripe Dashboard).');
    process.exit(1);
  }
  if (!key.startsWith('sk_test_')) {
    console.error('Refusing to run: STRIPE_SECRET_KEY is not a test key (sk_test_…). Aborting.');
    process.exit(1);
  }

  const stripe = new Stripe(key, { apiVersion: Stripe.API_VERSION });

  const storedAccount = process.env.E2E_STRIPE_CONNECT_ACCOUNT_ID?.trim();
  const storedPrice = process.env.E2E_STRIPE_PRICE_ID?.trim();

  if (!FORCE && (await existingIsReusable(stripe, storedAccount, storedPrice))) {
    log(`reusing existing account ${storedAccount} + price ${storedPrice} (still charges-enabled).`);
    writeEnvBlock({
      accountId: storedAccount,
      priceId: storedPrice,
      amountCents: process.env.E2E_STRIPE_PRICE_AMOUNT_CENTS || String(PRICE_CENTS),
      currency: process.env.E2E_STRIPE_PRICE_CURRENCY || PRICE_CURRENCY,
    });
    log('.env.local is up to date. Done.');
    return;
  }

  log('creating a new Connect custom test account…');
  const account = await createConnectAccount(stripe);
  log(`created ${account.id}; waiting for card_payments to activate (test-mode review ~60s)…`);

  const activated = await waitForChargesEnabled(stripe, account.id);
  if (!activated.charges_enabled) {
    console.error(
      `Account ${account.id} did not reach charges_enabled within ${ACTIVATION_TIMEOUT_MS / 1000}s. ` +
        `card_payments=${activated.capabilities?.card_payments}, ` +
        `disabled_reason=${activated.requirements?.disabled_reason}. ` +
        `Verify Connect is enabled on the platform test account, then re-run.`
    );
    process.exit(1);
  }
  log(`charges_enabled=true on ${account.id}.`);

  const price = await createRecurringPrice(stripe, account.id);
  log(`created price ${price.id} (${PRICE_CENTS} ${PRICE_CURRENCY}/month) on the connected account.`);

  writeEnvBlock({
    accountId: account.id,
    priceId: price.id,
    amountCents: String(PRICE_CENTS),
    currency: PRICE_CURRENCY,
  });

  log('Wrote E2E_STRIPE_* block to .env.local:');
  log(`  E2E_STRIPE_CONNECT_ACCOUNT_ID=${account.id}`);
  log(`  E2E_STRIPE_PRICE_ID=${price.id}`);
  log('Next: run `npm run stripe:listen` in another terminal, then the money-path spec.');
}

main().catch((err) => {
  console.error('[stripe-e2e-setup] failed:', err?.type || '', err?.code || '', err?.message || err);
  process.exit(1);
});
