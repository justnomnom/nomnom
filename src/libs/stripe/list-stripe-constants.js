/**
 * Supabase UUIDs in Stripe metadata and URL params — reject malformed input before DB/API calls.
 * (RFC 4122 variant bits; matches webhook validation.)
 */
export const STRIPE_FLOW_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** @param {unknown} value */
export function isWellFormedUuid(value) {
  return typeof value === 'string' && STRIPE_FLOW_UUID_RE.test(value);
}

/**
 * Free restaurants shown before the paid list paywall.
 * Server: `FREEMIUM_PREVIEW_COUNT`. Browser: `NEXT_PUBLIC_FREEMIUM_PREVIEW_COUNT` (keep in sync with server).
 * @param {unknown} raw
 * @returns {number}
 */
export function parseFreemiumPreviewCount(raw) {
  const n = parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

export const LIST_FREEMIUM_FREE_PLACES_COUNT = parseFreemiumPreviewCount(
  (typeof process !== 'undefined' && process.env.FREEMIUM_PREVIEW_COUNT) ||
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_FREEMIUM_PREVIEW_COUNT) ||
    '0'
);

/** Min monthly price for a paid list (cents). Default €3.99 */
export const LIST_PRICE_MIN_CENTS = parseInt(
  process.env.NEXT_PUBLIC_LIST_PRICE_MIN_CENTS || '399',
  10
);

/** Max monthly price (cents). Default €500 */
export const LIST_PRICE_MAX_CENTS = parseInt(
  process.env.NEXT_PUBLIC_LIST_PRICE_MAX_CENTS || '50000',
  10
);

export function getPlatformFeePercent() {
  const n = parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT || '10');
  if (!Number.isFinite(n)) return 10;
  return Math.min(100, Math.max(0, n));
}

/**
 * The creator's share of a gross amount, after the platform fee.
 *
 * Exists because `getPlatformFeePercent()` returns a **percent** (10) while the fee is
 * naturally applied as a **fraction** (0.1). `getCreatorListStats` previously kept its own
 * `const PLATFORM_FEE = 0.1`, which meant changing `STRIPE_PLATFORM_FEE_PERCENT` silently
 * desynced the revenue creators were shown from what they were actually charged — and a
 * careless fix would have been off by 100×. Keep the conversion in one place.
 *
 * @param {unknown} grossCents
 * @returns {number} net cents, rounded
 */
export function netCentsAfterPlatformFee(grossCents) {
  const gross = typeof grossCents === 'number' && Number.isFinite(grossCents) ? grossCents : 0;
  return Math.round(gross * (1 - getPlatformFeePercent() / 100));
}

/**
 * Stripe Tax code on snapshot Checkout `price_data.product_data` when `automatic_tax` is enabled.
 * Subscriptions use Dashboard Prices (product tax code already set); ad-hoc `price_data` must set this
 * or Stripe rejects session creation for many connected accounts without a preset tax code.
 * @see https://docs.stripe.com/tax/products-prices-tax-codes-tax-behavior
 */
export const LIST_SNAPSHOT_CHECKOUT_TAX_CODE =
  process.env.STRIPE_LIST_SNAPSHOT_TAX_CODE || 'txcd_10000000';

/**
 * Minimum Stripe one-time amount for snapshot checkout (cents).
 * Env mirrors monthly min naming for ops consistency.
 */
export const LIST_SNAPSHOT_MIN_UNIT_CENTS = (() => {
  const n = parseInt(
    process.env.NEXT_PUBLIC_LIST_SNAPSHOT_MIN_UNIT_CENTS ||
      process.env.LIST_SNAPSHOT_MIN_UNIT_CENTS ||
      '50',
    10
  );
  return Number.isFinite(n) && n > 0 ? n : 50;
})();

/**
 * Snapshot price = monthly subscription × this ratio (strictly less than monthly when possible).
 * Override with NEXT_PUBLIC_LIST_SNAPSHOT_PRICE_RATIO or LIST_SNAPSHOT_PRICE_RATIO (0–1 exclusive).
 */
export function getListSnapshotPriceRatio() {
  const raw =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_LIST_SNAPSHOT_PRICE_RATIO) ||
    (typeof process !== 'undefined' && process.env.LIST_SNAPSHOT_PRICE_RATIO) ||
    '0.45';
  const n = parseFloat(String(raw));
  if (!Number.isFinite(n) || n <= 0 || n >= 1) return 0.45;
  return n;
}

/**
 * One-time snapshot checkout amount from the list’s monthly subscription anchor.
 * @param {number | null | undefined} monthlyAmountCents
 * @returns {number | null}
 */
export function computeListSnapshotAmountCents(monthlyAmountCents) {
  const monthly = Math.round(Number(monthlyAmountCents));
  if (!Number.isFinite(monthly) || monthly <= 0) return null;

  const minUnit = LIST_SNAPSHOT_MIN_UNIT_CENTS;
  const upper = monthly - 1;
  if (upper < 1) return null;
  if (upper < minUnit) {
    return upper;
  }

  let snap = Math.round(monthly * getListSnapshotPriceRatio());
  snap = Math.min(upper, Math.max(minUnit, snap));
  if (snap === monthly) snap = upper;
  return snap;
}

export const STRIPE_CONNECT_DEFAULT_COUNTRY = process.env.STRIPE_CONNECT_DEFAULT_COUNTRY || 'PT';

export function assertPriceInBounds(cents) {
  const n = typeof cents === 'number' ? cents : parseInt(String(cents), 10);
  if (!Number.isFinite(n)) return { ok: false, error: 'invalid_price' };
  if (n < LIST_PRICE_MIN_CENTS || n > LIST_PRICE_MAX_CENTS)
    return { ok: false, error: 'price_out_of_bounds' };
  return { ok: true, cents: n };
}

/**
 * Checkout success/cancel return path. Only same-origin relative paths are kept
 * (open-redirect guard). Everything else falls back to the public list URL.
 *
 * @param {unknown} raw
 * @param {string} listId
 * @returns {string}
 */
export function sanitizeCheckoutReturnPath(raw, listId) {
  const rawReturnPath = typeof raw === 'string' ? raw.trim() : '';
  if (
    rawReturnPath.startsWith('/') &&
    !rawReturnPath.startsWith('//') &&
    !rawReturnPath.includes('://')
  ) {
    return rawReturnPath;
  }
  return `/lists/${listId}`;
}
