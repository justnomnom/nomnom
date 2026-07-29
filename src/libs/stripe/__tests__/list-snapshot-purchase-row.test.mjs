/**
 * Run: node --test src/libs/stripe/__tests__/list-snapshot-purchase-row.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildListSnapshotPurchaseRow } from '../list-snapshot-purchase-row.js';

const LIST = 'aaaaaaaa-bbbb-5ccc-bbbb-aaaaaaaaaaaa';
const BUYER = 'bbbbbbbb-bbbb-5aaa-bbbb-bbbbbbbbbbbb';

test('missing fields', () => {
  assert.deepEqual(
    buildListSnapshotPurchaseRow({
      listId: '',
      buyerUserId: BUYER,
      paymentIntentId: 'pi_x',
      stripeConnectAccountId: null,
      amountCents: 100,
      currency: 'eur',
      purchasedAtIso: '2026-01-01T00:00:00.000Z',
    }),
    { ok: false, error: 'missing_fields' }
  );
});

test('invalid uuid', () => {
  assert.deepEqual(
    buildListSnapshotPurchaseRow({
      listId: 'not-a-uuid',
      buyerUserId: BUYER,
      paymentIntentId: 'pi_x',
      stripeConnectAccountId: null,
      amountCents: 100,
      currency: 'eur',
      purchasedAtIso: '2026-01-01T00:00:00.000Z',
    }),
    { ok: false, error: 'invalid_uuid' }
  );
});

test('valid row with defaults and captured ids', () => {
  const ts = '2026-05-14T12:00:00.000Z';
  const r = buildListSnapshotPurchaseRow({
    listId: LIST,
    buyerUserId: BUYER,
    paymentIntentId: 'pi_123',
    stripeConnectAccountId: 'acct_abc',
    amountCents: 199,
    currency: 'EUR',
    capturedListItemIds: ['i1', 'i2'],
    purchasedAtIso: ts,
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.row, {
    list_id: LIST,
    buyer_user_id: BUYER,
    stripe_payment_intent_id: 'pi_123',
    stripe_connect_account_id: 'acct_abc',
    amount_cents: 199,
    currency: 'eur',
    purchased_at: ts,
    captured_list_item_ids: ['i1', 'i2'],
  });
});

test('non-array capturedListItemIds is omitted from row', () => {
  const ts = '2026-05-14T12:00:00.000Z';
  const r = buildListSnapshotPurchaseRow({
    listId: LIST,
    buyerUserId: BUYER,
    paymentIntentId: 'pi_123',
    stripeConnectAccountId: undefined,
    amountCents: 50,
    currency: '',
    capturedListItemIds: null,
    purchasedAtIso: ts,
  });
  assert.equal(r.ok, true);
  assert.ok(!('captured_list_item_ids' in r.row));
  assert.equal(r.row.currency, 'eur');
  assert.equal(r.row.amount_cents, 50);
  assert.equal(r.row.stripe_connect_account_id, null);
});

test('non-number amountCents becomes 0', () => {
  const ts = '2026-05-14T12:00:00.000Z';
  const r = buildListSnapshotPurchaseRow({
    listId: LIST,
    buyerUserId: BUYER,
    paymentIntentId: 'pi_123',
    stripeConnectAccountId: null,
    amountCents: 'oops',
    currency: 'usd',
    purchasedAtIso: ts,
  });
  assert.equal(r.ok, true);
  assert.equal(r.row.amount_cents, 0);
  assert.equal(r.row.currency, 'usd');
});
