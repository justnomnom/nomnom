/**
 * Dual-perspective payment QA:
 *  - Buyer (subscribe / snapshot purchase / unlock / checkout errors)
 *  - Creator/seller (Connect readiness, price bounds, platform fee, capture row)
 */
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import {
  LIST_FREEMIUM_FREE_PLACES_COUNT,
  LIST_PRICE_MAX_CENTS,
  LIST_PRICE_MIN_CENTS,
  assertPriceInBounds,
  computeListSnapshotAmountCents,
  getListSnapshotPriceRatio,
  getPlatformFeePercent,
  isWellFormedUuid,
  parseFreemiumPreviewCount,
} from '../list-stripe-constants.js';
import { buildListSnapshotPurchaseRow } from '../list-snapshot-purchase-row.js';
import { mapListItemRowsToIds } from '../map-list-item-rows-to-ids.js';
import { mergeSnapshotPurchaseCapturedItemIds } from '../../lists/merge-snapshot-purchase-captured-item-ids.js';
import {
  STRIPE_CHECKOUT_ERROR_I18N,
  translateStripeCheckoutError,
} from '../../../utils/stripe-checkout-errors.js';
import {
  CREATOR_SUBSCRIPTION_ERROR_I18N,
  translateCreatorSubscriptionError,
} from '../../../utils/creator-subscription-errors.js';
import { getPaywallRelativeDate, PAYWALL_RECENCY_DAYS } from '../../paywall/paywall-recency.js';

const LIST = '550e8400-e29b-41d4-a716-446655440000';
const BUYER = '660e8400-e29b-41d4-a716-446655440000';
const t = (key) => key;

let savedEnv;
beforeEach(() => {
  savedEnv = {
    STRIPE_PLATFORM_FEE_PERCENT: process.env.STRIPE_PLATFORM_FEE_PERCENT,
    NEXT_PUBLIC_LIST_SNAPSHOT_PRICE_RATIO: process.env.NEXT_PUBLIC_LIST_SNAPSHOT_PRICE_RATIO,
    LIST_SNAPSHOT_PRICE_RATIO: process.env.LIST_SNAPSHOT_PRICE_RATIO,
  };
  delete process.env.STRIPE_PLATFORM_FEE_PERCENT;
  delete process.env.NEXT_PUBLIC_LIST_SNAPSHOT_PRICE_RATIO;
  delete process.env.LIST_SNAPSHOT_PRICE_RATIO;
});
afterEach(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v !== undefined) process.env[k] = v;
    else delete process.env[k];
  }
});

// ---------------------------------------------------------------------------
// BUYER perspective — checkout errors, snapshot price, unlock capture
// ---------------------------------------------------------------------------

test('buyer: every checkout error code maps to i18n (no silent gaps)', () => {
  const buyerFacing = [
    'unauthorized',
    'missing_list_id',
    'invalid_list_id',
    'list_not_monetized',
    'cannot_subscribe_own_list',
    'already_subscribed',
    'already_purchased',
    'creator_not_ready',
    'checkout_session_failed',
    'no_session_url',
    'stripe_not_configured',
    'checkout_failed',
  ];
  for (const code of buyerFacing) {
    assert.ok(STRIPE_CHECKOUT_ERROR_I18N[code], `missing i18n for ${code}`);
    assert.equal(translateStripeCheckoutError(t, code), STRIPE_CHECKOUT_ERROR_I18N[code]);
  }
  assert.equal(translateStripeCheckoutError(t, null), 'pages.lists.paid_checkout_error_generic');
});

test('buyer: snapshot amount always strictly cheaper than monthly when valid', () => {
  for (const monthly of [399, 999, 2500, 10_000]) {
    const snap = computeListSnapshotAmountCents(monthly);
    assert.ok(typeof snap === 'number' && snap > 0, `snap for ${monthly}`);
    assert.ok(snap < monthly, `snap ${snap} must be < monthly ${monthly}`);
  }
  assert.equal(computeListSnapshotAmountCents(0), null);
  assert.equal(computeListSnapshotAmountCents(null), null);
  assert.equal(computeListSnapshotAmountCents('x'), null);
});

test('buyer: purchase row rejects bad ids; accepts buyer+list UUIDs', () => {
  assert.equal(
    buildListSnapshotPurchaseRow({
      listId: LIST,
      buyerUserId: 'not-uuid',
      paymentIntentId: 'pi_1',
      amountCents: 100,
      currency: 'eur',
      purchasedAtIso: '2026-01-01T00:00:00.000Z',
    }).error,
    'invalid_uuid'
  );
  assert.equal(
    buildListSnapshotPurchaseRow({
      listId: LIST,
      buyerUserId: BUYER,
      paymentIntentId: '',
      amountCents: 100,
      currency: 'eur',
      purchasedAtIso: '2026-01-01T00:00:00.000Z',
    }).error,
    'missing_fields'
  );
  const ok = buildListSnapshotPurchaseRow({
    listId: LIST,
    buyerUserId: BUYER,
    paymentIntentId: 'pi_ok',
    stripeConnectAccountId: 'acct_seller',
    amountCents: 180,
    currency: 'EUR',
    capturedListItemIds: ['item-1', 'item-2'],
    purchasedAtIso: '2026-01-01T00:00:00.000Z',
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.row.buyer_user_id, BUYER);
  assert.equal(ok.row.list_id, LIST);
  assert.equal(ok.row.stripe_connect_account_id, 'acct_seller');
  assert.deepEqual(ok.row.captured_list_item_ids, ['item-1', 'item-2']);
});

test('buyer unlock: merge captured item ids across purchases; legacy null → show-all', () => {
  assert.equal(mergeSnapshotPurchaseCapturedItemIds(null), null);
  assert.equal(
    mergeSnapshotPurchaseCapturedItemIds([{ captured_list_item_ids: null }]),
    null
  );
  assert.deepEqual(
    mergeSnapshotPurchaseCapturedItemIds([
      { captured_list_item_ids: ['a', 'b'] },
      { captured_list_item_ids: ['b', 'c'] },
    ]),
    ['a', 'b', 'c']
  );
});

test('buyer unlock: map list item rows → ids (null-safe)', () => {
  assert.deepEqual(mapListItemRowsToIds(null), []);
  assert.deepEqual(mapListItemRowsToIds([{ id: 'a' }, { id: null }, null]), ['a']);
});

test('buyer paywall: recent update copy within 90 days; stale → null', () => {
  assert.equal(PAYWALL_RECENCY_DAYS, 90);
  const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const stale = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(getPaywallRelativeDate(recent, () => '2 days ago'), '2 days ago');
  assert.equal(getPaywallRelativeDate(stale, () => 'x'), null);
  assert.equal(getPaywallRelativeDate(null, () => 'x'), null);
});

test('buyer freemium: free preview count is a positive finite default', () => {
  assert.ok(Number.isFinite(LIST_FREEMIUM_FREE_PLACES_COUNT));
  assert.ok(LIST_FREEMIUM_FREE_PLACES_COUNT > 0);
  assert.equal(parseFreemiumPreviewCount('7'), 7);
  assert.equal(parseFreemiumPreviewCount('0'), 5);
});

// ---------------------------------------------------------------------------
// CREATOR / SELLER perspective — pricing, fees, Connect, subscription mgmt
// ---------------------------------------------------------------------------

test('creator: list price bounds reject below min / above max', () => {
  assert.deepEqual(assertPriceInBounds(LIST_PRICE_MIN_CENTS - 1), {
    ok: false,
    error: 'price_out_of_bounds',
  });
  assert.deepEqual(assertPriceInBounds(LIST_PRICE_MAX_CENTS + 1), {
    ok: false,
    error: 'price_out_of_bounds',
  });
  assert.deepEqual(assertPriceInBounds(LIST_PRICE_MIN_CENTS), {
    ok: true,
    cents: LIST_PRICE_MIN_CENTS,
  });
  assert.deepEqual(assertPriceInBounds('abc'), { ok: false, error: 'invalid_price' });
});

test('creator: platform fee clamped 0–100; snapshot ratio in (0,1)', () => {
  process.env.STRIPE_PLATFORM_FEE_PERCENT = '999';
  assert.equal(getPlatformFeePercent(), 100);
  process.env.STRIPE_PLATFORM_FEE_PERCENT = '-1';
  assert.equal(getPlatformFeePercent(), 0);
  process.env.STRIPE_PLATFORM_FEE_PERCENT = '15';
  assert.equal(getPlatformFeePercent(), 15);

  const ratio = getListSnapshotPriceRatio();
  assert.ok(ratio > 0 && ratio < 1);
  process.env.LIST_SNAPSHOT_PRICE_RATIO = '1.5';
  assert.equal(getListSnapshotPriceRatio(), 0.45);
});

test('creator: Connect account recorded on snapshot purchase (seller payout path)', () => {
  const withConnect = buildListSnapshotPurchaseRow({
    listId: LIST,
    buyerUserId: BUYER,
    paymentIntentId: 'pi_2',
    stripeConnectAccountId: 'acct_creator',
    amountCents: 200,
    currency: 'eur',
    purchasedAtIso: '2026-02-01T00:00:00.000Z',
  });
  assert.equal(withConnect.row.stripe_connect_account_id, 'acct_creator');

  const without = buildListSnapshotPurchaseRow({
    listId: LIST,
    buyerUserId: BUYER,
    paymentIntentId: 'pi_3',
    stripeConnectAccountId: undefined,
    amountCents: 200,
    currency: 'eur',
    purchasedAtIso: '2026-02-01T00:00:00.000Z',
  });
  assert.equal(without.row.stripe_connect_account_id, null);
});

test('creator subscription mgmt: every error code maps (cancel / load / forbidden)', () => {
  const creatorFacing = [
    'unauthorized',
    'load_failed',
    'stripe_not_configured',
    'invalid_id',
    'not_found',
    'forbidden',
    'not_cancellable',
    'invalid_row',
    'stripe_cancel_failed',
  ];
  for (const code of creatorFacing) {
    assert.ok(CREATOR_SUBSCRIPTION_ERROR_I18N[code], `missing i18n for ${code}`);
    assert.equal(translateCreatorSubscriptionError(t, code), CREATOR_SUBSCRIPTION_ERROR_I18N[code]);
  }
});

test('creator: UUID gate rejects garbage before Stripe/DB writes', () => {
  assert.equal(isWellFormedUuid(LIST), true);
  assert.equal(isWellFormedUuid(BUYER), true);
  assert.equal(isWellFormedUuid(''), false);
  assert.equal(isWellFormedUuid(null), false);
  assert.equal(isWellFormedUuid('550e8400-e29b-61d4-a716-446655440000'), false);
});

// ---------------------------------------------------------------------------
// BOTH — money math consistency (buyer pays what seller listed)
// ---------------------------------------------------------------------------

test('both: snapshot of creator monthly price stays within Stripe min unit when possible', () => {
  const monthly = LIST_PRICE_MIN_CENTS;
  const snap = computeListSnapshotAmountCents(monthly);
  assert.ok(snap != null);
  assert.ok(snap < monthly);
  assert.ok(snap >= 1);
});
