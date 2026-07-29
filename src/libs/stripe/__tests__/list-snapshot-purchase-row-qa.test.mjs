/**
 * Frontend QA — snapshot purchase row validation.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildListSnapshotPurchaseRow } from '../list-snapshot-purchase-row.js';

const LIST = '550e8400-e29b-41d4-a716-446655440000';
const BUYER = '660e8400-e29b-41d4-a716-446655440000';

test('buildListSnapshotPurchaseRow: happy path', () => {
  const out = buildListSnapshotPurchaseRow({
    listId: LIST,
    buyerUserId: BUYER,
    paymentIntentId: 'pi_123',
    stripeConnectAccountId: 'acct_1',
    amountCents: 199,
    currency: 'EUR',
    capturedListItemIds: ['a', 'b'],
    purchasedAtIso: '2024-01-01T00:00:00.000Z',
  });
  assert.equal(out.ok, true);
  assert.equal(out.row.currency, 'eur');
  assert.deepEqual(out.row.captured_list_item_ids, ['a', 'b']);
});

test('buildListSnapshotPurchaseRow: missing / invalid', () => {
  assert.equal(
    buildListSnapshotPurchaseRow({
      listId: '',
      buyerUserId: BUYER,
      paymentIntentId: 'pi',
      amountCents: 1,
      currency: 'eur',
      purchasedAtIso: 'x',
    }).error,
    'missing_fields'
  );
  assert.equal(
    buildListSnapshotPurchaseRow({
      listId: 'not-uuid',
      buyerUserId: BUYER,
      paymentIntentId: 'pi',
      amountCents: 1,
      currency: 'eur',
      purchasedAtIso: 'x',
    }).error,
    'invalid_uuid'
  );
});

test('buildListSnapshotPurchaseRow: omits captured ids when not array', () => {
  const out = buildListSnapshotPurchaseRow({
    listId: LIST,
    buyerUserId: BUYER,
    paymentIntentId: 'pi',
    stripeConnectAccountId: null,
    amountCents: 'nope',
    currency: '',
    capturedListItemIds: null,
    purchasedAtIso: '2024-01-01T00:00:00.000Z',
  });
  assert.equal(out.ok, true);
  assert.equal(out.row.amount_cents, 0);
  assert.equal(out.row.currency, 'eur');
  assert.equal('captured_list_item_ids' in out.row, false);
});
