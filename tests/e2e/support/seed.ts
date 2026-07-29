import { createServerClient } from '@supabase/ssr';

import { loadE2EEnv } from '../load-env';

import { getServiceRoleClient } from './supabase-service';

/**
 * Service-role seed helpers for mechanism tests. Everything created here is namespaced
 * with an `e2e` prefix + timestamp and torn down by the spec that created it.
 */

export type SeededUser = { id: string; email: string; username: string; password: string };

/** Minimal Playwright storage-state shape (cookies only) — see `browser.newContext({ storageState })`. */
export type PlaywrightStorageState = {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Lax' | 'Strict' | 'None';
  }>;
  origins: [];
};

/**
 * Create a confirmed auth user and ensure a public.users row with a known username
 * (needed so the collaboration invite can resolve the handle). Returns credentials.
 */
export async function createSeededUser(
  prefix = 'e2ecollab',
  opts: { emailDomain?: string } = {}
): Promise<SeededUser> {
  const admin = getServiceRoleClient();
  const stamp = Date.now().toString(36);
  const username = `${prefix}${stamp}`.toLowerCase().slice(0, 24);
  // `e2e.local` is fine for admin-created users, but Supabase's public auth endpoints
  // (e.g. resetPasswordForEmail) reject non-routable TLDs — pass a routable domain when a
  // test drives those endpoints for the seeded user.
  const email = `${username}@${opts.emailDomain ?? 'e2e.local'}`;
  const password = `E2e!${stamp}Pw`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: username },
  });
  if (error || !data.user) throw new Error(`createSeededUser failed: ${error?.message}`);
  const id = data.user.id;

  // A DB trigger usually inserts public.users on signup; upsert to guarantee the row + username.
  const { error: upErr } = await admin
    .from('users')
    .upsert({ id, email, username }, { onConflict: 'id' });
  if (upErr) throw new Error(`seed users upsert failed: ${upErr.message}`);

  return { id, email, username, password };
}

export async function deleteSeededUser(id: string): Promise<void> {
  const admin = getServiceRoleClient();
  await admin.from('users').delete().eq('id', id);
  await admin.auth.admin.deleteUser(id).catch(() => {});
}

/**
 * Mark a seeded user as onboarding-complete with NO saved home locality. Lets a dashboard spec
 * reach `/dashboard/discover` (the layout redirects incomplete users to `/onboarding`) while the
 * server still hits the no-home-location path (`home_locality_id = null` → provisional/fallback
 * market resolution + client geolocation gate).
 */
export async function completeOnboardingWithoutHome(id: string): Promise<void> {
  const admin = getServiceRoleClient();
  const { error } = await admin
    .from('users')
    .update({ onboarding_completed_at: new Date().toISOString(), home_locality_id: null })
    .eq('id', id);
  if (error) throw new Error(`completeOnboardingWithoutHome failed: ${error.message}`);
}

/** Insert a list_items row directly (add a restaurant to a list). */
export async function seedListItem(
  listId: string,
  restaurantId: string,
  addedBy: string
): Promise<void> {
  const admin = getServiceRoleClient();
  const { error } = await admin
    .from('list_items')
    .upsert(
      { list_id: listId, restaurant_id: restaurantId, sort_order: 0, added_by: addedBy },
      { onConflict: 'list_id,restaurant_id' }
    );
  if (error) throw new Error(`seedListItem failed: ${error.message}`);
}

/**
 * Insert a `restaurants` row with a known name so a paywall/gating spec can assert which places a
 * viewer sees by name. `municipality_id` is NOT NULL; pass one from {@link getAnyMunicipalityId}.
 * Torn down with {@link deleteRestaurants}.
 *
 * `municipality_id` holds a MUNICIPALITY-tier `cities` row (`is_municipality = true`) — a
 * different tier from `users.home_locality_id`. The 20260722126000 rename to `locality_id`
 * conflated the two and was reverted in 20260724120000.
 */
export async function seedRestaurant(name: string, municipalityId: string): Promise<string> {
  const admin = getServiceRoleClient();
  const { data, error } = await admin
    .from('restaurants')
    .insert({ name, municipality_id: municipalityId })
    .select('id')
    .single();
  if (error || !data) throw new Error(`seedRestaurant failed: ${error?.message}`);
  return data.id as string;
}

/** Delete seeded `restaurants` rows (call after the list + its items are gone). Safe if absent. */
export async function deleteRestaurants(ids: string[]): Promise<void> {
  const clean = [...new Set(ids.filter(Boolean))];
  if (clean.length === 0) return;
  const admin = getServiceRoleClient();
  await admin.from('restaurants').delete().in('id', clean);
}

/**
 * Insert a list_items row and return its id (needed to build a snapshot's `captured_list_item_ids`
 * and to assert recency ordering). Optionally backdate `created_at` so a list has items of varying
 * recency — the freemium gate orders by `created_at desc`.
 */
export async function seedListItemReturningId(
  listId: string,
  restaurantId: string,
  addedBy: string,
  opts: { createdAt?: string; sortOrder?: number } = {}
): Promise<string> {
  const admin = getServiceRoleClient();
  const row: Record<string, unknown> = {
    list_id: listId,
    restaurant_id: restaurantId,
    sort_order: opts.sortOrder ?? 0,
    added_by: addedBy,
  };
  if (opts.createdAt) row.created_at = opts.createdAt;
  const { data, error } = await admin.from('list_items').insert(row).select('id').single();
  if (error || !data) throw new Error(`seedListItemReturningId failed: ${error?.message}`);
  return data.id as string;
}

/**
 * Mark a list published so anonymous share-link viewers can read it (see `lists.published_at`), and
 * stamp `list_updated_at` to now so the paywall recency label (`getPaywallRelativeDate`, < 90 days)
 * renders — i.e. this exercises `src/libs/paywall/paywall-recency.js` on the public page.
 */
export async function publishList(listId: string): Promise<void> {
  const admin = getServiceRoleClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from('lists')
    .update({ published_at: now, list_updated_at: now })
    .eq('id', listId);
  if (error) throw new Error(`publishList failed: ${error.message}`);
}

/**
 * Create a list owned by `ownerId` and (optionally) mark it monetized. Monetization is set
 * at the DB level only — by default this does not create real Stripe objects, so it exercises
 * access control and rendering, not live checkout.
 *
 * Pass a real `stripePriceId` (from `npm run stripe:e2e:setup`) to point the list at a live
 * Stripe test price so the checkout happy path actually reaches Stripe.
 */
export async function createOwnedList(
  ownerId: string,
  opts: {
    name?: string;
    visibility?: string;
    monetized?: boolean;
    stripePriceId?: string;
    monthlyAmountCents?: number;
    currency?: string;
  } = {}
): Promise<string> {
  const admin = getServiceRoleClient();
  const row: Record<string, unknown> = {
    user_id: ownerId,
    name: opts.name ?? `E2E Seeded ${Date.now()}`,
    // A paid list must be subscriber-visible (DB check `lists_paid_requires_subscriber_visibility`).
    visibility: opts.visibility ?? (opts.monetized ? 'public_subscribers' : 'public'),
  };
  if (opts.monetized) {
    row.paid_access_enabled = true;
    row.monthly_amount_cents = opts.monthlyAmountCents ?? 500;
    row.currency = opts.currency ?? 'eur';
    // Real Stripe price when provided; otherwise a fake id (enough for guard tests only).
    row.stripe_price_id = opts.stripePriceId ?? `price_e2e_${Date.now()}`;
  }
  const { data, error } = await admin.from('lists').insert(row).select('id').single();
  if (error || !data) throw new Error(`createOwnedList failed: ${error?.message}`);
  return data.id as string;
}

export async function deleteList(listId: string): Promise<void> {
  const admin = getServiceRoleClient();
  await admin.from('list_items').delete().eq('list_id', listId);
  await admin.from('lists').delete().eq('id', listId);
}

/** Best-effort teardown for a sponsored placement row created during a test. */
export async function deleteSponsoredPlacement(id: string): Promise<void> {
  if (!id) return;
  const admin = getServiceRoleClient();
  await admin.from('sponsored_restaurant_placements').delete().eq('id', id);
}

/**
 * Upsert the creator's `customers` row so the checkout route and paywall RPC see a real,
 * charges-enabled Stripe Connect account. Without this the checkout route returns
 * `creator_not_ready` before Stripe is ever contacted.
 */
export async function seedCreatorConnect(
  userId: string,
  connectAccountId: string,
  opts: { chargesEnabled?: boolean; payoutsEnabled?: boolean } = {}
): Promise<void> {
  const admin = getServiceRoleClient();
  const { error } = await admin.from('customers').upsert(
    {
      id: userId,
      stripe_connect_account_id: connectAccountId,
      stripe_connect_charges_enabled: opts.chargesEnabled ?? true,
      stripe_connect_payouts_enabled: opts.payoutsEnabled ?? true,
    },
    { onConflict: 'id' }
  );
  if (error) throw new Error(`seedCreatorConnect failed: ${error.message}`);
}

/** Remove a seeded customers row (creator Connect linkage). Safe to call if absent. */
export async function deleteCustomerRow(userId: string): Promise<void> {
  const admin = getServiceRoleClient();
  await admin.from('customers').delete().eq('id', userId);
}

/**
 * Read the subscription access row a money-path test asserts on. Uses the service role so it is
 * not subject to RLS — reflects exactly what the webhook persisted.
 */
export async function getListSubscriptionRow(
  listId: string,
  subscriberUserId: string
): Promise<{ status: string; stripe_subscription_id: string | null } | null> {
  const admin = getServiceRoleClient();
  const { data, error } = await admin
    .from('list_subscriptions')
    .select('status, stripe_subscription_id')
    .eq('list_id', listId)
    .eq('subscriber_user_id', subscriberUserId)
    .maybeSingle();
  if (error) throw new Error(`getListSubscriptionRow failed: ${error.message}`);
  return data ?? null;
}

/** Read the snapshot purchase row (written by the verify-snapshot route or the webhook). */
export async function getSnapshotPurchaseRow(
  listId: string,
  buyerUserId: string
): Promise<{ stripe_payment_intent_id: string | null } | null> {
  const admin = getServiceRoleClient();
  const { data, error } = await admin
    .from('list_snapshot_purchases')
    .select('stripe_payment_intent_id')
    .eq('list_id', listId)
    .eq('buyer_user_id', buyerUserId)
    .maybeSingle();
  if (error) throw new Error(`getSnapshotPurchaseRow failed: ${error.message}`);
  return data ?? null;
}

/**
 * Insert a `list_subscriptions` access row directly — grants recurring (subscription) access to a
 * paid list WITHOUT touching Stripe, so a gating spec can exercise the unlocked path offline. The
 * Stripe id columns are NOT NULL + unique, so they get stamped placeholder values. `status` must be
 * `active`/`trialing` for `fetchListPage` to treat the viewer as a subscriber. Torn down with
 * {@link deleteListAccessRows}.
 */
export async function seedListSubscription(
  listId: string,
  subscriberUserId: string,
  opts: { status?: string; connectAccountId?: string } = {}
): Promise<void> {
  const admin = getServiceRoleClient();
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const { error } = await admin.from('list_subscriptions').upsert(
    {
      list_id: listId,
      subscriber_user_id: subscriberUserId,
      stripe_connect_account_id: opts.connectAccountId ?? `acct_e2e_${stamp}`,
      stripe_customer_id: `cus_e2e_${stamp}`,
      stripe_subscription_id: `sub_e2e_${stamp}`,
      status: opts.status ?? 'active',
    },
    { onConflict: 'list_id,subscriber_user_id' }
  );
  if (error) throw new Error(`seedListSubscription failed: ${error.message}`);
}

/**
 * Insert a `list_snapshot_purchases` access row directly — grants one-time (snapshot) access. The
 * buyer sees exactly the list_items whose ids are in `capturedListItemIds` (see
 * `merge-snapshot-purchase-captured-item-ids`); pass `null` for a legacy row (buyer sees the whole
 * live list). `stripe_payment_intent_id` is unique + NOT NULL, so it is stamped. Torn down with
 * {@link deleteListAccessRows}.
 */
export async function seedListSnapshotPurchase(
  listId: string,
  buyerUserId: string,
  capturedListItemIds: string[] | null,
  opts: { purchasedAt?: string; amountCents?: number; currency?: string } = {}
): Promise<void> {
  const admin = getServiceRoleClient();
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const { error } = await admin.from('list_snapshot_purchases').insert({
    list_id: listId,
    buyer_user_id: buyerUserId,
    stripe_payment_intent_id: `pi_e2e_${stamp}`,
    amount_cents: opts.amountCents ?? 250,
    currency: opts.currency ?? 'eur',
    captured_list_item_ids: capturedListItemIds,
    ...(opts.purchasedAt ? { purchased_at: opts.purchasedAt } : {}),
  });
  if (error) throw new Error(`seedListSnapshotPurchase failed: ${error.message}`);
}

/** Delete access rows for a list so a re-run starts clean. */
export async function deleteListAccessRows(listId: string): Promise<void> {
  const admin = getServiceRoleClient();
  await admin.from('list_subscription_payments').delete().eq('list_id', listId);
  await admin.from('list_subscriptions').delete().eq('list_id', listId);
  await admin.from('list_snapshot_purchases').delete().eq('list_id', listId);
}

/**
 * Create a confirmed user whose onboarding is explicitly incomplete
 * (`public.users.onboarding_completed_at` = null, no `home_locality_id`). The shared E2E
 * user has already completed onboarding, so the onboarding wizard happy-path spec needs a
 * fresh incomplete user it can drive through all four steps. Torn down with
 * {@link deleteOnboardingUserData} + {@link deleteSeededUser}.
 */
export async function createOnboardingIncompleteUser(prefix = 'e2eonboard'): Promise<SeededUser> {
  const user = await createSeededUser(prefix);
  const admin = getServiceRoleClient();
  // A signup trigger could stamp defaults; force the onboarding-incomplete shape so the
  // /onboarding layout renders the wizard instead of redirecting to /dashboard/discover.
  const { error } = await admin
    .from('users')
    .update({ onboarding_completed_at: null, home_locality_id: null })
    .eq('id', user.id);
  if (error) throw new Error(`createOnboardingIncompleteUser reset failed: ${error.message}`);
  return user;
}

/**
 * Remove the rows the onboarding wizard writes for a user (tag prefs, follows, locality
 * follows) so the seeded user can be deleted even when the FKs are not ON DELETE CASCADE.
 * Safe to call whether or not the wizard actually ran.
 */
export async function deleteOnboardingUserData(userId: string): Promise<void> {
  const admin = getServiceRoleClient();
  await admin.from('user_follows').delete().eq('follower_id', userId);
  await admin.from('user_follows').delete().eq('following_id', userId);
  await admin.from('user_location_follows').delete().eq('user_id', userId);
  await admin.from('user_restaurant_tag_preferences').delete().eq('user_id', userId);
}

/**
 * Sign in as `email`/`password` through Supabase (same path as `global-setup.ts`) and return a
 * Playwright storage state carrying the SSR auth cookies. Cookies are written `httpOnly: false`
 * because the browser Supabase client hydrates the session from `document.cookie` — an httpOnly
 * cookie makes every authed page fall back to the "Continue with Google" gate (see docs/TEST-PLAN.md).
 *
 * Used to drive a page as a *different* user than the dashboard project's shared storage state:
 * `browser.newContext({ storageState: await buildUserStorageState(...) })`.
 */
export async function buildUserStorageState(
  email: string,
  password: string
): Promise<PlaywrightStorageState> {
  loadE2EEnv();
  const url = process.env.E2E_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey =
    process.env.E2E_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
  if (!url || !anonKey) {
    throw new Error(
      'buildUserStorageState: missing E2E_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and anon key'
    );
  }

  const cookieJar: { name: string; value: string }[] = [];
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieJar.map((c) => ({ name: c.name, value: c.value }));
      },
      setAll(cookiesToSet) {
        cookieJar.length = 0;
        cookiesToSet.forEach(({ name, value }) => {
          cookieJar.push({ name, value });
        });
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`buildUserStorageState: signInWithPassword failed for ${email}: ${error.message}`);
  }

  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3032';
  const hostname = new URL(baseUrl).hostname;
  const cookies = cookieJar.map(({ name, value }) => ({
    name,
    value,
    domain: hostname,
    path: '/',
    expires: -1,
    httpOnly: false,
    secure: baseUrl.startsWith('https:'),
    sameSite: 'Lax' as const,
  }));

  return { cookies, origins: [] };
}

/**
 * Add a user to the curated `suggested_creators` pool with a null municipality slug (global pool),
 * so it surfaces on the onboarding "suggested creators" step regardless of which locality was picked
 * (`get_suggested_creators_for_municipality`). Curated-table columns can vary between environments;
 * the caller should treat a throw as "could not seed" and fall back to whatever creators already
 * exist in the pool. Torn down with {@link deleteSuggestedCreator}.
 */
export async function seedSuggestedCreator(
  userId: string,
  opts: { subtitle?: string; sortOrder?: number; municipalitySlug?: string } = {}
): Promise<void> {
  const admin = getServiceRoleClient();
  await admin.from('suggested_creators').delete().eq('user_id', userId);
  const { error } = await admin.from('suggested_creators').insert({
    user_id: userId,
    // '*' = global pool: surfaced for every municipality by
    // get_suggested_creators_for_municipality, so the test can pick any locality.
    municipality_slug: opts.municipalitySlug ?? '*',
    subtitle: opts.subtitle ?? 'E2E suggested creator',
    sort_order: opts.sortOrder ?? 0,
  });
  if (error) throw new Error(`seedSuggestedCreator failed: ${error.message}`);
}

export async function deleteSuggestedCreator(userId: string): Promise<void> {
  const admin = getServiceRoleClient();
  await admin.from('suggested_creators').delete().eq('user_id', userId);
}
