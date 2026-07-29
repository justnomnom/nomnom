# Handoff — work that needs database, Stripe or product-decision access

**Date:** 25 July 2026
**Written for:** a session with Supabase credentials (`SUPABASE_ACCESS_TOKEN` / `SUPABASE_DB_PASSWORD`
or a linked project), Stripe test keys, and the ability to run the browser e2e suite.

Everything in this document was specified and left unbuilt **because the environment could not do
it**, not because it is unclear. Each item states what is blocked, the exact change, and how to
verify. Items are independent — take them in any order.

## Environment the previous session had

No `.env.local`. `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`,
`STRIPE_SECRET_KEY` all unset. `node_modules` was empty until `npm ci` was run. So: no migrations,
no Stripe calls, no dev server, and the 214-test browser e2e suite never ran.

**Before starting anything below, establish the baseline:**

```bash
npm ci
npx tsc --noEmit          # expect clean
npx eslint "src/**/*.{js,jsx}"   # expect clean
npm test                  # expect 946 pass, 0 fail
npm run test:e2e:all      # UNVERIFIED — nobody has run this against the current main
```

Note `CLAUDE.md` says "847 pass" — stale, the count has moved with new tests.

---

## 1. Apply the `lists.system_key` migration — **highest value, lowest risk**

**Blocked by:** no database access.

**Why.** Signup seeds "Must go" and "Visited" lists per user via a DB trigger. Nothing identifies them
except their *name*, so a user renaming "Visited" silently breaks the visited-state features shipped in
`src/auth/actions/visit-actions.js`, and deleting it breaks them entirely.

**What already works without this:** `pickSystemLists` (`src/libs/lists/system-lists.js`) prefers a
`system_key` column and falls back to name matching, so the Roulette skip-visited filter and the saved
summary work today. This migration makes them robust — it is an upgrade, not a prerequisite. The
resolver in `fetchMySystemListIds` already selects `system_key` first and retries without it on error,
so **no application code changes when this lands.**

**The SQL** is written in full in `docs/plan-visited-import-comments.md` §1.2 — column, partial unique
index, name-based backfill (earliest row per user, so a user's own later list called "Visited" does not
shadow the seeded one), and a guard trigger that blocks deleting/publishing/monetising a system list
while still allowing renames.

**Critical check before applying:** list creation goes through the `create_user_list` SECURITY DEFINER
RPC (`list-actions.js:749`, also called by `google-maps-import-actions.js:370`). If the guard trigger
rejects a column that RPC sets, **list creation breaks for every user**. Test that path first.

**Verify:** create a list via the UI; rename "Visited" and confirm the Roulette skip-visited toggle
still works; attempt to delete a system list and confirm it is refused; run
`tests/e2e/dashboard/delete-account.spec.ts`.

---

## 2. Open-now filter on the map

**Blocked by:** needs a new SQL predicate; the client cannot do it.

**Why it can't be client-side.** Hours live in `restaurants.metadata` under `hours_parsed`, and
`src/lib/slim-restaurant-card-metadata.js` strips that key from every row — metadata averages ~7.7 KB
and the map refetches on every pan. Discover already filters open-now client-side because its rows are
few and carry the derived `openingStatus`; the map's 5000-row pin fetch deliberately does not.

**Change.**
1. SQL helper `restaurant_is_open_at(metadata jsonb, ts timestamptz) returns boolean`. **Mirror the
   logic in `src/libs/restaurant/opening-hours.js` exactly** — especially midnight-crossing windows
   (open late tonight *and* still open this morning on yesterday's window) and unknown hours resolving
   to "not closed" rather than "closed". That file's 19 tests are the specification; port the fixtures.
2. Optional `p_open_now boolean` on `restaurants_in_bbox`, `restaurants_in_bbox_pins`,
   `restaurants_for_municipality`, `saved_restaurants_for_map`, `following_restaurants_for_map`.
   Returns one bit per row, never the hours themselves.
3. Add an `openNow` field to the AI search plan schema in `src/lib/restaurant-search-agent.js` (~line
   18–43) so "somewhere open now near Cais do Sodré" works.
4. Add the chip to `src/sections/map/map-tag-filter-sheet.js`, matching the existing
   `discoverFeedChipSx` treatment in `discover-view.js`.

**Verify:** a restaurant with a `19:00–02:00` Monday window must appear under "open now" at 23:30 Monday
*and* at 00:30 Tuesday, and not at 04:00 Tuesday. Compare against `resolveOpeningStatus` for the same
instants — the two implementations must agree or the UI contradicts itself between surfaces.

---

## 3. Stripe billing portal for subscribers

**Blocked by:** no Stripe keys; this is the money path and should not ship unexercised.

**Why.** There are **zero** references to `billingPortal` in `src/`. Subscribers have no invoice
history, no receipts, and no way to update a payment method. The entire post-purchase surface is three
cancel buttons. Separately, the creator "Manage" button re-issues an `account_onboarding` link rather
than an Express `loginLink`, so creators have no payout dashboard either.

**Change.** A route creating `stripe.billingPortal.sessions.create({ customer, return_url },
{ stripeAccount })` — **on the creator's Connect account**, since that is where the customer and the
subscription live (see `cancelMyCreatorSubscription` in `creator-subscribers-actions.js` for the
established `{ stripeAccount }` options-arg pattern). Link it from
`/dashboard/settings/my-subscriptions`. Separately, swap the creator "Manage" button to
`stripe.accounts.createLoginLink`.

**Verify:** with test keys, a seeded subscriber opens the portal, sees the invoice, updates a card, and
returns. Add to `npm run test:e2e:money-path`.

---

## 4. Naming savers on the restaurant page — **needs a product decision first**

**Blocked by:** an RPC change *and* a privacy decision that is not an engineer's to make.

**Current state.** `restaurant_follow_circle_for_viewer` returns `{ total, members: [{ userId,
avatarUrl }] }` — max 3, no names, no handles. The page shows faces without identity. The "when" half
shipped (save dates on referenced lists); the "who" half did not.

**The decision.** Two server-side filters currently enforce a deliberate policy:
`filterListMentionsToFollowsOnly` and `filterListMentionsToSelfOrReviewBacked` — the second drops
list-only saves by people you follow who did *not* write a review, with an explicit comment at
`dashboard/restaurants/[id]/page.js:117` ("no 'Someone saved this' cards"). Naming savers in the
follow-circle card reverses that. **Confirm this is intended before building it.** Options, cheapest
first: name only mutual follows; name only those who wrote a review (already effectively public); or
add a per-user `share_saves` preference.

**If approved.** Extend the RPC to return `display_name` and `username` plus the most recent save
timestamp; update `normalizeFollowCircle` (`src/libs/restaurant/follow-circle.js`) and
`restaurant-follow-circle-card.js`; link avatars to `paths.dashboard.userPublic(handle)`.

**Verify:** a non-followed saver is never named, on any surface, signed-in or not.

---

## 5. Monthly "spots you saved and never visited" digest

**Blocked by:** a new notification preference needs a column.

**Why.** `notification_preferences` has exactly three boolean columns, all for `list_update`
(`notification-preferences-actions.js` `DEFAULTS`). A new digest needs its own opt-in key, and adding
one is a migration.

**Change.** Add `saved_digest_email boolean not null default false` — **default off**; the notification
work in item 6 is about restraint and a new default-on email would undercut it. Then a monthly job
modelled on `src/libs/notifications/send-list-update-digests.js` and the Vercel cron at
`api/cron/notification-digest/route.js`, using `fetchMyVisitSummary` / `fetchMyVisitedRestaurantIds`
from `src/auth/actions/visit-actions.js`.

**Verify:** a user with `saved_digest_email = false` receives nothing; one who opts in with zero
unvisited saves also receives nothing (no empty digests).

---

## 6. Notification preferences restructure

**Blocked by:** table shape change.

**Three real defects**, all confirmed in code:
1. Preferences cover **one event type of six**. `new_follower`, `list_subscribed`, `list_invite`,
   `join_approved` and `invite_accepted` fire unconditionally with no preference and no mute.
2. **The email digest silently depends on the in-app toggle.** `sendListUpdateDigests` reads the
   `notifications` table, so `list_updates_in_app: false` produces no rows and therefore no digest,
   whatever the email preference says. That is a bug, not a design.
3. The `'creator'` mute target is implemented in the fan-out filter and **has no UI**.

**Change.** Move to per-type keys (`<type>_in_app | _push | _email`); give the digest its own source or
write digest rows independently of the in-app preference; expose the creator mute; batch
`notifyListFollowers`, which currently writes one row per added spot.

**Verify:** the pure filters in `src/libs/notifications/` already have unit tests — extend rather than
replace. Add a case proving digest delivery is independent of the in-app toggle.

---

## 7. Run the browser e2e suite — **do this first, before any of the above**

214 tests, 59 files, never run against current `main`. Highest-value specs given recent changes:

| Spec | Why it matters now |
|---|---|
| `dashboard/delete-account.spec.ts` | Account deletion now cancels Stripe subscriptions, blocks on an unsettled Connect balance, and **hard-deletes owned lists**. It is the canary for all three. |
| `dashboard/webhook-idempotency.spec.ts`, `stripe-api-authed.spec.ts`, `subscriptions-populated.spec.ts` | The money path changed |
| `dashboard/list-places-manage.spec.ts`, `map-filtering.spec.ts` | Discover/map filter chips and the list row are new UI |

**Expect one deliberate behaviour change:** account deletion now *fails* where it previously succeeded
— unsettled Connect balance, or Stripe unreachable. That is intended (better a blocked deletion than a
silent ongoing charge). If a spec asserts the old success, the spec needs updating, not the code.

---

## Shipped and not blocked — context only

Already on `main`, no action needed: Stripe teardown + owned-list deletion on account close, opening
hours as an open/closed status, Discover vibe and category chips and open-now filter, Roulette
skip-visited, saved-hub visit summary, save dates on referenced lists, platform-fee dedup,
cancellation confirmation email and reason capture.

Remaining unblocked work (buildable without any of the above) is catalogued in `docs/feature-specs.md`
with a sequencing proposal, and `docs/feature-backlog.md` explains why each exists. Note §0 of the
specs: several features were found already half-built, so **verify against the code before estimating**.
