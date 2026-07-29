# Product Requirements Document — NomNom

**Document type:** As-implemented baseline (derived from repository `v5.7.0` + Supabase migrations).  
**Product one-liner (from `package.json`):** Discover restaurants through creators and real people.  
**Primary market context:** Portugal (Lisbon P0, Porto next) — aligned with `docs/marketing-brief-portugal-ugc.md`.

---

## 1. Executive Summary

- **Problem statement:** People discover places via short-form video and friends, but those signals are fragmented (saved posts, maps, chat). They lack a single place that ties **trusted humans** (creators, locals) to **concrete venues** in their city, with lists they can reuse and share.

- **Proposed solution:** A signed-in web app centered on the user’s **home locality** (local market), surfacing **suggested creators**, **tag-filterable restaurant discovery**, **collaborative lists**, **map exploration**, and **public profiles/lists** for sharing. A **Nom Roulette** feature randomizes picks from restaurants in a defined map bounding box to reduce decision fatigue.

- **Success criteria (baseline — refine with product analytics):**
  1. **Activation:** Users complete onboarding (home location + preferences) and reach `/dashboard/discover` with non-empty restaurant feed when data exists for their municipality.
  2. **Engagement:** Users add restaurants to lists (including default favorites) and return to saved content (`/dashboard/saved`, list detail).
  3. **Shareability:** Published lists and public profiles (`/lists/:id`, `/u/:handle`) load without authentication for viewers (SEO/social distribution).
  4. **Reliability:** Core reads (`restaurants_for_municipality`, `get_suggested_creators_for_municipality`, list mutations) complete without user-visible errors under normal load (specific SLAs **TBD** with ops).
  5. **Quality bar (engineering):** Error monitoring (Sentry) and product analytics (PostHog) instrumented so regressions are detectable (**concrete dashboards TBD**).

---

## 2. User Experience & Functionality

### User personas

| Persona | Role | Notes (from code + brief) |
|--------|------|----------------------------|
| **Signed-in diner** | Primary | Sets home locality; discovers via feed, map, roulette; saves to lists. |
| **List curator / host** | Secondary | Creates public/private lists, publishes, collaborates (DB support for collaboration). |
| **Creator / local voice** | Tertiary | Surfaces as **suggested creators** by city; public profile at `/u/:username`. |
| **Anonymous visitor** | Edge | Marketing home, FAQs, contact, public list/profile routes. |

### User stories & acceptance criteria

**Auth & account**

- **US-A1:** As a new user, I want to register and verify email so I can access the dashboard.  
  **AC:** Flows exist for login, register, verify, forgot password, new password (`src/app/(frontend)/auth/*`); callback route handles Supabase auth return.

- **US-A2:** As a returning user, I want my session respected across server actions so data loads securely.  
  **AC:** Server components use `createSupabaseServerClient()`; unauthenticated discover load returns empty datasets and `error: 'unauthorized'` in `loadDiscoverPageData`.

**Onboarding**

- **US-O1:** As a new user, I want to set where I eat and what I care about so my feed is relevant.  
  **AC:** `OnboardingWizard` receives user id and tag catalog from `fetchRestaurantTagsCatalog()`; user profile stores `home_locality_id` / `home_locality_slug` / labels (`users` + related migrations).

**Discover (home)**

- **US-D1:** As a signed-in user, I want to see restaurants in my city and creators to follow.  
  **AC:** Discover page calls `loadDiscoverPageData()`: RPC `get_suggested_creators_for_municipality`, RPC `restaurants_for_municipality` (limit 36), and maps saved list membership per restaurant via `listIdsByRestaurantIdsForUser`.

- **US-D2:** As a user, I want to filter/tag restaurants consistently with map UX.  
  **AC:** Migrations add restaurant tags, spatial filters, spotlight search RPCs, map sort (relevance / distance / rating), slider controls — implementation surfaces in discover/map sections (exact UI copy **i18n-driven**).

**Restaurant detail**

- **US-R1:** As a user, I want a detail page per restaurant from the feed or map.  
  **AC:** Route `dashboard/restaurants/[id]` exists; rich metadata supported per migrations (address, awards, vibes, etc.).

**Lists**

- **US-L1:** As a user, I want default favorites and custom lists.  
  **AC:** RPC `ensure_default_favorites_list`; signup migration seeds default lists; `fetchMyLists`, `createList`, `publishList`, item mutations in `list-actions.js`.

- **US-L2:** As a user, I want to share a list publicly.  
  **AC:** Public route `/lists/[id]` plus dashboard variant; `visibility`, `published_at` on `lists`.

- **US-L3:** As a collaborator, I want shared editing (where enabled).  
  **AC:** `lists_collaboration` migration — business rules enforced in RLS/policies (**verify in Supabase dashboard**).

**Map**

- **US-M1:** As a user, I want to explore venues on a map with saved overlays.  
  **AC:** `/dashboard/map` with RPCs for bbox, saved restaurants for map, metadata payloads (migrations through `restaurants_in_bbox_*`, `saved_restaurants_for_map_*`).

**Nom Roulette**

- **US-N1:** As an indecisive user, I want a random pick from a pool of places.  
  **AC:** `NomRouletteView` loads the viewer's circle pool via `fetchCircleRestaurantIds`; the public `/roleta/lisboa` tool loads the full Lisbon-bbox pool via `fetchPublicLisboaRouletteRestaurantIds` (lean ids, cap `ROULETTE_POOL_FETCH_LIMIT`); spin picks uniformly at random and navigates to result; empty pool shows warning snackbar.

**Profiles**

- **US-P1:** As a user, I want a public handle page.  
  **AC:** `/u/[username]` and mirrored dashboard route for authenticated shell; social fields and follow counts via dedicated migrations/RPCs.

**Settings**

- **US-S1:** As a user, I want to edit profile, appearance, preferences, billing, and account safety.  
  **AC:** Settings hub + drill pages: profile edit, appearance, preferences, billing, delete account, FAQs, support.

**Content / posts (CMS placeholder)**

- **US-C1:** As a visitor, I might read editorial posts.  
  **AC:** `/post`, `/post/[title]` exist; `/api/posts` returns empty stub with note to wire CMS — **not a completed content product**.

**Feedback & comms**

- **US-F1:** As a user, I want to send feedback or contact support.  
  **AC:** `/dashboard/feedback`, `/contact-us`, email API route `api/email/send` (Resend).

### Non-goals (current codebase)

- **Payment webhooks:** `POST /api/webhooks` returns **410**; payment-driven flows are explicitly not live.
- **Creator “manage mentions”** full experience: routed to **placeholder** (`paths.dashboard.manageMentions` → `/dashboard/blank`).
- **Editorial CMS:** Posts API is stubbed; no commitment to v1 content operations in code.
- **Native mobile apps:** Web-first Next.js app only.

---

## 3. AI System Requirements

**Not applicable** to the current production paths: no OpenAI / Vercel AI SDK / agent loops in `src/`. Rich text (TipTap) and search/filter RPCs are **deterministic**.

**Future (optional):** If adding recommendations or copy assistance, define tool/API boundaries, PII handling, and offline evaluation sets separately.

---

## 4. Technical Specifications

### Architecture overview

- **Framework:** Next.js **16** (App Router), React **19**, default dev port **3032**.
- **UI:** Material UI v7, Emotion, Tailwind CSS v4, Framer Motion; icons (Iconify, Lucide, MUI icons).
- **State & data:** Server Actions (`'use server'`) + Supabase client; SWR where used on client.
- **i18n:** `i18next` / `react-i18next` with locale files under `src/locales`.
- **Geo:** Mapbox / `react-map-gl`; PostGIS in Supabase (localities and municipalities in `cities`, `list_location_localities`, `locality_for_point`, `municipality_for_point`, bbox queries).

**High-level data flow (discover):**

1. Request hits `dashboard/discover` (RSC).
2. Server creates Supabase client, loads `auth.getUser()` and `users` row (home locality).
3. RPCs fetch creators + restaurants; list membership batch-loaded for cards.
4. `DiscoverView` hydrates filters/cards client-side per props.

### Integration points

| System | Purpose |
|--------|--------|
| **Supabase** | Auth (SSR `@supabase/ssr`), Postgres, RPCs, RLS |
| **Mapbox** | Map rendering / geospatial UI |
| **Resend** | Transactional email (`api/email/send`) |
| **Self-hosted notifications** | In-app bell + Web Push (VAPID) for list-update alerts; Supabase `notifications` / `push_subscriptions` tables |
| **PostHog** | Product analytics |
| **Vercel** | Analytics & Speed Insights (`@vercel/analytics`, `@vercel/speed-insights`) |
| **Sentry** | `@sentry/nextjs` error monitoring |
| **Stripe / billing** | UI hooks (`isSubscriber`) exist; server webhooks **disabled** |

### Security & privacy

- **Auth:** Supabase session; server-side user checks on sensitive actions.
- **Public vs private:** Lists have `visibility` + `published_at`; public routes must not leak private list data (**enforce via RLS** — treat policies as source of truth).
- **PII:** Profile fields, email, location — align with GDPR/PT DPA for EU users (**formal DPIA TBD**).
- **Secrets:** Environment-based keys for Supabase, Mapbox, Resend, Sentry, PostHog (**never commit**).

---

## 5. Risks & Roadmap

### Phased rollout (as-is → next)

| Phase | Scope |
|-------|--------|
| **MVP (implemented)** | Auth, onboarding, discover by municipality, lists (incl. default favorites + publish), map, roulette, profiles, settings shell, monitoring/analytics hooks. |
| **v1.1 (gaps in code)** | Wire posts/CMS or remove stub routes; replace `manageMentions` placeholder; define subscription purchase path if `isSubscriber` is product-critical. |
| **v2.0 (product)** | Deeper creator workflows, attribution, optional reservations/partners, expansion beyond Portugal seed data — **requires product strategy**, not only engineering. |

### Technical risks

| Risk | Mitigation idea |
|------|-----------------|
| **RPC/RLS drift** | CI or manual checks that migrations match generated types (`yarn generate-types`); integration tests on critical RPCs. |
| **Empty discover** | Users without `municipalityId` get no restaurants — UX should guide onboarding completion (verify empty states). |
| **Roulette bbox vs user city** | Roulette uses **fixed** `ROULETTE_PREVIEW_BBOX`, not user home — may confuse; align bbox with home market or label clearly. |
| **Third-party cost/latency** | Mapbox, Supabase, Resend usage — monitor quotas; Sentry/PostHog sampling. |
| **Subscription without webhooks** | Billing claims may diverge from payment provider — reconcile before monetization push. |

---

## Appendix — Key routes (reference)

Implemented route prefixes include: `/`, `/onboarding`, `/auth/*`, `/dashboard` (redirects to `/dashboard/discover`), `/dashboard/map`, `/dashboard/restaurants/[id]`, `/dashboard/saved`, `/dashboard/lists/[id]`, `/dashboard/roulette`, `/dashboard/settings/*`, `/lists/[id]`, `/u/[username]`, `/post/*`, `/faqs`, `/contact-us`, maintenance/coming-soon/error pages.

Canonical path helper: `src/routes/paths.js`.
