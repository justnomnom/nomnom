# NomNom — Full-App Flow Review & Test Plan

Scope: every user-facing flow found in `src/app/(frontend)`, ranked by risk, with
concrete test cases per flow and where each test should live.

Test layers (matching the existing stack):

| Layer | Runner | Location | Runs against |
|---|---|---|---|
| Unit | `npm test` (node --test) | `src/**/__tests__/*.test.mjs` | Pure functions |
| E2E public | `npm run test:e2e` (project `public`) | `tests/e2e/public/` | Unauthenticated pages |
| E2E dashboard | `npm run test:e2e` (project `dashboard`) | `tests/e2e/dashboard/` | Authed via `storage-state.json` |
| API integration | Playwright `request` fixtures | `tests/e2e/api/` (new) | Route handlers |
| Manual / Stripe CLI | `npm run stripe:listen` + test cards | checklist below | Live Stripe test mode |

Existing coverage (do not duplicate): marketing routes smoke, password sign-in,
public entity pages, public user profile, dashboard navigation + deep links,
lists mutations, profile mutations. Unit tests already cover snapshot pricing,
purchase-row mapping, checkout/subscription error mapping, paywall recency,
tag groups, follow circle, and more.

**Status 2026-07-06 (full-suite review):** 184 e2e tests + 295 unit tests. All
features have automated coverage. Full-run flakes under the dev server's memory
restarts remain (about 5 per ~55-min run; all pass in isolation; CI retries
absorb them).

**Status 2026-07-10 (coverage-gap pass):** +17 e2e tests (suite now 201) closing
the remaining plan gaps, all green on first full run of the new specs (13 ran,
4 conditional self-skips):
- `public/legal-roulette-and-seo.spec.ts` — /privacy, /terms, public
  /roleta/lisboa (RO2: render + spin control + signup CTA with
  `returnTo=/roleta/lisboa`), sitemap.xml urlset + robots.txt (M4). The legal and
  roulette pages render outside the shared app shell (no `#main-content`/`main`
  landmark) — assert their content, not the chrome.
- `public/content-slug-pages.spec.ts` — M1 real-slug renders for
  features/resources/collections, fs-discovered from `content/`; self-skips until
  MDX content exists there (only `use-cases` is populated today). `/post/[title]`
  real-render is N/A: the posts API is a stub returning `[]` until a CMS is wired.
- `public/forgot-password-enumeration.spec.ts` — A6: unknown email lands on the
  generic "If an account exists for this address…" verify screen (green). The
  known-email case self-skips when the recovery send fails (Supabase rejects
  `.local` addresses outright, and default SMTP can't deliver to seeded
  addresses); it asserts full parity in envs with working SMTP.
  `createSeededUser` now takes `{ emailDomain }` for tests that drive public
  auth endpoints.
- `dashboard/auth-guest-guard.spec.ts` — A9: authed user on /auth/login and
  /auth/register is bounced to /dashboard/discover (GuestGuard; warm the
  destination first, poll with `toHaveURL` — soft navigation).
- `dashboard/onboarding-skip.spec.ts` — O5: header "Skip" (visible past the
  welcome step) completes onboarding with `home_locality_id` null and zero
  tag/follow/locality rows.
- `monetization-guards.spec.ts` (extended) — B4 `cannot_subscribe_own_list`
  (owner needs a fake charges-enabled `customers` row first: the ownership guard
  sits AFTER the Connect check in the route; buyer request context built from
  `buildUserStorageState`) and B5 `already_purchased` (seeded
  `list_snapshot_purchases` row for the shared user). Both return before Stripe.
- `dashboard/admin-access-guard.spec.ts` — AD1: a seeded NON-admin (guaranteed
  absent from `ADMIN_USER_IDS`) gets the global not-found on both admin routes;
  complements navigation-extended, which can only assert the shared (allowlisted)
  user's branch.
- `dashboard/preferences-tags-edit.spec.ts` — S2: tag preference toggle → Save →
  `user_restaurant_tag_preferences` differs by exactly one row (symmetric diff,
  deterministic regardless of prior state) → toggle back → original restored.

**Status 2026-07-11 (second coverage pass — "do all"):** +6 e2e tests (suite now
207) closing the last automatable gaps; all runnable tests green:
- `dashboard/webhook-idempotency.spec.ts` — B13: a `checkout.session.completed`
  snapshot event signed locally with STRIPE_WEBHOOK_SECRET (HMAC scheme
  `t=<unix>,v1=…`) is processed once; replaying the identical signed payload
  answers `{ received: true, duplicate: true }` via the `stripe_events` table
  with no second `list_snapshot_purchases` row. No live Stripe needed — the
  snapshot path never calls the Stripe API.
- `dashboard/map-pan-and-rating-filter.spec.ts` — D4: two "Zoom in" clicks arm
  the "Search this area" pill (zoom is the deterministic trigger — at the
  near-world initial camera a half-screen drag shifts the center only ~25% of
  the bbox span, exactly at the threshold); clicking re-scopes the fetch and the
  pill dismisses. D5: min-rating slider (keyboard End → 5) can only shrink the
  spot-row count; Clear all restores it. Gotchas encoded: the filter sheet's
  map entry point is the "More…" chip (not a "Map filters" button); the sheet's
  "(N)" heading badge only renders in single-following-list mode, so count the
  rows (one "Save to list" button each); rows STREAM in pages — poll until two
  reads 3s apart agree before trusting a count.
- `dashboard/list-monetization-ui.spec.ts` — monetization gating UI for a
  creator without Connect: manage → Audience shows "Payout setup required" +
  "Open billing", and Billing blocks the bundle price with the setup-first
  alert. NOTE: there is no per-list paid toggle in the UI — monetization =
  Audience "Subscribers" + bundle price on Billing
  (`syncSubscriberListsBundlePrice` flips `paid_access_enabled`);
  `updateListPaidSettings` in stripe-list-actions.js had NO caller (dead
  action) and was deleted on 2026-07-11 (recover from git history if a
  per-list toggle is ever built). The live price→enable flip needs Stripe and
  stays covered by the money-path spec.
- `dashboard/discover-card-save.spec.ts` — L3: SaveToListSheet from a discover
  feed card (rating + list pick → `list_items` row DB-asserted). Self-skips in
  this environment: the shared user's feed renders the empty state (no cards
  for the seeded market); activates automatically when the feed has rows.

**Status 2026-07-12 (final review pass — "anything missing"):** +7 e2e tests
(suite now 214). Every remaining automatable TEST-PLAN row is now specced; all
runnable tests green, env-conditional skips documented inline:
- `public/register-signup.spec.ts` — A1 signup → verify screen + users row,
  cleaned up via service role. Self-skips here: Supabase's public signUp
  rejects both `.local` AND `example.com` addresses as invalid before any send.
- `dashboard/onboarding-geolocation.spec.ts` — O4: granted geolocation (context
  `geolocation` + `permissions`) flips the button to "Location is on"
  (grant/getCurrentPosition wiring verified); the auto-selected locality chip is
  data-dependent (`resolveLocalityFromCoordinates` found no match for Lisbon
  coords in this DB → documented skip; a no-match renders nothing by design —
  the `gps_outside_supported` locale key is UNUSED in the wizard). Denied →
  idle button restored, manual picker still completes. O10: the wizard's
  `p[aria-live="polite"]` step announcement is asserted non-empty.
- `webhook-idempotency.spec.ts` (extended) — C2: locally-signed
  `account.updated` flips `stripe_connect_charges_enabled`/`payouts` on the
  customers row (handler reads the payload only).
- `dashboard/paywall-subscribe-snackbar.spec.ts` — B16 finding: the paywall
  PRE-EMPTS checkout errors for a not-ready creator — it renders
  `freemium_payments_not_ready` ("The creator hasn’t enabled payments yet…")
  and withholds the Subscribe CTA entirely, so the `creator_not_ready` snackbar
  is only reachable in a render/click race. The spec asserts the gate; the
  error→copy mapping stays unit-tested.
- `dashboard/subscriptions-populated.spec.ts` — S4: my-subscriptions renders the
  seeded active subscription's list name; C4: subscribers renders the seeded
  subscriber (name heading, no `@` prefix) + the "Active subscribers" stat.
  Both via `seedListSubscription`, no Stripe.

Remaining non-automated (all with hard external dependencies): A7 recovery-token
email loop, A8 OAuth callback, A10 session expiry, C1 live Connect onboarding
URL (money-path setup exercises the real account), E2/E3 resilience, mobile
Part B on-device.

**Product finding (2026-07-10, not fixed here):** when the recovery-email send
fails, the forgot-password form surfaces NO user-facing error — the view's
catch only `console.error`s (supabase-forgot-password-view.js) and the button
stops loading silently. Cosmetic in prod (sends rarely fail) but a dead end for
the user when it does.

**Product bug (fixed 2026-07-10): freemium preview blocked by RLS.**
`fetchListPage`'s gated branch selected the free-preview `list_items` with the
viewer's RLS client, but `public.list_user_can_read` (migration 20260514200000)
denies non-buyers ALL items on a `paid_access_enabled` list — so
anonymous/non-subscriber visitors saw the paywall with zero preview places.
Fixed by the SECURITY DEFINER RPC `list_freemium_preview_items` (migration
20260710120000): it returns only the N most-recent places (server-capped) plus
`has_more`; raw `list_items` selects stay denied for non-buyers. Gating spec
cases (a)/(b) exercise it and are green; the `test.fixme` markers are removed.

**Dev-only navigation caveat:** App Router `router.replace` commits the URL only
after the RSC response; a cold dev-server compile of the destination (90s+)
stalls login/onboarding redirects past test budgets. Specs warm the destination
route with one anonymous `request.get()` first (see `password-signin.spec.ts`).

**Admin CRUD spec (executes for real):** `admin-sponsored-placements.spec.ts`
skips unless the shared e2e user's auth UUID is in `ADMIN_USER_IDS` in
`.env.local` (the running server reads it — it cannot be mutated from a test).
The e2e user is now appended there locally. AntD RangePicker automation: use
`input.fill()` + Enter per half (`keyboard.type` APPENDS to a prefilled input →
unparseable → Enter silently refuses to commit), never `focus()` the end input
externally while the range draft is open (AntD drops the tentative start half),
and assert `toHaveValue` on both inputs before clicking Save.

**Automated since this plan was written** (see specs referenced per case):
`auth-flows.spec.ts` (A3, A5, register validation), `access-gates.spec.ts`
(anonymous O1 + dashboard auth gate), `stripe-api-guards.spec.ts` (B1, B2, B14,
unauth 401s), `stripe-api-authed.spec.ts` (B3 authed, verify-snapshot
validation), `pricing-and-errors.spec.ts` (P1, E1, unknown-slug 404),
`onboarding-gate.spec.ts` (O2, my-subscriptions route),
`onboarding-happy-path.spec.ts` (O3 full four-step drive + persisted rows, O6
back-nav preserves selection, O8 refresh mid-wizard restores the step — seeds an
onboarding-incomplete user via `seed.ts` and opens a fresh context authenticated
as them, overriding the shared storage state).

**Corner-case matrix added** (all public, no-auth, run green):
`dynamic-route-not-found.spec.ts` — every `[param]` public route
(collections, countries/[country][/city][/collections][/influencers], features,
resources, use-cases, post, restaurants, lists/[handle][/listSlug], u/[username])
with a bogus param and with injection-shaped params (`'"><--`): asserts no 5xx +
app shell renders (routes soft-404 at 200). `api-edge-cases.spec.ts` — posts/
search & latest & [title] (405 on wrong method, 404 unknown title, empty/blank/
injection query, non-numeric limit/page), email/send & restaurants/ingest
(401 unauth, 405 wrong method, 503 unconfigured). `auth-form-boundaries.spec.ts`
— register short password / invalid email / empty names, forgot-password invalid
email, new-password without token. `i18n-and-theme.spec.ts` — no raw `pages.*`/
`common.*`/`components.*` keys leak on `/ /pricing /about /faqs /contact-us
/use-cases`; `jn_theme` cookie drives SSR `data-theme` (dark with cookie, light
without).

**Authenticated corner cases added** (dashboard project, single seeded user, no
Stripe — all green): `lists-filter-variations.spec.ts` — each lists filter
(All / Mine / Following / Subscriptions / Shared) selects + renders per empty/
populated branch. `settings-variations.spec.ts` — appearance Dark↔Light updates
`html[data-theme]` (persists via settings provider when authed, unlike anonymous);
language EN↔PT switch re-renders localized copy; billing / my-subscriptions /
subscribers empty states. `discover-roulette.spec.ts` — discover search input +
Search↔AI toggle (button's accessible name is its aria-label "Switch to AI
search", not the visible "AI"); roulette spin navigates to `/dashboard/
restaurants/[id]` or shows empty-pool (spin button is disabled while the pool
loads — wait for enabled first). **Deepened for D1/D2/D3:** name typeahead
(role=listbox "Spot search suggestions" — restaurant rows only; Discover wires no
`onPickLocation`, so no "Locations" section, unlike the map) with Escape-to-dismiss
and pick → opens the spot on `/dashboard/map`; Ask-AI submit (Enter) hands the NL
query off to the map (`USER_SCOPED_KEYS.mapPendingAiQuery`) — assert the map shell
survives, tolerating empty AI results; the filter icon deep-links to `/dashboard/
map?filters=open` and auto-opens the "Spot filters" sheet; and the no-home-location
gate — a service-role-seeded, onboarding-complete user with `home_locality_id = null`
(via `seed.ts` `completeOnboardingWithoutHome` + a per-user session from
`buildUserStorageState`) still renders the "Change area" market gate. Selector/timing
gotchas worth reusing: Discover→map hand-offs are App Router **soft** navigations —
poll with `expect(page).toHaveURL(...)`; a `waitForURL({ waitUntil: 'commit' })`
hangs (soft navs fire no document commit). The first `searchRestaurantsByName`
server action is slow to cold-compile on the webpack dev server (~30s observed) —
the popup shows only "Searching spots…" until then, so wait generously for the
result rows. `gotoDashboard` uses `domcontentloaded` (Discover keeps streaming, so
`load` can lag a cold compile) and retries the whole navigation, since the dev
server's memory-threshold restarts surface mid-nav as `ERR_CONNECTION_RESET`.

**Mechanism CRUD/variation coverage added** (dashboard project, all green):
`list-crud-edit.spec.ts` — full list update path: create → rename (Details tab →
Save, verified in Postgres) → change visibility to Public (Audience tab →
Save, verified) → delete. Complements lists-mutations (create+delete only).
`map-filtering.spec.ts` — filter sheet via `?filters=open`: sort toggle
(Relevance/Distance `aria-pressed`) and "Clear all filters" resets to the
Distance default. Selector notes worth reusing: the list visibility control is a
MUI `select` (target `role=combobox`, not `getByLabel` which hits the hidden
input); its option accessible names are `primary + description`, and the
descriptions contain the word "public", so match options with an anchored
`/^Public/` on the name. Since automated: cover image upload
(`list-cover-upload.spec.ts`), collaboration invite + accept/decline
(`list-collaboration-invite.spec.ts`, `list-collaboration-accept.spec.ts`),
Places-tab render/remove (`list-places-manage.spec.ts`). Monetization UI: there
is no per-list paid toggle (see the 2026-07-11 status note) — the no-Connect
gating states are covered by `list-monetization-ui.spec.ts`; API-side gating by
`monetization-guards.spec.ts` + the money-path spec.

Theme note: `jn_theme` cookie is honored at **SSR/first paint only**; an
anonymous client re-derives theme from localStorage `settings-*` (default light),
so dark mode is asserted on the SSR response HTML, not the hydrated DOM. The
user-facing toggle lives in authed Settings → Appearance.

Findings from the first run of these specs:
- **Harness fix:** `global-setup.ts` wrote the Supabase session cookie with
  `httpOnly: true`; the browser Supabase client reads sessions from
  `document.cookie`, so every dashboard page hydrated into the "Continue with
  Google" gate and the whole dashboard project was failing. Now `httpOnly: false`
  (faithful to real users' JS-set cookies).
- **Soft 404 in dev:** unknown content slugs (e.g. `/use-cases/bad-slug`)
  stream status 200 with the branded not-found UI in dev; prod static rendering
  returns a real 404. Tests assert the UI, not the status.
- `/onboarding` for anonymous users redirects via a streamed client-side
  redirect (response is already 200), so the login URL only appears after
  hydration — tests must wait for JS, and slow first paints show a blank page.
- The global not-found heading is "This page isn’t here."
- **Product bug found & fixed:** email/password login often stayed on
  `/auth/login` and the completed-user `/onboarding` redirect stalled. Cause: the
  auth provider fired `getOrCreateCustomer` (a Server Action) as a post-login
  side effect; the action POST replays the current route's RSC tree and cancels
  the in-flight client navigation (GuestGuard `router.replace`, and the streamed
  onboarding redirect). Moved that work to a plain fetch route
  `POST /api/auth/session-setup` (`src/app/(frontend)/api/auth/session-setup`)
  and switched the provider to call it. This was a real user-facing intermittent
  login failure, not just a test artifact.
- **Stale assertion fixed:** `lists-mutations.spec.ts` expected create-list to
  navigate to `/dashboard/lists/[id]`, but the dashboard inserts the new list
  card in place (`onCreated` + `router.refresh`). Test now asserts the new tile
  appears and reads the id from its href.

---

## 1. Auth (P0)

Routes: `/auth/login`, `/auth/register`, `/auth/forgot-password`,
`/auth/new-password`, `/auth/verify`, `/auth/callback`.

| # | Case | Layer |
|---|---|---|
| A1 | Register with valid email/password → verify screen shown, verification email sent | ✅ E2E public (`register-signup.spec.ts`; self-skips where Supabase rejects seedable addresses) |
| A2 | Register with existing email → inline error, no account duplicated | E2E public |
| A3 | Weak/mismatched password validation messages | E2E public |
| A4 | Login happy path → lands on dashboard (covered: `password-signin.spec.ts` — extend for error path) | E2E public |
| A5 | Login wrong password → error, no redirect | E2E public |
| A6 | Forgot password → request accepted for known + unknown email (no user enumeration) | ✅ E2E public (`forgot-password-enumeration.spec.ts`; known-email case self-skips without deliverable SMTP) |
| A7 | New-password flow with valid recovery token → can sign in with new password | Manual (needs email loop) |
| A8 | OAuth callback: new user → redirected to `/onboarding`; returning user → `/dashboard` (`auth/callback/route.js` branches on onboarding completion) | Manual / E2E with seeded user |
| A9 | Authed user visiting `/auth/login` is redirected away | ✅ E2E dashboard (`auth-guest-guard.spec.ts` — login + register) |
| A10 | Session expiry mid-dashboard → graceful redirect to login, no crash screen | Manual |

## 2. Onboarding (P0 — no coverage today)

Route: `/onboarding` — 4-step wizard (`onboarding-wizard.js`): welcome →
location → tag preferences → suggested creators. Server actions:
`saveOnboardingLocation`, `saveUserRestaurantTagPreferences`,
`saveOnboardingFollows`, `completeOnboarding`. Gating lives in
`dashboard/layout.js` and `onboarding/layout.js`.

| # | Case | Layer |
|---|---|---|
| O1 | New user (onboarding incomplete) hitting `/dashboard/*` is redirected to `/onboarding` | E2E (seeded incomplete user via `supabase-service.ts`) |
| O2 | Completed user hitting `/onboarding` is redirected to dashboard | E2E dashboard |
| O3 | Full happy path: pick locality → pick ≥1 tag → follow ≥1 creator → finish → lands on dashboard; profile rows persisted (localities, tag prefs, follows) | E2E |
| O4 | Location step: search localities, select; "use my location" resolves coordinates (mock geolocation permission granted + denied) | ✅ E2E (`onboarding-geolocation.spec.ts`; locality auto-select chip is data-gated) |
| O5 | Skip-optional paths: can complete without follows / without tags if UI permits; verify `completeOnboarding` still sets the flag | ✅ E2E (`onboarding-skip.spec.ts` — header Skip completes with zero optional rows) |
| O6 | Back navigation between steps preserves selections | E2E |
| O7 | Suggested creators load for the chosen municipality; empty-state when none | E2E |
| O8 | Refresh mid-wizard: state either restored or restarts cleanly (no broken step) | E2E |
| O9 | Server actions reject unauthenticated calls | API integration |
| O10 | A11y: step live-region announcements exist (`ONBOARDING_STEP_A11Y_LABEL_KEYS`), keyboard-only completion | live region ✅ (`onboarding-geolocation.spec.ts`); keyboard-only pass stays manual |

## 3. Pricing page (P1)

Route: `/pricing` — informational (free tier + paid-lists explainer), no checkout.

| # | Case | Layer |
|---|---|---|
| P1 | Renders free + paid sections, breadcrumbs, EN/PT translations resolve (no raw `pages.pricing.*` keys) | E2E public |
| P2 | Related links navigate correctly; page reachable from marketing nav/footer | E2E public |
| P3 | Dark mode: parchment/grey backgrounds swap (`html[data-theme="dark"]`) | Manual (or `preview_resize` colorScheme) |

## 4. Creator monetization — Stripe Connect (P0)

Routes: `POST /api/stripe/connect/onboard`, webhook `account.updated`,
settings → subscribers.

| # | Case | Layer |
|---|---|---|
| C1 | Connect onboarding: authed creator gets Stripe onboarding URL; unauthenticated → 401 | API integration |
| C2 | `account.updated` webhook sets `stripe_connect_charges_enabled` on the customer row | ✅ E2E (`webhook-idempotency.spec.ts` — locally-signed event, DB-asserted) |
| C3 | List monetization toggle only effective once charges enabled; buyer sees `creator_not_ready` before | API integration |
| C4 | Subscribers page lists active subscribers, updates after a test subscription | ✅ E2E (`subscriptions-populated.spec.ts` — seeded active row renders) |

## 5. Paid lists — buyer checkout & subscription (P0)

Routes: `POST /api/stripe/checkout/list`, `POST /api/stripe/checkout/verify-snapshot`,
webhook `/api/webhooks/stripe` (subscription created/updated/deleted,
checkout.session.completed, invoice.paid), settings → billing, my-subscriptions.
Paywall: `src/libs/paywall/paywall-recency.js`.

Guard-rail cases (cheap, high value — pure route handler tests):

| # | Case | Expected |
|---|---|---|
| B1 | No auth | 401 `unauthorized` |
| B2 | Missing / malformed `listId` | 400 `missing_list_id` / `invalid_list_id` |
| B3 | List not monetized (flag off, or missing price/amount per type) | 400 `list_not_monetized` |
| B4 | Owner buying own list | 400 `cannot_subscribe_own_list` — ✅ `monetization-guards.spec.ts` |
| B5 | Snapshot already purchased | 400 `already_purchased` — ✅ `monetization-guards.spec.ts` |
| B6 | Creator charges not enabled | 400 `creator_not_ready` |
| B7 | `returnPath` = `https://evil.com`, `//evil.com`, `foo` → falls back to `/lists/{id}` (open-redirect guard) | API integration |
| B8 | Stripe env unset | 503 `stripe_not_configured` |

End-to-end money path (Stripe test mode). **Automated** by
`tests/e2e/dashboard/monetization-money-path.spec.ts` — see
[`docs/stripe-money-path-runbook.md`](stripe-money-path-runbook.md). Setup: `npm run stripe:e2e:setup`
creates a real Connect test account (charges enabled) + recurring price and writes `E2E_STRIPE_*`
to `.env.local`. Each test asserts the app's `/api/stripe/checkout/list` route returns a real
`checkout.stripe.com` session, then completes the equivalent payment via the Stripe API with
tokenized test cards (`pm_card_visa` = 4242, `pm_card_chargeCustomerFail` = 4000…0341) — Stripe's
hosted Checkout can't be driven headless (hCaptcha on submit). The spec spawns its own
`stripe listen` to forward the resulting webhooks. Skips cleanly when Stripe test keys / setup are
absent.

| # | Case | Layer |
|---|---|---|
| B9 | Subscription checkout with test card 4242… → webhook grants access → paid list content visible → row on my-subscriptions | **Automated** `monetization-money-path.spec.ts` (asserts `list_subscriptions` active + paywall unlocks; my-subscriptions row still manual) |
| B10 | Snapshot purchase → `verify-snapshot` confirms → items captured at purchase time (later list edits NOT visible — `merge-snapshot-purchase-captured-item-ids` behavior end-to-end) | **Automated** `monetization-money-path.spec.ts` (verify-snapshot persists `list_snapshot_purchases` + unlock; captured-items delta still manual) |
| B11 | Cancel subscription (Stripe dashboard/portal) → `customer.subscription.deleted` → access revoked, paywall returns | **Automated** `monetization-money-path.spec.ts` (cancels via Stripe API) |
| B12 | Failed payment card (4000…0341) → no access granted | **Automated** `monetization-money-path.spec.ts` |
| B13 | Webhook idempotency: replay same event → no duplicate purchase rows | ✅ E2E (`webhook-idempotency.spec.ts` — locally-signed event, replay answers duplicate:true) |
| B14 | Webhook signature invalid → 400, no side effects | API integration |
| B15 | Paywall gating: anonymous vs free vs subscribed vs snapshot buyer see correct item visibility on public list page (recency rules per `paywall-recency`) | E2E with seeded rows |
| B16 | Checkout error mapping surfaces friendly messages (`stripe-checkout-errors` already unit-tested — assert the snackbar path once in E2E) | ✅ E2E (`paywall-subscribe-snackbar.spec.ts` — the paywall pre-empts the not-ready error with `freemium_payments_not_ready` and hides the CTA; snackbar only reachable in a race) |

## 6. Lists (P1 — partially covered)

Existing: `lists-mutations.spec.ts`, `list-manage-deep-link.spec.ts`,
`list-cover-upload.spec.ts` (L4 cover upload/remove), `list-places-manage.spec.ts`
(L5 seeded place render + row-scoped remove), `list-collaboration-invite.spec.ts`
(L2 owner-invites-by-handle → `list_members` row, status `pending_invite`). Add:

| # | Case | Layer | Status |
|---|---|---|---|
| L1 | Public list page `/lists/[creatorHandle]/[listSlug]`: renders, share/save CTAs, 404 for bad slug | E2E public | |
| L2 | Collaboration: owner invites a seeded user by handle → `list_members` row created (status `pending_invite`). Invite flow errors (`list-collaboration-errors` unit-tested — cover accept/decline UI once) | E2E dashboard | invite covered (`list-collaboration-invite.spec.ts`) |
| L3 | Save-to-list sheet from discover card and restaurant page (rating, note, media) | E2E dashboard | restaurant page: `save-to-list-review.spec.ts`; discover card: `discover-card-save.spec.ts` (self-skips while the seeded market feed is empty) |
| L4 | Cover upload/remove; delete list with confirmation | E2E dashboard | cover upload/remove covered (`list-cover-upload.spec.ts`) |
| L5 | Places tab: seeded item renders and the row-scoped remove control deletes the `list_items` row | E2E dashboard | covered (`list-places-manage.spec.ts`) |

Notes for these specs (mechanism gotchas the tests encode):
- **Cover upload is async** — the client uploads to the Supabase `avatars` bucket
  then sets `coverUrl` state (`handleCoverFileChange`). Wait for the cover preview /
  "Remove" control (spinner cleared) before clicking Save, or an empty
  `cover_image_url` gets persisted.
- **Place-row remove** — the whole row is a `role="button"` (`ListItemButton`) whose
  accessible name concatenates the nested action labels, so a loose `/Remove/`
  match selects the row and navigates to the restaurant page. Target the remove
  `IconButton` by its exact aria-label (`Remove`).
- **Invite** resolves the handle via `resolve_user_id_from_username` (reads
  `public.users.username`) then `invite_to_list`, which writes `list_members` with
  status `pending_invite` — assert on that table.

## 7. Discover, Search & Map (P1)

| # | Case | Layer |
|---|---|---|
| D1 | Discover feed loads with location gate; empty state when no locality | E2E dashboard |
| D2 | Search vs vibe-search toggle (`search-ai-toggle`): mode switch persists, correct endpoint hit per mode | E2E dashboard |
| D3 | Typeahead: restaurant vs locality results, keyboard navigation, fly-to on map | E2E dashboard |
| D4 | Map: pins render for viewport, initial fetch gate (unit exists — add E2E: pan → refetch), restaurant popup → detail page | ✅ E2E dashboard (`map-pan-and-rating-filter.spec.ts` — zoom arms "Search this area" → refetch; popup→detail via discover typeahead spec) |
| D5 | Filters apply/reset; result counts change | ✅ E2E dashboard (`map-pan-and-rating-filter.spec.ts` — min-rating shrinks rows, clear-all restores; sort/reset in `map-filtering.spec.ts`) |
| D6 | Mapbox static maps on restaurant pages render with fallback when token missing | E2E public |

## 8. Restaurant pages (P1)

| # | Case | Layer | Status |
|---|---|---|---|
| R1 | Public `/restaurants/[id]`: hero, gallery, location CTA (+ disabled fallback), community consensus; reviews / NomNom Circle hidden for guests; guest save opens the sign-up prompt | E2E public (`restaurant-detail-public.spec.ts`) | ✅ done |
| R2 | Dashboard restaurant detail: hero, location CTA, follow-circle indicators, community + NomNom Circle sections, save CTA; must-try dedupe (best-effort, data-gated); review card appears in feed + post-save pending skeleton | E2E dashboard (`restaurant-detail-render.spec.ts`) | ✅ done |
| R3 | Review submit → appears; edit/delete own review (via SaveToListSheet), DB-asserted | E2E dashboard (`save-to-list-review.spec.ts`) | ✅ done |

Notes:
- **"Map" is a Google Maps deep-link button**, not an embedded Mapbox static image — the shared
  `RestaurantDetailView` renders `buildMapsUrl(...)` as an external link (`Open this place in maps in
  a new tab`) that degrades to a **disabled button** when a row has no name/address/coords/maps_link.
  The Mapbox static-map work (commit `4e09cc8`) lives in the Remotion video project, not these web
  views, so R1/R2 assert the maps CTA + fallback rather than a static tile / token-missing image.
- **Reviews + must-try dedupe are dashboard-only.** The public share page renders with
  `showListsAndReviews={false}`, so the NomNom Circle feed (reviews, must-try chips) is suppressed
  there and asserted absent; dedupe is verified on the dashboard surface when the seed has dishes.
- These specs run against a seeded restaurant (`getAnyRestaurantId`) and self-skip without service
  role. Prefer running them one at a time on the shared webpack dev server — a single dev server
  struggles to serve all three heavy dashboard renders back-to-back (see "Known environmental
  flakiness"); each test passes in isolation.

## 9. Roulette (P2)

Routes: `/dashboard/roulette`, public `/roleta/lisboa`.

| # | Case | Layer |
|---|---|---|
| RO1 | Spin → result → navigate to restaurant; respin | E2E dashboard |
| RO2 | Public roleta page works logged-out, CTA to sign up | ✅ E2E public (`legal-roulette-and-seo.spec.ts`) |
| RO3 | Reduced-motion: result appears without animation jank | Manual |

## 10. Profile & Settings (P1 — partially covered)

Existing: `profile-mutations.spec.ts` (bio), `public-user-profile.spec.ts`. Add:

| # | Case | Layer |
|---|---|---|
| S1 | Appearance: light/dark/system persists across reload (theme cookie unit exists — assert E2E once) | E2E dashboard |
| S2 | Preferences: language EN/PT switch, tag preferences editable post-onboarding | ✅ E2E dashboard (language: `settings-variations.spec.ts`; tags: `preferences-tags-edit.spec.ts`) |
| S3 | Billing page: empty state (no purchases) and populated state | E2E dashboard |
| S4 | My-subscriptions: active sub row, cancel entry point | ✅ E2E dashboard (`subscriptions-populated.spec.ts` populated row; empty state in `settings-variations.spec.ts`) |
| S5 | Delete account: confirmation gate, requires re-auth if designed so, account actually removed + sign-out | ✅ E2E dashboard (`delete-account.spec.ts`) |
| S6 | Support/feedback form submits; email rate limit returns friendly error (unit exists for limiter) | ✅ E2E dashboard (`support-feedback.spec.ts`) |
| S7 | Profile edit variations: display name persist, username sanitization + uniqueness conflict, avatar upload/persist/remove | ✅ E2E dashboard (`profile-edit-variations.spec.ts`) |

**Settings mechanism coverage added** (dashboard project, all green):
`delete-account.spec.ts` — signs a throwaway `createSeededUser` into its **own**
storage-state (never the shared user) via the new `support/user-session.ts`
`buildUserStorageState` helper; asserts the confirm button stays disabled until
the exact "delete account" phrase is typed, then verifies both the `public.users`
row and the auth user are gone and the app leaves the delete page.
`support-feedback.spec.ts` — the support form (`FaqsForm` → `sendContactInquiryEmail`)
surfaces a friendly notification (success `role=status` where email is configured,
else the friendly error `role=alert`; this env's Resend key is a placeholder so it
resolves to the error), repeated submits keep surfacing the friendly error
(exercises the rate-limit UI path; the 5/hr limiter's counting is unit-tested),
and the Feedback page (a Sleekplan embed + help links, no native form) renders and
links through to the support form. `profile-edit-variations.spec.ts` —
complements the bio test: display-name persist (DB-verified + restored), username
field client sanitization (strips to lowercase `[a-z0-9_]`), username uniqueness
conflict against a seeded handle (row unchanged), and avatar upload → persist →
remove (DB-verified + restored). Selector notes: the profile name/username fields
have no label association — target by placeholder (`Your name` / `your_handle`);
the avatar preview img must be scoped under the hidden file input
(`input[type="file"] ~ div img[src*="/avatars/"]`) so the header account-popover
avatar doesn't shadow it; wait for the Save button to re-enable between the upload
save and the remove save (the post-save profile refetch would otherwise clobber
the local removal).

**Product bug found (tracked separately, not fixed here):** account deletion is
broken for any user who owns lists — which is every user, since signup seeds
default "Must go" / "Visited" lists. Migration `20260503160000` switched
`lists.user_id` to `ON DELETE SET NULL` (so orphaned lists survive) but left the
column `NOT NULL`, and `deleteAccount()` never deletes/orphans owned lists — so the
users-row delete violates the NOT NULL constraint and the auth delete then fails
with "Database error deleting user". The E2E works around this by clearing the
throwaway user's lists in setup (see the spec comment); fix is to drop the NOT NULL
on `lists.user_id` (per the migration's stated intent) or have `deleteAccount()`
handle owned lists.

## 11. Admin (P2)

| # | Case | Layer |
|---|---|---|
| AD1 | Non-admin hitting `/dashboard/admin/*` → 403/redirect (allowlist unit exists — assert route guard E2E) | ✅ E2E dashboard (`admin-access-guard.spec.ts` — seeded non-admin sees global not-found on both admin routes) |
| AD2 | Sponsored placements table + inline schedule editor CRUD (`admin-sponsored-placements.spec.ts`: create via Add form → verify row → set visibility window inline → verify dates → remove → verify gone, all in Postgres) | E2E dashboard (gated on admin allowlist) |

## 12. Marketing / content platform (P2 — mostly covered)

Existing smoke covers marketing routes. Add:

| # | Case | Layer |
|---|---|---|
| M1 | `features/[slug]`, `use-cases/[slug]`, `resources/[slug]`, `post/[title]`: one representative each renders + 404 for bad slug | ✅ E2E public (use-cases: `marketing-routes.spec.ts`; features/resources/collections: `content-slug-pages.spec.ts`, fs-discovered, self-skips until MDX content exists; post real-render N/A — posts API is a stub; bad slugs: `dynamic-route-not-found.spec.ts`) |
| M2 | Countries → city → collections/influencers drill-down chain | E2E public |
| M3 | City-interest capture (`api/marketing/city-interest`): valid + spam/invalid payload | N/A — no route handler exists (only an empty `__tests__` dir remains under `api/marketing/city-interest`) |
| M4 | Sitemap/SEO: generated content sitemap URLs return 200 (sample) | ✅ E2E public (`legal-roulette-and-seo.spec.ts` — sitemap.xml urlset + robots.txt) |

## 13. Error & resilience (P2)

| # | Case | Layer |
|---|---|---|
| E1 | `/error/403|404|500` pages render with nav back | E2E public |
| E2 | Background window error does not blank the app (regression: commit `d8677b0`) | Manual |
| E3 | Offline/failed API on discover → error state, retry works | Manual |

## 14. Mobile (Capacitor) smoke (P2)

Android/iOS shells exist. Per release: cold start, auth persists, deep link into
restaurant/list, safe-area on notched devices, back-button behavior (Android).

Runbook: **`docs/mobile-smoke-runbook.md`** — defines the full pass with a
coverage matrix, prerequisites (`cap:sync` / `cap:open:*`), Part A automated
checks, and Part B manual on-device steps with pass criteria.

- **Automated (emulated viewport):** `tests/e2e/public/mobile-smoke.spec.ts`
  (public project, Pixel 5 preset) — asserts `viewport-fit=cover`, no horizontal
  overflow at 320/390px, ≥44px header touch target, and that deep-link target
  routes (`/restaurants/[id]`, `/lists/[id]`) render at a phone viewport. Run:
  `npm run test:e2e -- --project=public mobile-smoke`.
- **Manual on device (Part B):** cold start, auth-across-restart, OS deep link,
  real notch insets, Android hardware back — cannot be headless-automated.
  Reuse `docs/qa-app-checklist.md` viewport/touch/landscape sections.

> **Known gap:** OS App/Universal Links are not configured (Android manifest has
> only `MAIN`/`LAUNCHER`; iOS has no `CFBundleURLTypes`/associated-domains), so
> tapping an external restaurant/list link opens the browser, not the app. The
> in-WebView `appUrlOpen` same-origin handler exists
> (`src/components/capacitor/capacitor-init.jsx`). Tracked as a runbook follow-up.

---

## Execution order (suggested)

1. **Phase 1 (P0):** Stripe guard-rail API tests (B1–B8, B13–B14) — fast, no browser; onboarding E2E (O1–O5); auth register/error paths (A1–A6).
2. **Phase 2 (P0/P1):** Money path with Stripe CLI (B9–B12, C1–C3); paywall visibility matrix (B15); settings billing/subscriptions (S3–S4).
3. **Phase 3 (P1):** Discover/search/map (D1–D5), restaurant reviews (R3), lists additions (L1–L4).
4. **Phase 4 (P2):** Roulette, admin guard, marketing 404s, error pages, Capacitor manual pass.

## Known environmental flakiness

The webpack dev server logs `Server is approaching the used memory threshold,
restarting...` and restarts several times during a full ~30-min single-worker
run. When a restart coincides with a cold route compile, simple public pages
(about, contact, marketing geo, blog 404, admin) can exceed the 60s test
timeout. These same tests pass in isolation in 7–30s. Mitigations: CI already
sets `retries: 1`; locally, run the `public` and `dashboard` projects
separately, or `--last-failed` after a full run. Not a product regression.

## Test data & environment needs

- Seeded users via `tests/e2e/support/supabase-service.ts`: (a) onboarding-incomplete user, (b) completed free user, (c) creator with Connect charges enabled + one monetized list, (d) subscriber of that list, (e) snapshot buyer, (f) admin.
- Stripe test mode keys in `.env.local`; `npm run stripe:listen` for webhook forwarding; test cards 4242 4242 4242 4242 (success) and 4000 0000 0000 0341 (attach-fail).
- New Playwright project `api` (no browser, `request` only) for route-handler tests, or fold into `public` with `test.use({ storageState: undefined })`.
- Keep destructive cases (delete account) on disposable seeded users only.
