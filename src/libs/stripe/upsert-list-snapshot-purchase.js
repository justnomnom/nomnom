import { supabaseAdminClient } from 'src/libs/supabase/supabase-admin';

import { buildListSnapshotPurchaseRow } from './list-snapshot-purchase-row';

/**
 * Idempotent insert for a paid list snapshot (Stripe Checkout `mode: payment`).
 * Used by the Stripe webhook and by the post-checkout verify endpoint so the UI
 * can unlock immediately even if `checkout.session.completed` is still in flight.
 *
 * @param {{
 *   listId: string,
 *   buyerUserId: string,
 *   paymentIntentId: string,
 *   stripeConnectAccountId: string | null | undefined,
 *   amountCents: number,
 *   currency: string,
 *   capturedListItemIds?: string[] | null,
 * }} params
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function upsertListSnapshotPurchase({
  listId,
  buyerUserId,
  paymentIntentId,
  stripeConnectAccountId,
  amountCents,
  currency,
  capturedListItemIds,
}) {
  const built = buildListSnapshotPurchaseRow({
    listId,
    buyerUserId,
    paymentIntentId,
    stripeConnectAccountId,
    amountCents,
    currency,
    capturedListItemIds,
    purchasedAtIso: new Date().toISOString(),
  });
  if (!built.ok) {
    return built;
  }

  const { error } = await supabaseAdminClient.from('list_snapshot_purchases').upsert(built.row, {
    onConflict: 'stripe_payment_intent_id',
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
