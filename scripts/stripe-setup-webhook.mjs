/**
 * Creates a Stripe webhook endpoint for this app (test mode) and prints STRIPE_WEBHOOK_SECRET.
 *
 * Prerequisites: STRIPE_SECRET_KEY in `.env.local` (sk_test_... from Dashboard or after `stripe login`).
 *
 * Usage:
 *   npm run stripe:setup-webhook
 *
 * Override URL (e.g. ngrok):
 *   STRIPE_WEBHOOK_URL=https://xxx.ngrok.io/api/webhooks/stripe npm run stripe:setup-webhook
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import Stripe from 'stripe';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

for (const name of ['.env.local', '.env']) {
  const p = path.join(root, name);
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
  }
}

const STRIPE_EVENTS = [
  'account.updated',
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
];

function resolveWebhookUrl() {
  if (process.env.STRIPE_WEBHOOK_URL) {
    return process.env.STRIPE_WEBHOOK_URL.trim();
  }
  const base =
    process.env.SITE_URL && String(process.env.SITE_URL).trim().toLowerCase() !== 'tbd'
      ? String(process.env.SITE_URL).trim().replace(/\/$/, '')
      : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3032').trim().replace(/\/$/, '');
  return `${base}/api/webhooks/stripe`;
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    console.error(
      'Missing STRIPE_SECRET_KEY. Add sk_test_... to .env.local from https://dashboard.stripe.com/test/apikeys'
    );
    process.exit(1);
  }

  const webhookUrl = resolveWebhookUrl();
  const stripe = new Stripe(key, { apiVersion: Stripe.API_VERSION });

  const existing = await stripe.webhookEndpoints.list({ limit: 100 });
  const dup = existing.data.find((w) => w.url === webhookUrl);
  if (dup) {
    console.log(`A webhook already exists for ${webhookUrl} (id: ${dup.id}).`);
    console.log(
      'Signing secrets are only shown once at creation. Delete this endpoint in the Stripe Dashboard or use a different URL, then re-run.'
    );
    process.exit(0);
  }

  const wh = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: STRIPE_EVENTS,
    description: 'nomnom (scripts/stripe-setup-webhook.mjs)',
  });

  console.log(`Created webhook endpoint ${wh.id} → ${webhookUrl}`);
  console.log('');
  console.log('Add to .env.local:');
  console.log(`STRIPE_WEBHOOK_SECRET=${wh.secret}`);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
