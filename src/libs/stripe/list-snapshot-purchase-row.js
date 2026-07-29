// eslint-disable-next-line import/extensions -- Node ESM resolves local modules with explicit extension
import { isWellFormedUuid } from './list-stripe-constants.js';

/**
 * Validates inputs and builds the row payload for `list_snapshot_purchases` upsert.
 *
 * @param {{
 *   listId: string,
 *   buyerUserId: string,
 *   paymentIntentId: string,
 *   stripeConnectAccountId: string | null | undefined,
 *   amountCents: number,
 *   currency: string,
 *   capturedListItemIds?: string[] | null,
 *   purchasedAtIso: string,
 * }} params
 * @returns {{ ok: true, row: Record<string, unknown> } | { ok: false, error: string }}
 */
export function buildListSnapshotPurchaseRow({
  listId,
  buyerUserId,
  paymentIntentId,
  stripeConnectAccountId,
  amountCents,
  currency,
  capturedListItemIds,
  purchasedAtIso,
}) {
  if (!listId || !buyerUserId || !paymentIntentId) {
    return { ok: false, error: 'missing_fields' };
  }
  if (!isWellFormedUuid(listId) || !isWellFormedUuid(buyerUserId)) {
    return { ok: false, error: 'invalid_uuid' };
  }

  const row = {
    list_id: listId,
    buyer_user_id: buyerUserId,
    stripe_payment_intent_id: paymentIntentId,
    stripe_connect_account_id: stripeConnectAccountId ?? null,
    amount_cents: typeof amountCents === 'number' ? amountCents : 0,
    currency: (currency && String(currency).toLowerCase()) || 'eur',
    purchased_at: purchasedAtIso,
  };
  if (Array.isArray(capturedListItemIds)) {
    row.captured_list_item_ids = capturedListItemIds;
  }
  return { ok: true, row };
}
