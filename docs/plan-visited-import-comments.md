# Implementation plan — visited state, social import, list-item comments

**Date:** 25 July 2026
**Source:** `docs/competitor-review-mining.md` ideas 1–3.
**Status:** plan only — nothing below is built yet.

Three features, in the order they should ship. They are independent enough to land separately, but
1 → 3 → 2 is the right sequence: visited state is small and touches the same read paths comments
will touch, and the social importer is the one with genuine external-dependency risk, so it should
not block the other two.

| # | Feature | Rough size | Risk | Why this order |
|---|---|---|---|---|
| 1 | Been / want to go | ~3–4 days | Low-medium | Storage already exists (see §1.1); the work is typing the seeded lists and auditing ~20 `from('lists')` call sites |
| 3 | Comments on list items | ~5–7 days | Medium (RLS + notifications) | Reuses the read-path work from #1 |
| 2 | Instagram / TikTok import | ~6–10 days | **High** (third-party fragility, ToS) | Prototype the extractor early, ship last |

---

## Conventions that apply to all three

- **Migrations are gitignored** (`.gitignore:65`, `supabase/migrations/*.sql`) and applied with
  `npm run supabase:db:push`. The SQL in this doc is therefore the durable copy — keep it here and
  in `docs/db/` rather than assuming the migration file survives.
- After any migration: `npm run supabase:types` to regenerate `src/libs/supabase/types.ts|js`.
- **Push logic into pure modules under `src/libs/`** and unit-test those. Server actions in
  `src/auth/actions/` stay thin. Precedent: `src/libs/lists/build-list-item-rows.js`,
  `src/libs/lists/pick-restaurant-match.js`, both with `__tests__/*.test.mjs`.
- Health stack before every commit: `tsc --noEmit`, `eslint "src/**/*.{js,jsx}"`, `npm test`
  (847 pass / 0 fail expected — use the npm script, not bare `node --test`), `npx knip`.
- Copy: British English, sentence case, per `BRAND.md`. Every string goes in both
  `src/locales/langs/en.json` and `pt.json`.
- Check `COMPONENTS.md` before building UI — `ResponsiveSheet`, `ProfileListItemRow`,
  `SettingsSelectionRow`, `touchTargetSx`, `tabularNumsSx` already exist.
- New DB objects must respect the two schema reviews in `docs/db/`: `CHECK` bounds on free text,
  index every FK, no `INSERT/UPDATE/DELETE` grants to `anon`, `SET search_path = 'public', 'pg_temp'`
  on any `SECURITY DEFINER` function.

---

# Feature 1 — "Been" vs "want to go"

**The complaint being answered:** Google Maps users maintain two parallel lists and move pins by hand
because there is no visited state. It is the single most-cited gap in that product.

## 1.1 Correction: the storage already exists

**Signup already seeds two lists per user: "Must go" and "Visited".** Confirmed by a DB trigger
(the seeding SQL is in a gitignored migration) and asserted live in
`tests/e2e/dashboard/delete-account.spec.ts:46-54`, which requires `ownedListIds.length > 0` on a
fresh account. An earlier draft of this plan proposed a new `restaurant_visits` table because a
source grep for "visited" returned nothing — it returned nothing because no *application* code
references those lists. They are seeded in SQL and otherwise treated as ordinary lists.

That changes the shape of this feature substantially, and mostly in our favour.

**A list-membership row is already a (user, restaurant) pair**, because a list has exactly one
owner. `list_items WHERE list_id = <my Visited list>` is functionally identical to the table the
earlier draft proposed. So the data model is done. What is missing is everything *around* it:

| What exists | What is missing |
|---|---|
| A "Visited" list per user, holding restaurant ids | Any code that knows it means something |
| Ordinary list CRUD, RLS, map and import plumbing | A "been" badge wherever a restaurant appears |
| | Filter chips on saved / list views |
| | Roulette exclusion |
| | Protection: the list can be renamed, deleted, published, even monetised |

The last row is the real defect. "Visited" is identified **only by its name**. Nothing stops a user
renaming it to "Porto trip", at which point their visit history silently becomes an ordinary list —
and nothing stops them deleting it outright. Any feature built on it needs the list to be typed.

**Do not add `restaurant_visits`.** A second store would mean two sources of truth for the same
fact, with no good answer to "user adds a spot to the Visited list manually — does the flag flip?"
Users may already have data in these lists. Type the list instead.

A **review still implies a visit**. `restaurant_reviews` is unique on `(restaurant_id, user_id)`;
writing a review should add the restaurant to the Visited list, and deleting the review must *not*
remove it.

## 1.2 Migration — type the seeded lists

Much smaller than the earlier draft: one column, one index, one guard, one backfill.

```sql
-- Identify the seeded lists structurally instead of by name.
alter table public.lists
  add column if not exists system_key text
  check (system_key in ('must_go', 'visited'));

comment on column public.lists.system_key is
  'Non-null marks a list seeded at signup with product meaning. "visited" backs the been/to-try '
  'state; "must_go" is the want-to-go default. Renameable by the user, but never deletable, '
  'publishable or monetisable — see lists_system_key_guard.';

-- One of each per owner. Partial so ordinary lists are unaffected.
create unique index if not exists lists_user_id_system_key_uidx
  on public.lists (user_id, system_key)
  where system_key is not null;

-- Backfill by name, which is all we have today. Pick the earliest row per user so a user who
-- later created their own list called "Visited" does not get the wrong one typed.
with seeded as (
  select distinct on (user_id, name) id, user_id, name
  from public.lists
  where user_id is not null
    and name in ('Must go', 'Visited')
  order by user_id, name, created_at asc
)
update public.lists l
set system_key = case seeded.name when 'Visited' then 'visited' else 'must_go' end
from seeded
where l.id = seeded.id
  and l.system_key is null;

-- An existing review is proof of a visit: add those restaurants to the owner's Visited list.
insert into public.list_items (list_id, restaurant_id, added_by, sort_order)
select l.id, r.restaurant_id, r.user_id, 0
from public.restaurant_reviews r
join public.lists l on l.user_id = r.user_id and l.system_key = 'visited'
on conflict (list_id, restaurant_id) do nothing;
```

**The guard is the point of the whole migration.** A system list must survive the user:

```sql
create or replace function public.lists_system_key_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.system_key is not null then
      raise exception 'system list % cannot be deleted', old.system_key
        using errcode = 'restrict_violation';
    end if;
    return old;
  end if;

  -- system_key itself is not user-assignable in either direction
  if new.system_key is distinct from old.system_key then
    raise exception 'system_key is not user-assignable'
      using errcode = 'restrict_violation';
  end if;

  -- a private utility list must never become a product someone can buy
  if new.system_key is not null
     and (new.paid_access_enabled or new.published_at is not null
          or new.visibility <> 'private') then
    raise exception 'system list % cannot be published or monetised', new.system_key
      using errcode = 'restrict_violation';
  end if;

  return new;
end;
$$;

create trigger lists_system_key_guard_trg
  before update or delete on public.lists
  for each row execute function public.lists_system_key_guard();
```

Renaming stays allowed — the whole point of `system_key` is that the name no longer carries meaning.
Check the guard against `deleteList` (`list-actions.js:826`) and the account-deletion path before
shipping: `lists.user_id` is `ON DELETE SET NULL` and nullable (migrations `20260503160000`,
`20260709120000`), so orphaned system lists must not raise on user deletion. The trigger above only
fires on the `lists` row itself, so an owner delete that nulls `user_id` passes — verify that with
the existing `delete-account.spec.ts` rather than assuming it.

**Recovery.** Users who renamed or deleted their seeded list before this migration will not backfill.
Add `ensure_default_lists()` — a `SECURITY DEFINER` RPC (`search_path = 'public', 'pg_temp'`) that
creates any missing system list for the caller, and call it lazily from `fetchMyLists`. The PRD
already references an `ensure_default_favorites_list` RPC (`docs/PRD.md:66`) that no source file
calls; check whether it still exists in the database and either extend it or retire it, rather than
leaving two overlapping RPCs.

**Deliberately private for now.** The Visited list stays `private`. Showing "3 people you follow have
been here" is a separate decision with a privacy consequence — it needs an explicit preference and a
`SECURITY DEFINER` RPC scoped to follows. Do not fold it in; note it as follow-up.

## 1.3 Server layer

Most of this is now composition of existing actions rather than new database code.

New file `src/auth/actions/visit-actions.js`:

- `fetchMySystemListIds()` — `{ visited, must_go }` list ids for the caller, memoised per request.
  Every other function here needs it. Falls back to `ensure_default_lists()` when a row is missing.
- `setRestaurantVisited(restaurantId, visited)` — wraps the existing `addListItem` /
  `removeRestaurantFromList` (`list-actions.js:1754`, `:1734`) against the Visited list id. Returns
  `{ visited, error }`.
- `fetchMyVisitedRestaurantIds(restaurantIds)` — one query:
  `list_items.select('restaurant_id').eq('list_id', visitedId).in('restaurant_id', ids)`.
  This is the only read the list/map/saved pages need; do **not** do it per row.
- `fetchMyVisitCounts()` — `{ visited, total }` for the saved-view header ("47 saved · 6 been").

In `src/auth/actions/restaurant-review-actions.js`, after the successful review upsert (~line 228),
fire-and-forget an insert into the Visited list with `on conflict do nothing`. Review deletion must
not remove the item — leave a comment saying so, because it looks like an omission.

**Hide system lists from the ordinary list surfaces.** `fetchMyLists` (`:503`) and `fetchMyListsHub`
(`:533`) should exclude `system_key is not null` from the main grid, or the same restaurant appears
twice in the UI — once on its real list, once on "Visited" — which is the very clutter this feature
removes. They must stay available to the save sheet's list picker and the map dropdowns, so filter at
the call site, not in a shared select. Audit each of the ~20 `from('lists')` call sites for which
behaviour it wants; this is the main regression risk in Feature 1.

Pure helper, unit-testable: `src/libs/restaurant/visit-state.js`

```js
/** @returns {'been' | 'to_try'} */
export function resolveVisitState({ visitedIds, restaurantId }) { … }
/** Partition list items for the filter chips without re-querying. */
export function partitionItemsByVisitState(items, visitedIds) { … }
```

## 1.4 Read-path integration

| Surface | File | Change |
|---|---|---|
| List page | `src/auth/actions/list-actions.js` → `enrichListItemsWithReviewsAndMustTry` (line 178) | Add a third parallel fetch: visited ids for the visible restaurant ids. Attach `visited: boolean` per item. It is already `Promise.all` over two fetches — this is a third, not a new round trip in series. |
| Saved | `src/sections/saved/view/saved-view.js` | Filter chips: All / To try / Been. |
| List manage | `src/sections/lists/view/list-manage-view.js` | Same chips + a per-row toggle. |
| Map | `src/auth/actions/list-actions.js` → `fetchSavedRestaurantsForMap` | Return `visited` so pins can dim. |
| Restaurant detail | `src/sections/restaurant/view/…` | Primary toggle lives here. |
| Save sheet | `src/sections/lists/save-to-list-sheet.js` | "I've been here" row next to the must-try picker — the must-try flow already proves the shape. |
| **Imports** | `src/sections/lists/google-maps-import-modal.js` | See 1.4b — imports must be able to land as "been". |

### 1.4b Imports must carry visited state

A second research pass turned up the most actionable complaint in the whole set: Beli users ask to
import their Google Maps lists **and reviews as "been"**, not only as want-to-go. Every importer in
the category dumps everything into one undifferentiated pile, and then the user hand-sorts hundreds
of rows.

With visited state stored as a list, this is nearly free: the importer already commits rows into a
target list. *"I've already been to these"* simply adds the Visited list as a second commit target
for the same matched rows — `buildListItemRows` called twice with two list ids, no new write path at
all. It should ship **with** Feature 1 rather than waiting for Feature 2.
Google Maps' own "Visited places" list is the natural source for the "been" side, and a user who
imports "Want to go" and "Visited" as two runs ends up with a correctly sorted library on day one —
which is precisely the migration story no competitor offers.

The gating paths must stay honest: on a freemium-gated list, `list_freemium_preview_items` returns
only the preview rows, so the visited fetch operates on that subset and leaks nothing. Add an e2e
assertion for that rather than trusting it.

## 1.5 Roulette

`src/sections/roulette/` + its constants: add an "exclude places I've been" switch, default **on**
for signed-in users. This is the cheapest version of idea #10 (resurface saved spots) and the reason
this feature is worth more than the toggle itself.

## 1.6 Copy (both locales)

```
saved.filter.all            All            Todos
saved.filter.to_try         To try         Por provar
saved.filter.been           Been           Já fui
restaurant.mark_visited     I've been here Já cá estive
restaurant.visited_badge    Been           Já fui
roulette.exclude_visited    Skip places I've been   Saltar sítios onde já fui
saved.visit_summary         {{visited}} of {{total}} visited   {{visited}} de {{total}} visitados
```

## 1.7 Tests

- Unit: `src/libs/restaurant/__tests__/visit-state.test.mjs` — partition, empty set, unknown ids.
- Unit: extend `build-list-item-rows` style coverage for the enrichment merge (visited map applied
  to the right items when ids repeat across lists).
- **E2E for the guard** — the new failure modes all live here: a system list cannot be deleted,
  cannot be published or monetised, `system_key` cannot be set or cleared from the client, and a
  renamed system list still drives the "Been" filter.
- E2E: `delete-account.spec.ts` still passes — owner deletion nulls `user_id` on system lists rather
  than raising. This spec is the existing canary for list-ownership regressions; run it first.
- E2E: a user whose seeded list was deleted before the migration gets it recreated by
  `ensure_default_lists()` on next visit, with no duplicate when called twice.
- E2E (`tests/`): mark visited on a restaurant page → appears under "Been" in saved → excluded from
  Roulette when the switch is on → still visible on a friend's public list without a write.
- E2E: gated list — non-buyer sees preview items only, no visited leakage.
- Regression: the Visited and Must go lists no longer appear in the main list grid but are still
  selectable in the save sheet and map dropdowns.

## 1.8 Analytics

Add to `docs/analytics-tracking-matrix.md`: `visit_marked`, `visit_unmarked`,
`saved_filter_changed` (`{ filter }`), `roulette_exclude_visited_toggled`.

---

# Feature 3 — Comments on list items

*(Ordered before #2 deliberately.)*

**The complaint being answered:** Google Maps group lists have no per-place comments — collaboration
is a drop box, not a conversation. No competitor in the set does this.

## 3.1 Scope decision: members-only in v1

Comments on **public** lists mean a moderation surface, spam, and a reporting flow on day one.
Comments on **collaborative** lists (owner + `list_members` with role `editor`/`viewer`) mean a
closed audience who already trust each other.

Ship members-only. Public-list comments are a v2 with its own moderation plan. This is worth
confirming before build — see Open decisions.

## 3.2 Migration

```sql
create table if not exists public.list_item_comments (
  id           uuid primary key default gen_random_uuid(),
  list_item_id uuid not null references public.list_items (id) on delete cascade,
  user_id      uuid not null references public.users (id) on delete cascade,
  body         text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint list_item_comments_body_len check (char_length(body) between 1 and 1000)
);

comment on table public.list_item_comments is
  'Per-place discussion on a list. Soft-deleted via deleted_at so threads keep their shape.';

create index if not exists list_item_comments_list_item_id_created_at_idx
  on public.list_item_comments (list_item_id, created_at desc);
create index if not exists list_item_comments_user_id_idx
  on public.list_item_comments (user_id);

create trigger list_item_comments_set_updated_at
  before update on public.list_item_comments
  for each row execute function public.set_updated_at();

alter table public.list_item_comments enable row level security;
```

## 3.3 RLS — the part to get right

The read gate must inherit the *item-level* predicate, not the list-level one. The 2026-07-22
review found exactly this bug on `list_items`: `list_user_can_read(list_id)` grants a snapshot buyer
the whole live list because it cannot express a per-item rule. Comments must not reintroduce it.

Write a dedicated `SECURITY DEFINER` helper rather than duplicating the predicate:

```sql
create or replace function public.list_item_user_can_read(p_list_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public', 'pg_temp'   -- pg_temp per the 2026-07-22 finding #5
as $$
  select exists (
    select 1
    from public.list_items li
    where li.id = p_list_item_id
      and public.list_user_can_read(li.list_id)
      -- snapshot buyers only read their captured items
      and (
        not exists (
          select 1 from public.list_snapshot_purchases lsp
          where lsp.list_id = li.list_id
            and lsp.buyer_user_id = (select auth.uid())
        )
        or exists (
          select 1 from public.list_snapshot_purchases lsp
          where lsp.list_id = li.list_id
            and lsp.buyer_user_id = (select auth.uid())
            and li.id = any (lsp.captured_list_item_ids)
        )
      )
  );
$$;

create or replace function public.list_item_user_can_comment(p_list_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = 'public', 'pg_temp'
as $$
  select exists (
    select 1
    from public.list_items li
    join public.lists l on l.id = li.list_id
    where li.id = p_list_item_id
      and (
        l.user_id = (select auth.uid())
        or exists (
          select 1 from public.list_members m
          where m.list_id = l.id
            and m.user_id = (select auth.uid())
            and m.status = 'active'
        )
      )
  );
$$;

revoke execute on function public.list_item_user_can_read(uuid) from anon;
revoke execute on function public.list_item_user_can_comment(uuid) from anon;
grant execute on function public.list_item_user_can_read(uuid) to authenticated;
grant execute on function public.list_item_user_can_comment(uuid) to authenticated;

create policy list_item_comments_select on public.list_item_comments
  for select to authenticated
  using (deleted_at is null and public.list_item_user_can_read(list_item_id));

create policy list_item_comments_insert on public.list_item_comments
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and public.list_item_user_can_comment(list_item_id)
  );

-- Authors edit their own; owners delete anything on their list (moderation).
create policy list_item_comments_update on public.list_item_comments
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy list_item_comments_delete on public.list_item_comments
  for delete to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.list_items li
      join public.lists l on l.id = li.list_id
      where li.id = list_item_id and l.user_id = (select auth.uid())
    )
  );

revoke all on table public.list_item_comments from anon;
grant select, insert, update, delete on table public.list_item_comments to authenticated;
```

Verify `list_members.status` against the live enum before writing this — `inviteToList` /
`acceptListInvite` in `list-actions.js:2690-2850` are the authority on what "active" is called.

## 3.4 Server layer

New `src/auth/actions/list-item-comment-actions.js`:

- `fetchListItemComments(listItemId, { limit = 50, before })` — paged, joins the author's
  `display_name`, `username`, `avatar_url`.
- `addListItemComment(listItemId, body)` — trims, enforces 1–1000 client-side too, then notifies.
- `editListItemComment(commentId, body)`, `deleteListItemComment(commentId)` (soft: sets `deleted_at`).
- `fetchCommentCountsForListItems(listItemIds)` — **one** grouped query. Wire it into
  `enrichListItemsWithReviewsAndMustTry` alongside the visited fetch from Feature 1 so the list page
  still makes a fixed number of round trips regardless of item count.

Pure helpers: `src/libs/lists/comment-body.js` (`normalizeCommentBody`, length/whitespace rules) and
`src/libs/notifications/build-comment-recipients.js`.

## 3.5 Notifications

New type `list_item_comment`, following the five existing producers (`list_update`, `list_invite`,
`join_approved`, `invite_accepted`, `new_follower`, `list_subscribed`).

Recipients = list owner + everyone who has commented on that item + the member who added the spot,
**minus** the comment author, then run through `filter-notification-recipients.js` for
`notification_mutes` and `notification_preferences`. Reuse `insertNotifications` from
`src/libs/notifications/create-notification.js`.

`data` payload: `{ list_id, list_item_id, restaurant_id, restaurant_name, list_name, actor_id,
actor_name, comment_preview }` (preview truncated to ~80 chars).

Also update:
- `src/libs/notifications/group-notifications.js` — group repeated comments on the same item
  ("3 new comments on Cervejaria Ramiro"), the way `list_update` already groups by `list_id`.
- The notifications section UI + `en.json` / `pt.json` strings.
- Consider web push (`send-web-push.js`) — recommend **not** in v1; in-app only, to avoid a noisy
  first release.

## 3.6 UI

- Comment thread lives in the list item row's expanded state and in the map spot sheet
  (`map-spot-sheet-inner.js` already renders per-spot detail).
- Use `ResponsiveSheet` for the mobile thread (bottom sheet) / desktop dialog.
- Comment count chip on the row, `tabularNumsSx` so it does not reflow.
- Composer: single-line growing input, 1000-char counter appearing at 900, optimistic append,
  rollback + inline error on failure. Errors follow `BRAND.md`: calm, blame-free.
- Soft-deleted comments render as "Comment removed" so replies keep their context.
- Empty state: "No comments yet. Add a tip for whoever goes next."

## 3.7 Tests

- Unit: `comment-body` normalisation (whitespace-only rejected, 1000-char boundary, newline collapse).
- Unit: recipient builder (author excluded, mutes honoured, duplicates removed).
- **RLS e2e is the important one** — a snapshot buyer must not read comments on non-captured items,
  a freemium non-buyer must not read comments on gated items, a non-member must not insert. These
  are the exact shapes of past findings in `docs/db/`.
- E2E: two-user collaborative list, comment appears for the other user, owner deletes it.

---

# Feature 2 — Instagram / TikTok save importer

**The complaint being answered:** saved Instagram/TikTok posts are never revisited; the platforms
have no location filter and no way back. Four startups exist purely for this and none covers Portugal.

## 2.1 Reality check on the extraction, before any UI

This is the part that decides whether the feature is worth building, so prototype it first, in a
throwaway script, before touching the product.

| Source | Mechanism | Reliability | Notes |
|---|---|---|---|
| **TikTok single URL** | Public oEmbed: `https://www.tiktok.com/oembed?url=…` | Good | Returns `title` (the caption) + `author_name`, no auth, documented |
| **Instagram single URL** | `https://www.instagram.com/p/{code}/embed/captioned/` returns HTML containing the caption | Fragile | No auth, but undocumented and rate-limited by IP; **against Instagram's ToS** |
| **Instagram single URL (official)** | Graph API oEmbed Read | Reliable | Requires a reviewed Meta app + token; caption only for public posts |
| **Instagram bulk** | User uploads their "Download your information" export (`saved_posts.json`) | **Best** | User-initiated, ToS-clean, and it is the *bulk* path — hundreds of saves at once, which is the actual competitor feature |

Recommendation: **build the export-upload path first**, single-URL TikTok second, single-URL
Instagram last and behind a feature flag. That inverts the intuitive order, but the export path is
the durable one and delivers the "turn my 300 saves into a map" moment that Someday Map sells.

The repo already scrapes an internal Google endpoint in `google-maps-import-actions.js`, so this is
not a new category of risk — but Instagram polices it far harder than Google Maps does, and any
scraper here should be written to fail soft (`{ error: 'fetch_failed' }`, never a thrown 500).

## 2.2 Pipeline, mirroring the Maps importer

`google-maps-import-actions.js` is the template and its structure should be copied beat for beat:
extract → parse → match → preview → user confirms → commit → email support about misses.

```
URL or export file
  → extract raw items        (caption text + permalink + author + any location tag)
  → LLM venue extraction     (caption → candidate venue names + city hint)
  → match to restaurants     (pickRestaurantMatch, locality-scoped)
  → preview UI               (matched / not found, per row, user deselects)
  → commit                   (buildListItemRows → list_items upsert)
  → email support            (notifySupportOfMissingRestaurants, already written)
```

**Never auto-create restaurants.** That policy is already documented in the Maps importer and it is
even more important here, where the input is free text from a caption.

## 2.3 New modules

Pure and unit-testable (`src/libs/imports/social/`):

- `parse-tiktok-oembed.js` — oEmbed JSON → `{ caption, author, permalink }`.
- `parse-instagram-embed.js` — embed HTML → caption. Fixture-driven tests; expect to re-record.
- `parse-instagram-export.js` — `saved_posts.json` → `[{ permalink, savedAt }]`. Handles both
  export shapes Meta has shipped (`saved_saved_media` array, and the older flat map).
- `extract-venue-candidates.js` — caption → candidate names. **Deterministic pre-pass first**:
  `@handle` mentions, `#hashtags`, and text after "📍". Only fall back to the LLM when that yields
  nothing — it keeps cost and latency off the common path.
- `score-social-match.js` — wraps `pickRestaurantMatch` with the no-coordinates rules below.

Server action: `src/auth/actions/social-import-actions.js` with `previewSocialImport(input)` and
`commitSocialImport(payload)`, mirroring the Maps action's signatures so the modal can share shape.

## 2.4 Matching without coordinates — the hard part

The Maps importer gets lat/lng and matches inside a ~110m box. A caption gives you a *name* and
maybe a city. `pickRestaurantMatch` degrades to name-only, and name-only across all of Portugal will
produce confident wrong answers ("O Trevo" exists in several towns).

Rules:
1. Scope candidates to the user's `home_locality_id` first, then the locality of the target list's
   existing items, then nationwide as a last resort.
2. Require `nameMatchScore >= 2` (the existing containment threshold) **and** a locality scope. A
   nationwide match requires exact (score 3).
3. Below that, status `not_found`, never a guess. The preview UI shows it as "we couldn't find this
   one" with the caption text, and it goes to the support email.
4. Where a caption names several venues, keep them all as separate candidate rows.

`normalizeName` in `pick-restaurant-match.js` already strips accents and Portuguese venue prefixes
(`restaurante`, `tasca`, `cervejaria`…) — that work carries over unchanged.

## 2.5 LLM usage

Reuse the existing stack — `src/libs/restaurant-ingest/qwen-json-chat.js` and the provider list in
`src/lib/restaurant-search-llm.js`. Strict JSON out:

```json
{ "venues": [{ "name": "…", "city": "…", "confidence": 0.0 }] }
```

Cap at ~8 venues per caption. Batch captions for the bulk path (20 per call, bounded concurrency —
`mapWithConcurrency` with `DB_CONCURRENCY = 20` already exists in the Maps importer for exactly this
reason, and the connection-pool comment there is worth re-reading before changing it).

## 2.6 Limits and abuse

- `MAX_IMPORT_PLACES = 500` (match the Maps importer).
- Export upload: cap file size (~10 MB) and parse in the action, never persist the raw export.
- Rate limit: N imports/hour/user. There is no rate-limit primitive in the repo today — a
  `social_import_runs` table with a count-in-window check is the smallest thing that works.
- Log failures to Sentry with the platform and failure stage, not the URL.

## 2.7 UI

Generalise `src/sections/lists/google-maps-import-modal.js` (429 lines, already has the
paste → preview → select → commit shell) into an import modal with a source picker:
**Google Maps · Instagram · TikTok · Upload export**. The preview table, row selection, and commit
button are shared; only the input step differs per source. Rename the file to `import-spots-modal.js`
and keep the Maps path working identically — it is the regression risk in this feature.

## 2.8 Phase 3 (separate piece of work): native share sheet

The apps are Capacitor shells loading the hosted site (`capacitor.config.ts`), so a share target is
real native work, not a web change: an iOS Share Extension and an Android `ACTION_SEND` intent
filter, each handing the URL to the web app via a deep link. No existing Capacitor plugin in
`package.json` covers it. Scope it separately — it is the highest-retention version of this feature
and the one competitors lean on, but it must not be inside the v1 estimate.

## 2.9 Tests

- Unit, fixture-driven, for all four parsers (`__tests__/*.test.mjs` with recorded payloads).
- Unit for `extract-venue-candidates` — the deterministic pre-pass must be covered without the LLM.
- Unit for the locality-scoping rules, including the "confident wrong answer" case: two restaurants
  with the same name in different localities must resolve to `not_found` nationwide.
- E2E: upload a fixture export → preview → deselect one → commit → items on the list, support email
  queued for the misses.

---

## Cross-cutting checklist

- [ ] `docs/analytics-tracking-matrix.md` updated for all three features.
- [ ] `COMPONENTS.md` updated if the comment thread or filter chips become shared components.
- [ ] `docs/db/` — append the new tables, policies, and functions to the schema notes, since the
      migrations themselves are gitignored.
- [ ] `npm run supabase:types` after each migration.
- [ ] `npx knip` — the import modal rename will leave dead exports if done carelessly.
- [ ] `docs/qa-app-checklist.md` — add visited toggle, comment thread, and import flows.

## Open decisions

These change the build, so worth settling before starting:

0. **Does "Visited" stay visible as a list?** Once it drives a badge and a filter, keeping it in the
   main grid shows every visited restaurant twice. Plan assumes hidden from the grid, still
   selectable in the save sheet. This is a product call, and it is the one users will notice.
0b. **Private notes on saved spots** — surfaced by the second research pass ("social pressure
   corrupts honesty"; Beli's named downside is high social pressure). A viewer-only note field is a
   natural companion to the visited toggle and no competitor offers it credibly. With visits stored
   as list items it is a nullable `note` column on `list_items` — cheap, but it applies to every
   list, so decide the scope before writing the migration.
1. **Comments: members-only or public lists too?** Plan assumes members-only. Public comments need a
   moderation and reporting flow — a feature in its own right.
2. **Are visits private?** Plan assumes yes. "2 people you follow have been here" is a strong
   discovery signal but needs an explicit opt-in preference.
3. **Instagram scraping appetite.** The embed-HTML path is ToS-adverse and will break. The export
   upload has none of that risk. If the answer is "no scraping", the plan drops to export + TikTok
   oEmbed, which is a smaller and more durable build.
4. **Push notifications for comments** — in-app only in v1, or push from day one?
