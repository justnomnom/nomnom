# NomNom — implementation specs for the full feature backlog

**Date:** 25 July 2026
**Companion to:** `docs/feature-backlog.md` (what and why), `docs/competitor-review-mining.md` (evidence),
`docs/plan-visited-import-comments.md` (deep plans for 1.1 / 2.1–2.3 / 4.1).

**Stated constraints for this pass:** revenue model is **creator monetisation**; **no audience
constraint** (residents and visitors both), so sequencing below is by effort-to-value with divergences
flagged.

Each spec gives: what it is, the evidence, data model, files, and tests. Effort is rough dev days for
one engineer, design excluded. Features already specced in depth elsewhere are summarised with a
pointer rather than repeated.

---

## 0. Constraints discovered while researching

These shape several specs and are worth reading first.

1. **Analytics is client-side PostHog only.** `src/libs/analytics/analytics-provider.js` wraps
   `src/libs/posthog/`; there is a documented `EVENT_SCHEMAS` registry and a tracking matrix
   (`docs/analytics-tracking-matrix.md`), but **no server-side event store**. Anything that shows a
   creator "what happened to my list" needs either PostHog's query API or a first-party events table.
   This is the single biggest hidden cost in the creator-monetisation track (§6).
2. **Reviews have no moderation, reporting or flagging anywhere in the codebase.** One review per user
   per restaurant, self-edit and self-delete only. `restaurant_images.moderation_status` exists but has
   no UI and is not enforced on read (see `docs/db/SCHEMA-REVIEW-2026-07-24.md` §12).
3. **Sponsored placements are disclosed in exactly one place** —
   `src/sections/map/map-spot-sheet-inner.js:392-394` renders a "Sponsored" chip. Sponsored restaurants
   ranked first in Discover, injected via `inject_after_organic`, or shown on the map canvas or the
   restaurant detail page carry **no disclosure at all**. This is a compliance gap, not just a feature.
4. **Feedback is entirely unscoped.** The feedback page is a Sleekplan iframe with no props; the FAQ
   contact form attaches no entity id. A user reporting "this address is wrong" must describe it in
   prose. `submitLlmFeedbackEmail` in `src/auth/actions/email-actions.js` exists but has **no callers**
   and its `contentType` enum (plan/goal/reflection) is inherited from a template.
5. **The follow circle is deliberately anonymous** — RPC `restaurant_follow_circle_for_viewer` returns
   `{ total, members: [{ userId, avatarUrl }] }`, max 3, no names, no handles, no timestamps. Faces
   without identity. §3.1 changes this on purpose.
6. **List-save timestamps are read but never shown.** `rowMentionActivityMs` sorts by them;
   nothing displays "saved 3 days ago".
7. **Opening hours are written at ingest and never read.** They live inside `restaurants.metadata`
   JSONB (`open_hours`, `hours_parsed`, `timezone`, `status`, `is_closed`, `closed_reason`) — there is
   no dedicated column. Crucially, `src/lib/slim-restaurant-card-metadata.js` allowlists only
   `['rating','review_consensus','photos','hero_url','image_url']` and **explicitly strips
   `hours_parsed` and `open_hours`** from every RPC row before it reaches the client. Surfacing hours
   is therefore not a client-side change (see 1.5).
8. **`price_level` is never referenced anywhere in `src/`.** Price exists only as a tag category
   (`tags.category = 'price'`, `PRICE_TAG_SLUGS`), used in the map's tag sheet.
9. **Discover applies none of the filters its RPC supports.** `restaurants_for_municipality` accepts
   `p_tag_slugs`, `p_match_all`, `p_min_rating`, `p_vibe_key`, `p_category_key` — Discover passes them
   all null on every call, and its "filter" button is a link to `paths.dashboard.map?filters=open`.
   Filtering on Discover is wiring, not new SQL.
10. **Roulette has no filters, no exclusion set and no re-roll.** Both views load an id-only pool
   (`circle_restaurants_for_viewer` RPC for the authed view, a Lisbon bbox for the public
   `/roleta/lisboa` route) and pick uniformly at random. A spin is a hard navigation, so "re-roll"
   means pressing back.
11. **Account deletion does not touch Stripe.** See §5.2 — this is the highest-severity finding in this
   document.
12. **The platform fee is defined twice** — `getPlatformFeePercent()` (env-driven,
   `list-stripe-constants.js`) and a hardcoded `const PLATFORM_FEE = 0.1` inside `getCreatorListStats()`.
   Changing the env var silently desyncs what creators are shown.
13. **Notification preferences cover one event type of six.** Three toggles, all `list_update`. See §5.4.

### Findings from the full-codebase review pass

14. **`src/libs/supabase/types.ts` is empty (0 bytes).** `npm run supabase:types` has never produced
    output that landed in the repo. Combined with gitignored migrations, **there is no schema snapshot
    in version control at all** — the only in-repo descriptions of the database are the two reviews in
    `docs/db/`. Every migration in these specs should be accompanied by an update there, or the next
    person plans blind. Generating types is also the cheapest possible win for this codebase.
15. **Data access is RPC-heavy: 42 distinct RPCs across 26 tables.** Notably `create_user_list`
    (list creation is a `SECURITY DEFINER` RPC, not an insert), `my_lists_for_save`,
    `map_my_owned_lists`, `map_my_collaborator_lists`, `dashboard_following_lists`,
    `map_following_lists`, `public_lists_for_profile`, `list_freemium_preview_items`,
    `saved_restaurants_for_map`. Anything that changes what a list read returns is potentially a SQL
    change to a gitignored function — plan around this rather than into it (see 1.1).
16. **`lists` is touched at 57 call sites, 38 of them in `list-actions.js` alone** (2850 lines). That
    file is the single highest-risk file in the codebase for every feature in Group 1.
17. **There is already a pattern for hiding lists from the UI**:
    `src/utils/filter-e2e-test-lists.js` (`filterE2eTestListsForDisplay`), applied at **9 call sites**
    in `list-actions.js` immediately after each RPC returns. System-list hiding should reuse this shape
    exactly rather than inventing one — see 1.1.
18. **Health baseline.** `tsc --noEmit` passes clean. `npm test` reports 780 pass / 14 fail **in this
    container**, and all 14 are `ERR_MODULE_NOT_FOUND` (`dayjs`, `ai`, `@supabase/ssr`,
    `@mui/material`) — an incomplete `node_modules`, not code regressions. Note that `CLAUDE.md` claims
    "847 pass, 0 fail" while the suite currently declares 794 tests total, so that line is stale
    whichever way the dependency issue resolves. **Confirm a genuinely green baseline before starting
    any of this work**, or every subsequent failure will be ambiguous.
19. **`npx knip` reports 396 unused files, 117 unused exports, 29 unused dependencies and 171 unlisted
    dependencies.** Much of it is Minimal-template leftovers (`_mock/`, `file-thumbnail/`,
    `settings-shell-shared.js` exports). This is not urgent, but it means knip's signal is currently
    useless as a regression check — the checklist item "run knip" cannot catch anything new until the
    baseline is cleaned. Worth one focused cleanup pass before Release 1.

---

# Group 1 — Close the loop on saves

## 1.1 Been / to-try state · 3–4 d · *fully specced in `plan-visited-import-comments.md` §1*

Signup already seeds "Must go" / "Visited" lists via a DB trigger. Add `lists.system_key`
(`'must_go' | 'visited'`) plus a guard trigger so they are identified structurally rather than by
name and cannot be deleted, published or monetised. Visit toggles compose existing
`addListItem` / `removeRestaurantFromList`. Badge, filter chips, Roulette exclusion on top.

**Revision from the code review — the hiding problem is smaller than it looked.** An earlier draft
said "audit ~20 `from('lists')` call sites and filter in the select". Two findings change that:

- Most list reads are **RPCs with fixed column sets** (`my_lists_for_save`, `map_my_owned_lists`,
  `map_my_collaborator_lists`, `dashboard_following_lists`, `map_following_lists`,
  `public_lists_for_profile`). `mapMyListsForSaveRpcRow` (`list-actions.js:391`) maps eight named
  fields — `system_key` would not be among them. Filtering *by column* would mean editing six
  gitignored SQL functions and their mappers.
- But **`filterE2eTestListsForDisplay` already solves this exact problem**, hiding `E2E …` lists from
  the UI at 9 post-RPC call sites in `list-actions.js` (`:475, :513, :732-735, :1209, :1253, :1423`).

**So: filter by id, not by column.** `fetchMySystemListIds()` (needed anyway for the visited toggle)
returns `{ visited, must_go }`. Add `filterSystemListsForDisplay(lists, systemListIds)` next to the
E2E helper and apply it at the same 9 sites. No RPC changes, no mapper changes, no SQL, and the
pattern is already established and understood in this file.

**Remaining risk is `create_user_list`.** List creation is a `SECURITY DEFINER` RPC
(`list-actions.js:749`, also called by the Maps importer at `google-maps-import-actions.js:370`), so
the guard trigger in 1.2 must be verified against it — an RPC that sets columns the trigger rejects
will fail closed and break list creation for everyone. Test that path first.

## 1.2 Imports land as "been" · 0.5 d · *specced in `plan-visited-import-comments.md` §1.4b*

A checkbox on the import modal that adds the Visited list as a second commit target for the same
matched rows. `buildListItemRows` called twice with two list ids. No new write path.

## 1.3 Private notes on a saved spot · 1–2 d

**Why.** Answers the category's sharpest critique — *"social pressure corrupts honesty: you're writing
for the owner, not yourself."* Beli's named downside is high social pressure. Today the only way to
record an opinion is `restaurant_reviews`, which is public within your follow graph.

**Data.** `alter table list_items add column note text check (char_length(note) <= 500);`
Notes belong to the *item*, so they inherit list RLS — a note on a private list is private, and a note
on a shared list is visible to members. Make that explicit in the UI copy rather than implying
absolute privacy.

**Files.** `src/auth/actions/list-actions.js` — extend `addListItem` and add `setListItemNote`. Read
path: add `note` to `listItemsSelect` (`:2344`) and `LIST_ITEMS_MENTION_SELECT` (`:213`). UI: the note
row goes in `save-to-list-sheet.js` beside the must-try picker, and renders on the list row and in
`map-spot-sheet-inner.js`.

**Copy.** Must be unambiguous about audience: "Only you can see this" on a private list, "Visible to
people on this list" on a shared one. Getting this wrong is a trust incident.

**Tests.** Unit for length/trim normalisation; e2e that a note on a private list is invisible to a
non-member and that a collaborator sees a note on a shared list.

## 1.4 Resurface what you saved · 2–3 d

**Why.** The defining failure of Instagram, TikTok and Google Maps saves alike — "most saved content is
never revisited; the platform has no mechanism to bring you back."

**Three parts, shippable independently.**
1. A counter on `src/sections/saved/view/saved-view.js` — "47 saved · 6 been" using `fetchMyVisitCounts`
   from 1.1. Half a day.
2. A Roulette mode restricted to saved-and-unvisited spots. Cheap: both roulette views hold an
   **id-only pool** in state (`fetchCircleRestaurantIds` → RPC `circle_restaurants_for_viewer`, or the
   Lisbon bbox pool), and pick with `pool[Math.floor(Math.random() * pool.length)]`. Excluding visited
   ids is a `pool.filter()` around `nom-roulette-view.js:129-155` using the visited id set from 1.1 —
   no RPC change. While there, add a re-roll: a spin is currently a hard navigation, so the only way
   to respin is the back button.
3. An **opt-in** monthly digest: "12 spots you saved and haven't tried." Reuse
   `src/libs/notifications/send-list-update-digests.js` and add a preference key to the `DEFAULTS`
   object in `notification-preferences-actions.js`. Default **off** — §5.4 is about restraint, and a
   feature that undercuts it is self-defeating.

**Tests.** Unit for the "saved but not visited" set operation (pure, given two id lists). E2E for the
counter. The digest needs a scheduled-job test at the same level as the existing digest sender.

## 1.5 "Open now" · 2–3 d — *harder than it looks, still worth it*

**Why.** Hours are already parsed at ingest into a clean structure and no user has ever seen them.

**The catch.** An earlier estimate of one day assumed the data reaches the client. It does not.
`src/lib/slim-restaurant-card-metadata.js` strips `open_hours` and `hours_parsed` from every RPC row —
deliberately, because metadata averages ~7.7 KB/row and the map refetches on every pan. Adding them to
`CARD_METADATA_KEYS` would put that payload cost on the hottest path in the product. So this is a
server-side feature.

**Recommended split.**

*Phase A — display (1 d, no filter).* Show "Open now" / "Closed" / "Opens at 19:00" on the **restaurant
detail page** and the **map spot sheet**, both of which already do a per-restaurant fetch where the
full metadata is available (`fetchRestaurantByIdForSsr` selects `metadata` wholesale). Zero impact on
the map payload. Arguably most of the user value: people check hours when considering one place, not
when scanning a map.

*Phase B — filter (1–2 d).* Add a computed boolean to the RPCs rather than shipping the raw hours: a
SQL helper `restaurant_is_open_at(metadata, ts)` and an optional `p_open_now boolean` parameter on
`restaurants_in_bbox_pins`, `restaurants_for_municipality` and the saved/following map RPCs. Returns a
single bit per row instead of a KB of JSON. Add the chip to `map-tag-filter-sheet.js`, and add an
`openNow` field to the AI search plan schema in `src/lib/restaurant-search-agent.js` so "somewhere open
now near Cais do Sodré" works.

**Shared helper.** `src/libs/restaurant/is-open-now.js` — `isOpenNow(hoursParsed, now, tz)` returning
`'open' | 'closed' | 'unknown'`. Used directly by Phase A; Phase B mirrors its logic in SQL. Keeping
two implementations in sync is the cost of not shipping the payload — test them against the same
fixtures.

**Tests.** Unit is the whole story: past-midnight ranges (`crosses_midnight` is already a field on
parsed intervals), split lunch/dinner service, missing days, `is_closed` / `closed_reason` set,
malformed strings, and the unknown-hours fallback (must render nothing, never "Closed").
`map-google-place-payload.js` already has fixtures in `src/libs/restaurant-ingest/__tests__/` — reuse
them so the reader and the writer agree.

## 1.6 Group decision mode · 4–5 d

**Why.** The only feature in this document with no competitor equivalent. Every list app stops at the
list; nobody helps a group decide. It is also inherently viral — the share link pulls in people who do
not have an account.

**Data.**
```sql
create table public.decision_polls (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.users (id) on delete cascade,
  title text check (char_length(title) <= 120),
  status text not null default 'open' check (status in ('open','closed')),
  closes_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.decision_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.decision_polls (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  sort_order int not null default 0,
  unique (poll_id, restaurant_id)
);
create table public.decision_poll_votes (
  poll_id uuid not null references public.decision_polls (id) on delete cascade,
  option_id uuid not null references public.decision_poll_options (id) on delete cascade,
  voter_key text not null,          -- user id, or a signed anonymous key for guests
  created_at timestamptz not null default now(),
  primary key (poll_id, voter_key)  -- one vote per participant, changeable
);
create index decision_poll_options_poll_id_idx on public.decision_poll_options (poll_id);
create index decision_poll_votes_option_id_idx on public.decision_poll_votes (option_id);
```

**The guest-voting decision is the crux.** Requiring signup to vote kills the virality; allowing
anonymous votes invites ballot stuffing. Recommended: guests vote with a signed cookie key, one vote
per key, results visible to everyone, and the poll creator sees "3 of 5 voted" rather than who voted.
This needs a `SECURITY DEFINER` RPC for the guest path since `anon` must not hold DML — consistent with
finding #5 in `docs/db/SCHEMA-REVIEW-2026-07-24.md`.

**Files.** New `src/auth/actions/decision-poll-actions.js`; new public route
`src/app/(frontend)/decide/[id]/` (unauthenticated, like the existing public list route); creation
entry points from the saved view, a list, and Roulette ("can't decide? ask them"). Add
`paths.decide(id)` to `src/routes/paths.js`.

**Tests.** Unit for vote tallying and tie-breaks. E2E for the full flow including a guest voter in a
fresh browser context — the existing public-list specs are the model.

**Note.** Closing the poll should offer "add the winner to a list" and "mark as visited" — that is how
this feature feeds back into 1.1 rather than being a side pond.

## 1.7 Occasion filters · 1–2 d

**Why.** The tag catalog, filter sheet and chip UI all exist. This is curation plus a small amount of
mapping, not engineering.

**Approach.** Define occasion presets (date night, quick lunch, group dinner, solo, brunch) as named
bundles of existing tag slugs in a single constants file, and render them as one-tap chips above the
raw tag list. Do **not** add a taxonomy — presets that compile down to existing tags keep the data
model untouched and can be tuned without a migration.

**Discover gets more than it looks.** `restaurants_for_municipality` already accepts `p_tag_slugs`,
`p_match_all`, `p_min_rating`, `p_vibe_key` and `p_category_key`, and Discover passes **all of them
null** on every call — its "filter" button is a link to `paths.dashboard.map?filters=open`. So giving
Discover real filtering is wiring existing RPC parameters, not new SQL. The AI search plan already
emits `vibeKey` (`date | friends | cheap | corporate`) and `categoryKey` (`daily | coffee | hidden |
datecat`), which is most of an occasion taxonomy already sitting unused on the feed.

**Files.** `src/sections/discover/view/discover-view.js` (~723, ~802 — where the null filter args are
passed), `src/sections/map/map-tag-filter-sheet.js`, plus a constants module with the presets. Reuse
the existing `mustTagSlugs` / `shouldTagSlugs` plumbing.

**Careful.** Map tag multi-select is **AND**, not OR (`matchAll: selectedTagSlugs.length > 0`). An
occasion preset that bundles four tags with AND semantics will return nothing. Presets must map to
`shouldTagSlugs` (OR) or set `matchAll: false` explicitly.

**Tests.** Unit that every preset's slugs exist in the tag catalog — a preset referencing a slug that
was renamed should fail the build, not silently return nothing.

---

# Group 2 — Getting spots in

## 2.1–2.3 Instagram / TikTok import · 8–9 d · *fully specced in `plan-visited-import-comments.md` §2*

Order: Instagram data-export upload (bulk, ToS-clean) → TikTok oEmbed (public, documented) → Instagram
single-URL (fragile, ToS-adverse, feature-flagged). Pipeline mirrors
`src/auth/actions/google-maps-import-actions.js` beat for beat, including never auto-creating
restaurants. Matching without coordinates is the hard part — locality scoping plus
`nameMatchScore >= 2`, exact-only nationwide.

## 2.4 Native share sheet · 5–8 d, native work

**Why.** The highest-retention version of import: save from Instagram without opening NomNom.

**Reality.** The apps are Capacitor shells loading the hosted site (`capacitor.config.ts` uses
`server.url`). No plugin in `package.json` provides a share target. This needs an iOS Share Extension
and an Android `ACTION_SEND` intent filter, each deep-linking into the web app with the shared URL.
Both require native builds, app-store review, and a deep-link handler on the web side.

**Recommendation.** Treat as a separate project after 2.1–2.2 prove the extraction works. Do not put it
in the importer's estimate.

## 2.5 Paste anything · 3–4 d

**Why.** The real input format for a Portuguese restaurant recommendation is a friend's WhatsApp
message — prose, not a link. The LLM plumbing already exists
(`src/libs/restaurant-ingest/qwen-json-chat.js`, `src/lib/restaurant-search-agent`).

**Approach.** One textarea. Detect whether the input is a URL (route to the relevant extractor) or free
text (route to `extract-venue-candidates` from 2.1). Same preview → confirm → commit UI. This is mostly
reuse once 2.1 lands, which is why it is cheap.

**Tests.** Unit for the input-type router; fixtures of real WhatsApp-style messages in Portuguese
including accented names and venue prefixes (`normalizeName` in `pick-restaurant-match.js` already
handles `tasca`, `cervejaria`, etc.).

---

# Group 3 — Trust

## 3.1 Provenance chips · 2–3 d

**Why.** `BRAND.md` promises "picks from people you trust, not algorithms", but the product shows
anonymous avatars. The follow-circle RPC returns `{ total, members: [{ userId, avatarUrl }] }` — faces
with no names — and save timestamps are read for sorting but never displayed.

**Change.** Extend `restaurant_follow_circle_for_viewer` to return `display_name` and `username`
alongside the avatar, and add the most recent save timestamp. Render "Saved by @ana and 2 others ·
May 2026", with avatars linking to `paths.dashboard.userPublic(handle)`.

**Watch out.** The current anonymity may be deliberate — a privacy choice, not an oversight. Confirm
before changing it, and consider gating name disclosure to accounts the viewer follows *mutually*, or
behind a profile preference. The server-side filters in the restaurant page
(`filterListMentionsToFollowsOnly`, `filterListMentionsToSelfOrReviewBacked`) already encode a
deliberate "no 'someone saved this' cards" policy — this feature must not quietly reverse it.

**Files.** The RPC (SQL), `src/libs/restaurant/follow-circle.js` (`normalizeFollowCircle`),
`src/sections/restaurant/restaurant-follow-circle-card.js`.

**Tests.** Unit for the normaliser with the new fields; e2e that a non-followed saver is not named.

## 3.2 Paid / gifted disclosure · 2 d · **ship before creator monetisation scales**

**Why.** Two distinct gaps. (a) World of Mouth's central criticism is curation that is marketing in
disguise — creators who are comped need to disclose. (b) More urgently, **sponsored placements are
disclosed in exactly one component**; the same paid restaurants rank first in Discover and appear on
the map and detail page with no label at all. That is a consumer-protection exposure, not a nice-to-have.

**Two pieces.**
1. Propagate the existing `is_sponsored` flag to every surface that consumes it and render the
   existing `sponsored_badge` chip. The flag already flows through `list-actions.js:1066/1158` and
   `location-actions.js` — the label just is not rendered outside the map sheet.
2. Add a creator-set disclosure on list items: `list_items.disclosure text check (disclosure in
   ('gifted','paid','affiliate'))`, rendered as a chip on the item wherever it appears.

**Tests.** E2E asserting the badge renders on every surface that can show a sponsored restaurant —
this is the kind of thing that regresses silently.

## 3.3 Report a wrong or closed spot · 3–4 d

**Why.** Data-quality complaints sink Beli and Mapstr, but the real grievance is silence. There is no
report flow anywhere in the codebase today, and feedback carries no entity id.

**Data.**
```sql
create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.users (id) on delete set null,
  target_type text not null check (target_type in ('restaurant','review','list','image')),
  target_id uuid not null,
  reason text not null check (reason in ('closed','wrong_info','duplicate','offensive','spam','other')),
  detail text check (char_length(detail) <= 1000),
  status text not null default 'open' check (status in ('open','resolved','rejected')),
  resolved_by uuid references public.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index content_reports_status_created_at_idx on public.content_reports (status, created_at desc);
create index content_reports_target_idx on public.content_reports (target_type, target_id);
```
Insert for `authenticated` where `reporter_id = auth.uid()`; select own reports only; admins read all
via the existing `assertAdminUser` path rather than an RLS role.

**The loop is the feature.** On resolve, notify the reporter with a new `report_resolved` notification
type. Silence is what people actually complain about.

**Files.** New `src/auth/actions/content-report-actions.js`; report entry point in the restaurant
detail toolbar and the map spot sheet; admin queue alongside
`src/sections/admin/sponsored-placements-admin-view.js`, reusing that view's table patterns.

**Also fix while here.** `email-actions.js:submitLlmFeedbackEmail` is dead code with a template-inherited
enum — either wire it to this flow or delete it (`npx knip` should already be flagging it).

## 3.4 "Locals eat here" signal · 5–7 d

**Why.** The Portugal wedge, and the hardest thing in this document for TheFork or Tripadvisor to copy.
Tripadvisor's rankings route visitors to exactly the places locals name as traps; local advice is
heuristic — Portuguese-only menu, off the tourist grid, busy at lunch, saved by residents.

**Signal sources, in order of reliability.**
1. **Resident vs visitor saves** — the strongest and entirely first-party. `users.home_locality_id`
   already exists; a save from someone whose home locality matches the restaurant's is a resident save.
   Ratio of resident saves to total is the core metric.
2. **Repeat visits** — a resident marking somewhere visited more than once (needs 1.1 to store a
   count, which the current list-membership model does not; consider `list_items.visit_count`).
3. **Tag and metadata heuristics** — price tier, tourist-area geofence, `metadata.review_consensus`
   language cues. Weakest; use as a tiebreak only.

**Approach.** A nightly job computing a `restaurant_local_score` (0–1) into a small table, not computed
at read time. Surface as a single chip ("Locals' spot") above a threshold — **not** a numeric score,
which invites gaming and argument. Never expose the formula.

**Cold-start caveat.** At current data volume (the 2026-07-24 schema review notes 5 restaurants,
3 users, 1 list item in production) this signal is meaningless. It needs real save volume in Lisbon
first. Build it when there is data, not before — that is a genuine reason to sequence it late despite
its strategic value.

**Tests.** Unit the scoring function against synthetic save distributions, including the degenerate
cases (one save, all saves from one user, no resident saves).

## 3.5 Minimal permissions, asked in context · 1–2 d

**Why.** Beli's permission sheet — contacts, always-on location, microphone, photo library — is a live
liability for an app selling trust. Asking for less, later, and saying why is free differentiation.

**Current state is already decent on web:** `src/sections/onboarding/onboarding-wizard.js` requests
geolocation one-shot on the Location step (`:1056`, `:1101`), not at launch.

**Work.** (a) Audit the iOS/Android `Info.plist` / manifest permission strings in `ios/` and `android/`
and remove anything unused. (b) Write plain-language purpose strings — these are user-visible in the
native permission dialogs and are pure brand surface. (c) Add a short "what we ask for and why" section
to the privacy page. (d) Never request contacts.

**Tests.** Not really testable; make it a checklist item in `docs/qa-app-checklist.md`.

---

# Group 4 — Social depth

## 4.1 Comments per spot · 5–7 d · *fully specced in `plan-visited-import-comments.md` §3*

Members-only in v1. `list_item_comments` with a `list_item_user_can_read` `SECURITY DEFINER` helper
that ANDs in the snapshot-capture check, so the 2026-07-22 finding (snapshot buyers reading the whole
live list) is not reintroduced. New `list_item_comment` notification type; in-app only in v1.

## 4.2 Reactions on list items · 1–2 d · **ship with 4.1**

**Why.** Most people will never write a comment. A reaction is the same signal at a fraction of the
cost, and it carries the majority of the engagement in every product that has both.

**Data.** `list_item_reactions (list_item_id, user_id, emoji text check (emoji in ('👍','😍','🔥','🤔')), created_at, primary key (list_item_id, user_id))`.
A fixed set, not free emoji — it keeps the UI predictable and sidesteps moderation.

**Note.** `BRAND.md` restricts emoji to an approved set in *copy*; reactions are user content, not
brand copy, so the rule does not apply — but pick a set that does not fight the visual system.

**Files.** Same read path as 4.1 (attach counts in `enrichListItemsWithReviewsAndMustTry`), same
surfaces. Reuse the comment RLS helper verbatim.

## 4.3 Ask your circle · 5–7 d

**Why.** The behaviour already happens in WhatsApp: "where should I eat in Alfama on Friday?" Follows,
notifications and public profiles are all built, so the social graph work is done.

**Data.** `circle_questions (id, asker_id, locality_id, body, status, created_at)` and
`circle_answers (id, question_id, responder_id, restaurant_id, body, created_at)`.

**Distribution is the hard part, not the schema.** Sending every question to everyone who follows you
is a notification-spam machine and directly contradicts §5.4. Recommended: questions go only to people
the asker follows *and* who have the relevant locality as home or followed
(`user_location_follows` already exists), capped per day, and bundled into the existing digest rather
than sent as individual pushes.

**Sequence after 4.1/4.2** — reuse their notification grouping and thread UI rather than inventing a
second discussion surface.

---

# Group 5 — Hygiene

Unglamorous, cheap, and each removes an entire complaint category before it is earned. 5.1–5.3 together
are roughly a week.

## 5.1 Export your data · 2 d

**Why.** Nothing in the codebase does this today. Zomato liquidated its Portuguese subsidiary in July
2023 having already ceased operations — "platforms leave and take your saves with them" is a real
Portuguese memory, and an export button is the credible answer. It is also a GDPR portability
obligation, which makes it not-optional rather than merely nice.

**Approach.** A server action producing JSON (lists, items, notes, visited state, reviews, follows) and
a flattened CSV of saved spots. Generate on demand and stream; do not build a job queue for this data
volume. Rate-limit with the existing `rateLimitTake` / `clientIpKey` helpers used by
`email-actions.js`.

**Files.** New `src/auth/actions/data-export-actions.js`, a settings row under
`paths.dashboard.settings`, next to delete-account.

**Tests.** Unit for the serialiser (stable key order, no internal ids that leak other users, empty-state
shape). E2E that the download contains a seeded list.

## 5.2 Cancellation that cancels · 4–5 d · **highest-severity item in this document**

**This is not a feature request, it is a live billing defect.** `deleteAccount()`
(`src/auth/actions/auth-actions.js:184`) deletes `customers`, `user_restaurant_tag_preferences`,
`user_follows`, `users`, then the auth user. It **never touches Stripe**. Three consequences, in
severity order:

1. **A subscriber who deletes their account keeps being charged.** Their `list_subscriptions` rows are
   never cancelled and the Stripe subscription stays live on the creator's Connect account.
   `subscriber_user_id` becomes a dangling reference. This is the "deleting the app didn't stop the
   charges" complaint, except real.
2. **A creator who deletes their account orphans their Connect account.** `customers` holds
   `stripe_connect_account_id`; deleting the row destroys the only pointer, leaving an Express account
   in Stripe with a possibly non-zero balance and no way to reach it. Deletion is blocked when a
   creator has *active subscribers* (`settings-delete-view.js` + a server re-check returning
   `has_active_subscribers`), but not when they merely have a Connect account.
3. **Deletion never handles owned lists** — no delete, transfer or unpublish. Whatever happens is
   whatever the FK rules do.

Also missing across the money surface: **no Stripe billing portal, no invoice history, no receipt
download, no payment-method update.** The entire post-purchase surface is three cancel buttons. And the
"Manage" button in billing re-issues an `account_onboarding` link rather than an Express `loginLink`,
so creators have no payout dashboard.

**What already works** (do not rebuild): subscribers can self-cancel from two places —
`/dashboard/settings/my-subscriptions` and the creator's public profile — both calling
`cancelMyCreatorSubscription`, which sets `cancel_at_period_end: true` (no refund, access until period
end). Creator-initiated removal is immediate with a manually-prorated refund. The asymmetry is
deliberate and correct.

**Work, in order.**
1. **Cancel-on-delete.** In `deleteAccount()`, before any row deletion: cancel every active
   `list_subscriptions` row where the user is the subscriber, via Stripe on the relevant Connect
   account. Failures here **must** abort deletion rather than being logged and skipped — the current
   "log and continue" pattern is fine for preference rows and catastrophic for billing.
2. **Connect teardown.** For creators, either block deletion while a Connect account holds a balance,
   or record the account id somewhere that survives the user row. Surface what will happen on the
   confirmation screen before the user commits.
3. **Owned lists.** Decide and implement: orphan (current de-facto behaviour), delete, or offer
   transfer. State it in the confirmation copy.
4. **Stripe billing portal** for subscribers — invoice history and payment-method updates, a few hours
   of work against `stripe.billingPortal.sessions.create` on the Connect account.
5. **Confirmation emails** on cancellation, via the existing Resend helpers.
6. **Fix the duplicated platform fee** while in this code: `getCreatorListStats()` hardcodes
   `const PLATFORM_FEE = 0.1` instead of calling `getPlatformFeePercent()`.
7. **Cancellation reason** — a one-tap optional reason on cancel. There is no churn data being captured
   anywhere today, and this is the cheapest possible instrumentation of it.

**Tests.** Extend `tests/e2e/dashboard/delete-account.spec.ts` (the existing canary) with a seeded
*subscriber* who deletes their account, asserting the Stripe subscription is cancelled — not just that
the row is gone. Add it to the `test:e2e:money-path` script. Unit-test the fee arithmetic once it has a
single source.

**Copy.** Plain, no playful verbing, per `BRAND.md` §3.

## 5.3 Never lose a save · 1 d

**Why.** Mapstr's 300-place cap and Google Maps' random deletion are those products' loudest
complaints. We already impose no cap — this is mostly making a promise we already keep explicit, plus
one real behaviour: preserve `list_items.note` (1.3) when an item moves between lists rather than
dropping it, which is precisely what Google Maps does wrong.

**Work.** A line on the pricing page and an FAQ entry; a `moveListItem` action that carries notes and
must-try dishes across.

**Tests.** Unit that a move preserves note and must-try rows.

## 5.4 Notification restraint · 1–2 d

**Why.** The *plumbing* is unusually good — digest batching with a Vercel cron, 24h client-side
grouping, multi-device web push with dead-endpoint pruning, mute filtering in the fan-out. The
*controls* are not. Concretely:

- `DEFAULTS` in `notification-preferences-actions.js` is exactly three keys —
  `list_updates_in_app` (on), `list_updates_push` (on), `list_updates_email` (off) — **all for the
  single `list_update` type**. The other five types (`new_follower`, `list_subscribed`, `list_invite`,
  `join_approved`, `invite_accepted`) fire unconditionally with no preference and no mute.
- `notification_mutes` supports `'list'` and `'creator'`; **only `'list'` has any UI**. The creator
  mute is enforced in the fan-out and unreachable by users.
- **The email digest silently depends on the in-app toggle** — `sendListUpdateDigests` reads the
  `notifications` table, so a user with `list_updates_in_app: false` produces no rows and therefore
  gets no digest, whatever their email preference says. That is a bug, not a design.
- `notifyListFollowers` writes **one notification per added spot**, so a creator adding twelve places
  generates twelve rows. Grouping hides it in the panel; push does not.

**Work.** (a) Restructure preferences to a per-type matrix rather than three `list_update` keys — the
table shape can stay, the keys become `<type>_in_app | _push | _email`. (b) Make the digest read from
its own source, or write digest rows independently of the in-app preference. (c) Expose the `'creator'`
mute in the UI — it already works. (d) Batch `notifyListFollowers` per list-update session instead of
per item, or debounce push. (e) Cap pushes per user per day. (f) Every new notification type in this
document (1.4, 3.3, 4.1, 4.3) adds its preference keys in the same PR.

**Tests.** The pure filters (`filterMutedRecipients`, `splitRecipientsByListUpdatePreferences`,
`groupListUpdatesByUserForDigest`) already have unit coverage — extend rather than replace. Add a case
proving digest delivery is independent of the in-app toggle once (b) lands.

## 5.5 Support SLA · ops, not code

State a response time on the contact page and hold to it. TheFork's worst reviews are about nobody
replying. The only code change is the copy.

---

# Group 6 — Creator monetisation

**Given the stated revenue model, this group is strategic rather than optional.** It is also where
constraint §0.1 bites hardest.

## 6.1 Creator analytics · 4–5 d (+2–3 d if a first-party event store is needed)

**Why.** Creators are the supply side of a creator-monetisation business, and today they see exactly
two numbers: active subscribers and snapshot purchases. `getCreatorListStats()` computes
`allTimeRevenueNetCents` and **it is never displayed** — `_formatMoney` in
`src/sections/profile/settings-subscribers.js` is underscore-prefixed and unused. Showing a creator
what they have earned is the lowest-effort, highest-trust change available.

**Phase 1 (1 d).** Display the revenue that is already computed. Net of the 10% platform fee, with the
fee stated plainly.

**Phase 2 (3–4 d).** Per-list breakdown from data we already own: subscribers per list, snapshot
purchases per list, list item count, last updated, follower count over time. All of this is derivable
from `list_subscriptions`, `list_snapshot_purchases` and `user_follows` — **no event store needed**.

**Phase 3 (needs §0.1 resolved).** Views, saves-from-my-list, click-throughs. These are client events
that currently exist only in PostHog. Either query PostHog server-side, or write a first-party
`list_view_events` table. Recommend the first-party table: it is a day of work, it keeps creator-facing
numbers out of a third-party dependency, and PostHog's retention settings should not silently change
what a creator is paid to see.

**Tests.** Unit for the revenue aggregation including the fee arithmetic — money maths gets its own
tests. E2E for the subscribers page rendering seeded stats.

## 6.2 "What's new since your Snapshot" · 2–3 d

**Why.** `fetchListPage` already computes `snapshotNewRestaurantCount` and
`mergeSnapshotPurchaseCapturedItemIds` — the *number* of spots added since purchase exists. Showing
*which* spots turns a one-off purchase into a repeat one, which is the core conversion of the snapshot
model.

**Approach.** No new tables. `captured_list_item_ids` on the purchase row plus current list items gives
the diff directly. Render a locked-preview strip — names visible, details gated — with a "buy the
current snapshot" CTA. Respect the existing freemium gate constants
(`LIST_FREEMIUM_FREE_PLACES_COUNT`).

**Careful.** The 2026-07-22 review found `list_user_can_read` lets snapshot buyers read the whole live
list through PostgREST. Any new diff surface must not become a second leak — build it on the same
item-level predicate as 4.1 (`list_item_user_can_read`), and add the RLS e2e alongside.

## 6.3 Referral without the MLM smell · 2–3 d

**Why.** Beli's referral wall on its average-score feature is its most-mocked decision — users call it
an "MLM vibe". The inverse is a genuine differentiator: reward the inviter, never gate a core feature
behind referring.

**Approach.** A referral code on the profile, attribution on signup, and a reward that is *additive*
(a month of a paid list, early access to a feature) rather than *restorative* (unlocking something
withheld). Analytics events already exist for signup attribution (`signup_started` takes a `source`).

**Rule to write into the spec:** no feature that exists today may ever move behind the referral wall.
That constraint is the feature.

## 6.4 Restaurant-side claim page · not now

Only if venue monetisation is ever on the table. TheFork's restaurateur reviews are almost entirely
invoicing and cancellation failures — self-serve cancellation, correct invoices and no charges after
termination are the bar, and that is a billing programme, not a page.

---

# 7. Sequencing

Effort-to-value ordering, since no audience constraint was set. Where the resident/visitor split
matters, it is noted.

**Release 0 — stop the bleeding (~1.5 weeks) — do this first**
5.2 steps 1–3 (cancel-on-delete, Connect teardown, owned lists) · the duplicated platform fee ·
3.2 part 1 (render the sponsored badge on every surface that can show a paid placement) ·
**a green test baseline + `npm run supabase:types` producing a real `types.ts`** (§0.14, §0.18)
*The first two are not features. One bills people who deleted their account; the other shows paid
placements without disclosure. The third is groundwork: with an empty `types.ts`, gitignored
migrations and an ambiguous test baseline, every change after this is made without a safety net.*

**Release 1 — "your saves, sorted" (~2.5 weeks)**
1.1 visited state · 1.2 import-as-been · 1.3 private notes · 1.5 phase A (hours on detail + spot
sheet) · 5.3 never lose a save
*Coherent story, no external dependencies.*

**Release 2 — "trust and hygiene" (~2 weeks)**
5.1 export · 5.2 steps 4–7 (billing portal, emails, cancellation reason) · 5.4 notification
restructure · 6.1 phase 1 (show the revenue already computed) · 3.2 part 2 (creator disclosure)

**Release 3 — "conversation" (~2 weeks)**
4.1 comments · 4.2 reactions · 3.3 report a spot · 1.4 resurface saves

**Release 4 — "get your spots in" (~2.5 weeks)**
2.1 Instagram export import · 2.2 TikTok · 2.5 paste anything · 3.1 provenance chips ·
1.5 phase B (open-now filter)

**Release 5 — differentiation (~3 weeks)**
1.6 group decision · 6.2 snapshot changelog · 6.1 phases 2–3 · 4.3 ask your circle

**Later / separate tracks**
2.4 native share sheet (native project) · 3.4 locals signal (**needs real save volume — build when the
data exists**) · 3.5 permission audit (fold into the next native release) · 6.4 venue side (not now)

---

# 8. Not building

- **A global ranking ladder.** Beli's forced pairwise comparison is a top complaint. If ranking ever
  happens, rank within an occasion, and keep it optional.
- **Public comments in v1.** A moderation programme, not a comment box.
- **Gamification of people** — streaks, badges, people leaderboards. The category's own critique is
  that social pressure makes people log for an audience. The existing *lists* leaderboard is fine.
- **Always-on location.** Foreground only, asked when the map or Roulette needs it.
- **Auto-creating restaurants from imports.** Already policy in the Maps importer. A caption is not a
  source of truth.
- **Delivery.** Uber Eats, Glovo and Bolt Food own it; it undercuts the "real people, real places"
  premise.

---

# 9. Cross-cutting checklist

Applies to every feature above.

- [ ] Migrations are gitignored (`.gitignore:65`) **and `types.ts` is empty** — keep SQL in `docs/db/`
      or the schema exists nowhere in version control.
- [ ] `npm run supabase:types` after each migration — and check it actually wrote something.
- [ ] New DB objects: `CHECK` bounds on free text, index every FK, no DML grants to `anon`,
      `SET search_path = 'public', 'pg_temp'` on `SECURITY DEFINER` functions,
      `(select auth.uid())` initplan wrapping in policies.
- [ ] Every string in both `src/locales/langs/en.json` and `pt.json`; British English, sentence case.
- [ ] Check `COMPONENTS.md` before building UI; add to it when something becomes shared.
- [ ] Every new event added to `EVENT_SCHEMAS` in `analytics-provider.js` **and**
      `docs/analytics-tracking-matrix.md`.
- [ ] Every new notification type adds a preference key at the same time (§5.4).
- [ ] Health stack: `tsc --noEmit`, `eslint "src/**/*.{js,jsx}"`, `npm test` (847 pass expected — use
      the npm script, not bare `node --test`), `npx knip`.
- [ ] Pure logic into `src/libs/**` with `__tests__/*.test.mjs`; server actions stay thin.
