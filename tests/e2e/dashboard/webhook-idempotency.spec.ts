import crypto from 'crypto';

import { expect, test } from '@playwright/test';

import { loadE2EEnv } from '../load-env';
import { dashboardTestsDisabled } from '../support/skip-dashboard';
import { hasServiceRoleCredentials } from '../support/service-role';
import { getServiceRoleClient } from '../support/supabase-service';
import {
  deleteList,
  createOwnedList,
  createSeededUser,
  deleteSeededUser,
  seedCreatorConnect,
  deleteCustomerRow,
  deleteListAccessRows,
  getSnapshotPurchaseRow,
} from '../support/seed';
import { E2E_DASHBOARD_AUTH_SETUP_HINT } from '../support/test-credentials';

/**
 * TEST-PLAN §5 B13 — webhook idempotency: replaying the same Stripe event must not create
 * duplicate purchase rows. The route keys processed events in `stripe_events` and answers
 * replays with `{ received: true, duplicate: true }` before re-running any handler.
 *
 * No live Stripe needed: `checkout.session.completed` for a snapshot purchase is processed
 * purely from the event payload (recordSnapshotPurchase never calls the Stripe API), and the
 * event is signed locally with the same STRIPE_WEBHOOK_SECRET the dev server verifies with
 * (Stripe scheme: `stripe-signature: t=<unix>,v1=HMAC_SHA256(secret, "<t>.<payload>")`).
 * Skips when the secret isn't configured.
 */

function signStripePayload(payload: string, secret: string): string {
  const t = Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  return `t=${t},v1=${v1}`;
}

test.describe('stripe webhook — idempotent event replay (B13)', () => {
  test.beforeEach(({}, testInfo) => {
    if (dashboardTestsDisabled()) {
      testInfo.skip(true, E2E_DASHBOARD_AUTH_SETUP_HINT);
    }
    if (!hasServiceRoleCredentials()) {
      testInfo.skip(true, 'Service role needed to seed rows and assert purchases');
    }
  });

  test('replaying checkout.session.completed does not duplicate the snapshot purchase', async ({
    request,
  }) => {
    test.setTimeout(180_000);
    loadE2EEnv();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    test.skip(!secret, 'STRIPE_WEBHOOK_SECRET not set — cannot sign a webhook event');
    if (!secret) return;

    const admin = getServiceRoleClient();
    const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const creator = await createSeededUser('e2ewhcreator');
    const buyer = await createSeededUser('e2ewhbuyer');
    const listId = await createOwnedList(creator.id, {
      monetized: true,
      name: `E2E Webhook ${stamp}`,
    });

    const eventId = `evt_e2e_${stamp}`;
    const paymentIntentId = `pi_e2e_${stamp}`;
    const payload = JSON.stringify({
      id: eventId,
      object: 'event',
      type: 'checkout.session.completed',
      account: `acct_e2e_${stamp}`,
      data: {
        object: {
          id: `cs_e2e_${stamp}`,
          object: 'checkout.session',
          mode: 'payment',
          payment_intent: paymentIntentId,
          amount_total: 250,
          currency: 'eur',
          metadata: {
            purchase_type: 'snapshot',
            list_id: listId,
            buyer_user_id: buyer.id,
          },
        },
      },
    });
    const signature = signStripePayload(payload, secret);
    const post = () =>
      request.post('/api/webhooks/stripe', {
        headers: { 'content-type': 'application/json', 'stripe-signature': signature },
        data: payload,
      });

    const countPurchases = async (): Promise<number> => {
      const { count } = await admin
        .from('list_snapshot_purchases')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', listId)
        .eq('buyer_user_id', buyer.id);
      return count ?? 0;
    };

    try {
      // First delivery: processed, purchase row written, event id recorded.
      const first = await post();
      test.skip(first.status() === 503, 'Stripe webhook env not configured for this environment');
      expect(first.status()).toBe(200);
      const firstBody = await first.json();
      expect(firstBody.received).toBe(true);
      expect(firstBody.duplicate).toBeUndefined();

      await expect
        .poll(
          async () => (await getSnapshotPurchaseRow(listId, buyer.id))?.stripe_payment_intent_id,
          { timeout: 30_000, message: 'snapshot purchase row not written by the webhook' }
        )
        .toBe(paymentIntentId);
      expect(await countPurchases()).toBe(1);

      // Replay the exact same signed event: acknowledged as duplicate, no second row.
      const second = await post();
      expect(second.status()).toBe(200);
      const secondBody = await second.json();
      expect(secondBody.received).toBe(true);
      expect(secondBody.duplicate).toBe(true);

      expect(await countPurchases()).toBe(1);
      expect((await getSnapshotPurchaseRow(listId, buyer.id))?.stripe_payment_intent_id).toBe(
        paymentIntentId
      );
    } finally {
      await deleteListAccessRows(listId);
      await admin.from('stripe_events').delete().eq('id', eventId);
      await deleteList(listId);
      await deleteSeededUser(buyer.id);
      await deleteSeededUser(creator.id);
    }
  });

  // TEST-PLAN §4 C2 — account.updated flips the creator's Connect readiness flags. The
  // handler updates `customers` by stripe_connect_account_id straight from the payload,
  // so the same local-signing technique applies.
  test('account.updated flips stripe_connect charges/payouts flags on the customer row', async ({
    request,
  }) => {
    test.setTimeout(180_000);
    loadE2EEnv();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    test.skip(!secret, 'STRIPE_WEBHOOK_SECRET not set — cannot sign a webhook event');
    if (!secret) return;

    const admin = getServiceRoleClient();
    const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const creator = await createSeededUser('e2eacct');
    const acctId = `acct_e2e_${stamp}`;
    await seedCreatorConnect(creator.id, acctId, { chargesEnabled: false, payoutsEnabled: false });

    const eventId = `evt_e2e_acct_${stamp}`;
    const payload = JSON.stringify({
      id: eventId,
      object: 'event',
      type: 'account.updated',
      account: acctId,
      data: {
        object: {
          id: acctId,
          object: 'account',
          charges_enabled: true,
          payouts_enabled: true,
        },
      },
    });

    try {
      const res = await request.post('/api/webhooks/stripe', {
        headers: {
          'content-type': 'application/json',
          'stripe-signature': signStripePayload(payload, secret),
        },
        data: payload,
      });
      test.skip(res.status() === 503, 'Stripe webhook env not configured for this environment');
      expect(res.status()).toBe(200);
      expect((await res.json()).received).toBe(true);

      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from('customers')
              .select('stripe_connect_charges_enabled, stripe_connect_payouts_enabled')
              .eq('id', creator.id)
              .maybeSingle();
            return {
              charges: data?.stripe_connect_charges_enabled ?? null,
              payouts: data?.stripe_connect_payouts_enabled ?? null,
            };
          },
          { timeout: 30_000, message: 'connect flags not flipped by account.updated' }
        )
        .toEqual({ charges: true, payouts: true });
    } finally {
      await admin.from('stripe_events').delete().eq('id', eventId);
      await deleteCustomerRow(creator.id);
      await deleteSeededUser(creator.id);
    }
  });
});
