# Database review — 2026-07-22

Scope: `public` schema (32 tables, ~68 functions, 44 policies), RLS posture, grants,
constraints, indexes, and the app code paths that depend on them.

**Basis and limits.** Reviewed from `supabase/migrations/schema-dump.sql` (dumped
2026-07-16) plus the 13 migrations dated 2026-07-14 and 2026-07-21 that post-date it.
No live database connection was used (no `psql` available, no credentials read), so
this review could **not** verify: that the 2026-07-21 migrations are actually applied,
runtime statistics (unused indexes, bloat, slow queries), or Auth-dashboard settings.
Every finding below is derived from DDL + source, and cites where.

The 2026-07-21 pass already fixed a lot — RLS on every table, `auth.uid()` initplan
wrapping, three FK indexes, the storage-bucket listing policies, revoked EXECUTE on
five backend-only functions, dropped four legacy tables and `customers.user_id`. What
follows is what is still open.

---

## Status

**All 9 migrations are APPLIED to production (`jxknitagufcuyeozlazc`) and verified.**
`20260722120000`–`126000` were applied by an external process alongside commit `eb5aba0`;
`127000` and `128000` were applied during the verification pass. Migrations are gitignored
(`.gitignore:65`) and apply via `npm run supabase:db:push`.

Verified against a freshly re-dumped `schema-dump.sql` and live smoke tests:

| Check | Result |
|---|---|
| `restaurants.locality_id` exists, `municipality_id` gone | PASS |
| `cities!restaurants_locality_id_fkey` embed (SSR path) | PASS |
| `anon` EXECUTE on all 5 recreated RPCs (126000 ACL replay) | PASS |
| `list_items_select` uses the item-level predicate | PASS |
| Money FKs (`list_subscriptions`/`_snapshot_purchases`/`_payments`) = RESTRICT | PASS |
| Offending write grants to anon/authenticated | 0 |
| SECURITY DEFINER functions without `pg_temp` | 0 (only `rls_auto_enable`, excluded by design) |
| `updated_at` triggers | 11 |
| `restaurant_reviews_rating_half_step` | present |
| FKs still pointing at `auth.users` | 0 |
| All three `127000` gates present in live bodies | PASS |

Finding 19 could not be reproduced end-to-end: there are **no published paid lists in
production**, so the leak was not exploitable at the time of the fix. It would have become
exploitable the moment the first paid list was published.

**`schema-dump.sql` was destroyed and rebuilt during this pass.** `supabase db dump -f`
truncates its target before connecting, and it needs Docker, which was not running — so the
stale Jul-16 dump was lost, and the file is gitignored so git could not restore it. It was
reconstructed by querying `pg_catalog` directly over the pooler. The result is complete
(72 functions, 28 tables, 57 policies, 17 triggers, 56 indexes) but is **not** byte-compatible
with `pg_dump` output — it is a readable schema reference, not a restore artifact. Regenerate
it properly with `supabase db dump` once Docker is available. This closes finding 18d.

| Migration | Covers |
|---|---|
| `20260722120000_paid_access_integrity.sql` | 1, 3, 6, 18c |
| `20260722121000_harden_public_write_rpcs.sql` | 2, 16, 18a |
| `20260722122000_grants_and_search_path.sql` | 4, 5 |
| `20260722123000_schema_coherence.sql` | 8, 10, 11, 13, 14, 15, 17 |
| `20260722124000_user_fk_consistency.sql` | 12 |
| `20260722125000_geography_tier_documentation.sql` | 9 (tier documentation) |
| `20260722126000_rename_municipality_to_locality.sql` | 9 (the rename itself) |
| `20260722127000_definer_rpc_access_gates.sql` | 19, 20, 21 (see addendum) |

App changes: `list-actions.js` (delete guards, dead export), `list-collaboration-errors.js`,
`list-manage-view.js`, `en.json` / `pt.json`, `supabase-admin.js`.

The rename in `20260722126000` reaches beyond `src/`. Also updated:
`tests/e2e/support/seed.ts` and `supabase-service.ts` (the seed helpers insert and select
this column — the e2e suite would fail wholesale otherwise),
`tests/e2e/public/paid-list-gating.spec.ts`, `remotion/scripts/fetch-restaurant-props.mjs`
(PostgREST embed hint on the renamed FK), and `.cursor/prompts/geography-database-seed.md`.
`scripts/generate-portugal-concelhos-upsert.js` and
`generate-international-naming-migration.mjs` emit the old name but are frozen historical
generators; both now carry a header saying what would need editing before any chain rebuild.

`eslint` and `tsc --noEmit` pass (tsconfig's `**/*.ts` covers `tests/e2e`, so the TypeScript
helper edits are typechecked). Unit tests: **847 pass, 0 fail** via `npm test`.

> Correction: earlier passes in this document reported "620 pass / 26 fail, all pre-existing."
> That was wrong. I ran `node --test "src/**/__tests__/*.test.mjs"` — the command in
> `CLAUDE.md` — which omits the loader the real script uses
> (`node --import ./scripts/register-node-test-loader.mjs --test ...`). Without it, 26 suites
> fail to load and ~200 tests never run. There were never any pre-existing failures.
> **`CLAUDE.md`'s documented test command is stale and should be updated to `npm test`.**

**Two findings were wrong and are corrected below: 1 (severity overstated) and 7
(withdrawn — the behaviour is intentional and documented).** Finding 9's *justification*
was also wrong; the rename was nonetheless requested and is done — see that section.
Finding 18d (re-dump `schema-dump.sql`) and 18e (squash migrations) still need a
database and are not done.

---

## Addendum — verification pass, 2026-07-22

A follow-up pass audited what the ~60 `SECURITY DEFINER` functions do *internally*, rather
than only their grants and search_path. **The original review did not do this, and it was
the wrong thing to skip:** these functions bypass RLS by construction, so their own `WHERE`
clause is their only access control. Policy work does not reach them.

Three leaks found, two of which are more severe than anything in the original report. All
three are fixed in `20260722127000_definer_rpc_access_gates.sql`.

### 19. `public_profile_activity` publishes paid-list contents to anonymous callers

`SECURITY DEFINER`, granted to `anon`, paginated (`p_limit` capped at 100, `p_offset`
unbounded). Its `list_spot` branch emits `{restaurant: {id, name}}` for every `list_items`
row on any list with `visibility IN ('public','public_subscribers') AND published_at IS NOT
NULL`. There is **no `paid_access_enabled` exclusion.**

So anyone, signed out, can page through the complete contents of a creator's published paid
lists from their public profile. That is the entire paywall, bypassed with no account and no
purchase. This is the most serious issue found in this engagement, and it predates the review.

Fixed by excluding paid lists from that branch. The `list_published` branch is left alone —
it exposes only list id/name/published_at, which is the public metadata that makes a paid
list discoverable in the first place.

### 20. `circle_restaurants_for_viewer` leaks private and unpaid list contents to any follower

The `circle` CTE joined `list_items → lists → scope` (the viewer plus everyone they follow)
with **no visibility, paid, or membership filter at all**. Following is unilateral — the
`user_follows_insert_follower` policy lets any authenticated user insert their own follow row,
no approval — so following a creator returned the restaurant set of every list they own,
including private lists and paid lists the viewer never bought. For a paid list, that set is
the product.

Fixed with the same item-level readability predicate. The viewer's own lists still qualify;
they are the owner, so `list_user_can_read_live` is true.

### 21. `saved_restaurants_for_map` — gap in this review's own finding-3 fix

`20260722120000` split `list_user_can_read` so the `list_items` RLS policy could scope
snapshot buyers to `captured_list_item_ids`. But this function is `SECURITY DEFINER`, so
that policy never runs for it, and its own gate was still the list-level
`list_user_can_read (li.list_id)`. Snapshot buyers kept getting the whole live list on the map.

**Finding 3 was therefore not actually closed by `20260722120000` alone** — it closed the
PostgREST path and left the RPC path open.

Fixed, with the replacement parenthesised: the gate is the first term of a
`WHERE <gate> AND <coords NOT NULL> AND <tag filters>` chain, and `AND` binds tighter than
`OR`, so a bare `A OR B` would have parsed as `A OR (B AND ...)` and let any live reader skip
every downstream filter.

`20260722127000` ends with an assertion that no `SECURITY DEFINER` function returning
`list_items` still gates on the list-level predicate, so this class cannot silently reappear.
`list_freemium_preview_items` is exempt and documented as such — its preview branch already
grants the capped teaser to any signed-in viewer, and its private+paid path is unreachable
because `lists_paid_requires_subscriber_visibility` forbids `paid_access_enabled` on a private
list.

Also audited and **clean**: no `SECURITY DEFINER` function returns `users.email`, a
`stripe_*` identifier, or any `customers` column. `public_user_profile_by_username` touches
Stripe fields only as `IS NOT NULL` conditions and returns a list id plus a boolean.

---

## P0 — correctness / money

### 1. `deleteList`'s snapshot-buyer guard can never fire

`src/auth/actions/list-actions.js:841-847` blocks deleting a list that has snapshot
purchases ("buyers have permanent access rights"). It runs that check with the
**user-scoped** client:

```js
const { data: snapRows } = await supabase
  .from('list_snapshot_purchases')
  .select('id')
  .eq('list_id', listId)
  .limit(1);
if (snapRows?.length) return { error: 'has_snapshot_purchases' };
```

`list_snapshot_purchases` has exactly one SELECT policy:

```sql
CREATE POLICY "buyers can read own snapshots" ON public.list_snapshot_purchases
  FOR SELECT USING (buyer_user_id = (SELECT auth.uid()));
```

The list **owner** is not the buyer, so this query returns zero rows for the owner in
every case. `snapRows?.length` is always falsy and the guard always passes.

**Correction — severity lower than first stated.** This is not data loss.
`list_snapshot_purchases.list_id` is `NOT NULL` *and* the FK is `ON DELETE SET NULL`,
so Postgres aborts the delete with a `23502` not-null violation. The real consequences
are that the user sees a raw Postgres message instead of the intended
`has_snapshot_purchases` copy, and that creators cannot see their own sales at all.
The genuinely destructive cascade is finding 6, not this one.

Fix: run the check with `supabaseAdminClient`, or add an owner-read policy
(`EXISTS (SELECT 1 FROM lists l WHERE l.id = list_id AND l.user_id = (SELECT auth.uid()))`),
or move the guard into a `SECURITY DEFINER` `delete_my_list()` RPC. Prefer the RPC —
it makes the rule atomic with the delete instead of a TOCTOU-prone two-step.

### 2. `upsert_ugc_translation` is an unauthenticated write primitive

`SECURITY DEFINER`, `EXECUTE` held by `anon` and `authenticated`, and it has **no
`auth.uid()` check**. The caller supplies both the cache key and the value:

```sql
upsert_ugc_translation(p_content_hash, p_source_text, p_source_locale,
                       p_target_locale, p_translated_text, p_provider)
  → INSERT ... ON CONFLICT (content_hash, target_locale) DO UPDATE
      SET translated_text = EXCLUDED.translated_text
```

`ugc_translation_cache` has a SELECT-only RLS policy, so this function is the *only*
write path into it and it bypasses that restriction entirely. Any unauthenticated
caller can `POST /rest/v1/rpc/upsert_ugc_translation` and:

- **overwrite any existing cached translation** with arbitrary text, which is then
  served to other users as translated dish labels / UGC copy — stored content
  injection with no authorship trail (`provider` is caller-controlled too);
- **insert unbounded rows** — the key is caller-chosen, so there is no natural ceiling
  on table size.

`20260721121000_security_linter_hardening.sql` deliberately left this one alone
because the lazy write happens on the read path with the user client. That reasoning
is sound for *why it can't simply be revoked*, but the function still needs a guard.

Fix, in order of preference:
1. Derive the hash inside the function from `p_source_text || p_source_locale ||
   p_target_locale` and ignore the caller's `p_content_hash`. This alone kills the
   overwrite-anything primitive — a caller can then only write the cache slot that
   matches the text they supplied.
2. `ON CONFLICT ... DO NOTHING` instead of `DO UPDATE`, so a populated slot is
   immutable from the public path.
3. Require `auth.uid() IS NOT NULL` and revoke from `anon`.

### 3. Snapshot buyers can read the whole live list through PostgREST

`list_items_select` delegates to `list_user_can_read(list_id)`, which grants access to
*any* user holding a `list_snapshot_purchases` row for that list — with **no
`captured_list_item_ids` filter**:

```sql
OR EXISTS (SELECT 1 FROM public.list_snapshot_purchases lsp
           WHERE lsp.list_id = p_list_id AND lsp.buyer_user_id = (SELECT auth.uid()))
```

Every other layer enforces the capture. The column comment says "snapshot buyers only
read these rows". `following_restaurants_for_map`, `map_following_lists`, and
`dashboard_following_lists` all filter on `li.id = ANY (lsp.captured_list_item_ids)`.
`list-actions.js:2076-2078` even says it uses the admin client "so the count matches
the full list regardless of snapshot RLS filtering on reads" — the code assumes a
filter that does not exist.

Consequence: a one-time snapshot buyer gets a permanent live subscription for free by
querying `GET /rest/v1/list_items?list_id=eq.<uuid>` with their own JWT. The
app-layer filter (`mergeSnapshotPurchaseCapturedItemIds`) is cosmetic.

Fix: `list_user_can_read` answers a list-level question and can't express a per-item
rule, so split it. Keep `list_user_can_read` for the gate, and give `list_items_select`
its own predicate that ANDs in the capture check when access is snapshot-only.

---

## P1 — hardening

### 4. `GRANT ALL ON TABLE ... TO anon, authenticated` on all 32 tables

The Supabase default, but it makes RLS the single point of failure. It is granted even
on tables that no client key should ever touch — `stripe_events`,
`sponsored_restaurant_placements`, `suggested_creators`, `list_subscription_payments`,
`list_snapshot_purchases` — and on pure reference data (`countries`, `states`,
`cities`, `tags`, `restaurants`, `restaurant_tags`, `restaurant_images`), where the
grant includes INSERT/UPDATE/DELETE/TRUNCATE that no policy will ever permit.

`20260721120000` correctly reasoned that RLS leaves these deny-all today. The point of
revoking is that a future permissive policy, or an accidental `DISABLE ROW LEVEL
SECURITY`, then still can't become a write. The `rls_auto_enable` event trigger is good
defense for new tables; this is the complement for existing ones.

```sql
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.countries, public.states, public.cities, public.tags,
     public.restaurants, public.restaurant_tags, public.restaurant_images,
     public.stripe_events, public.sponsored_restaurant_placements,
     public.suggested_creators, public.list_subscription_payments,
     public.list_snapshot_purchases
  FROM anon, authenticated;
```

### 5. `SET search_path = 'public'` omits `pg_temp` on ~60 SECURITY DEFINER functions

PostgreSQL searches the temp schema **first** for relation names when `pg_temp` is not
listed explicitly ("Writing SECURITY DEFINER Functions Safely"). `authenticated` holds
TEMP on the database by default, so a caller can `CREATE TEMP TABLE lists (...)` and
shadow an unqualified reference inside a definer function.

The bodies I read (`list_user_can_read`, `list_has_active_paid_subscription`,
`create_user_list`, `invite_to_list`, `following_restaurants_for_map`,
`list_freemium_preview_items`) all schema-qualify with `public.`, so I found nothing
exploitable as written — but I did not audit all ~60 bodies, and the guarantee should
come from the setting, not from every author remembering. Append `pg_temp` last:

```sql
ALTER FUNCTION public.<fn>(<args>) SET search_path = 'public', 'pg_temp';
```

`20260721121000` already did the stronger `= ''` on the four trigger/text helpers.

### 6. Deleting a list destroys the subscription trail but not the payments

| FK | Action |
|---|---|
| `list_subscriptions.list_id → lists` | **CASCADE** |
| `list_subscription_payments.list_id → lists` | SET NULL |
| `list_snapshot_purchases.list_id → lists` | SET NULL |

Deleting a list hard-deletes its `list_subscriptions` rows — including
`stripe_subscription_id`, the only pointer to a subscription that is **still billing in
Stripe** — while the `list_subscription_payments` rows survive as orphans referencing
a list that no longer exists. `deleteList` has no guard on active subscriptions at all
(and its snapshot guard doesn't work — finding 1).

Fix: `ON DELETE RESTRICT` on `list_subscriptions.list_id`, plus an explicit
cancel-then-delete flow. Financial records should never be reachable by a cascade.

### 7. ~~Orphaned lists are immortal~~ — WITHDRAWN, this is intentional

I flagged `lists.user_id ON DELETE SET NULL` as an accident of the FK action. It is not.
`20260503160000` states it outright: *"When a creator deletes their account, their lists
should survive for snapshot purchasers... Orphaned lists (user_id IS NULL) are displayed
as read-only with a 'This list is no longer maintained' banner."* `20260709120000` then
dropped the `NOT NULL` specifically so the SET NULL could fire, and spells out that the
`user_id = auth.uid()` policies "correctly remain read-only" for these rows.

The behaviour I described as a defect is the documented design. No change made.

### 8. `published_at` is documented as the anon gate but isn't one

```sql
COMMENT ON COLUMN public.lists.published_at IS
  'When set, anonymous users can read list + items (share link).';
```

`list_user_can_read` grants anon read on **any** `visibility = 'public'` list with no
`published_at` check (the `public_subscribers` branches do check it). Since
`create_user_list` accepts `'public'` directly, a list is anon-readable the instant
it's created, before the owner has shared anything.

Either the comment is stale or the policy is missing a condition — worth resolving,
because it's the kind of drift that gets read as authoritative later.

---

## P2 — coherence

### 9. "municipality" names a concept that no longer exists — DONE, over my objection

**Outcome: the rename was requested explicitly after the analysis below and is
implemented in `20260722126000`.** `restaurants.municipality_id` is now
`restaurants.locality_id`, along with its FK, its index, six RPC output columns, and
the app call sites. My reasoning against it is kept below because it is the context for
the comments that migration writes — those comments are now the only thing recording
the tier split, so they must not be deleted.

The live cost to watch for: `restaurants.locality_id` (municipality tier) and
`users.home_locality_id` / `user_location_follows.locality_id` (locality tier) now look
like the same thing and are not. Anything joining `cities` must filter on
`is_municipality`.

#### Original analysis — why I argued against it

I proposed renaming `restaurants.municipality_id` to `locality_id` on the grounds that
the `municipalities` table was dropped in `20260721124000` and the column actually
references `public.cities`. That justification was wrong — the concept did not
disappear, it moved into `cities.is_municipality`.

`public.cities` stores **two distinct admin tiers** discriminated by `is_municipality`:

| tier | `is_municipality` | referenced by | resolved by |
|---|---|---|---|
| municipality (concelho) | `true` | `restaurants.municipality_id`, sponsor scoping | `resolve_municipality_for_point`, which filters `WHERE c.is_municipality` |
| locality (freguesia) | `false` | `users.home_locality_id`, `user_location_follows.locality_id` | `locality_for_point` |

So `municipality_id` and `locality_id` were not two names for one thing — they point at
different tiers of the same table, and collapsing both to `locality_id` removes the only
signal in the column names that they differ. The dropped `municipalities` table was the
*old, empty* home of the municipality tier (its own comment: "Legacy admin tier (empty);
product markets use public.cities").

There was also a thinner, separate defect, which `20260722125000` fixes independently of
the rename: **nothing in the schema said any of this.** `cities` had a comment describing
one tier, `is_municipality` had none, and a reader hitting two similarly-named columns on
the same target table had no way to tell them apart. The table, the discriminator, and
all three columns now carry comments spelling out the split — `20260722126000` re-states
them against the new name and strengthens the warning, since after the rename the comments
are load-bearing rather than merely helpful.

### 10. `updated_at` is unmaintained on most tables that have it

Triggers exist only for `lists` and `restaurant_reviews`. These have
`updated_at timestamptz NOT NULL DEFAULT now()` and **no trigger**: `cities`,
`countries`, `states`, `restaurants`, `list_subscriptions`, `notification_preferences`,
`suggested_creators`, `users`. The value is whatever the writer remembered to set, and
silently wrong when it didn't.

Add one shared `set_updated_at()` (with `SET search_path = ''`) and attach it, or drop
the columns nothing maintains.

### 11. `restaurant_reviews.rating` accepts values the product forbids

Comment: "1.0–5.0 in 0.5 steps (half stars)." The CHECK only enforces the range, so
`3.7` stores fine. And `numeric(4,1)` permits up to `999.9` before the range check.

```sql
ALTER TABLE public.restaurant_reviews
  ADD CONSTRAINT restaurant_reviews_rating_half_step
  CHECK ((rating * 2) = floor(rating * 2));
```

### 12. Two parents for the same concept

`list_snapshot_purchases.buyer_user_id`, `list_subscription_payments.subscriber_user_id`,
`customers.id`, and all four notification tables FK to **`auth.users`**. Everything
else (`list_subscriptions.subscriber_user_id`, `list_members.user_id`,
`restaurant_reviews.user_id`, `user_follows`, `lists.user_id`, …) FKs to
**`public.users`**. Same concept, two parents, so joins and cascade behaviour differ by
table for no stated reason. Standardise on `public.users` — it's the row the app
actually joins for profile data.

### 13. Stale denormalized author snapshot

`restaurant_reviews.author_display_name / author_username / author_avatar_url` are
written at review time and never resynced (one-time backfill in `20260519120000`). A
user who renames themselves keeps the old name on every past review. Either accept it
as an intentional point-in-time snapshot and say so in the column comments, or add a
sync trigger on `public.users`.

### 14. `users.email` duplicates `auth.users.email` with no sync

Copied at creation by `handle_new_user` and `create_user_list`; an email change in
Supabase Auth never propagates. It carries an index (`idx_users_email`). Drop it and
read from `auth.users`, or add a sync trigger — the current state is a slow-drifting
copy of the authoritative value.

### 15. Foreign keys still missing a covering index

`20260721122000` fixed `list_items.restaurant_id`, `list_items.added_by`, and
`list_members.invited_by`. Still uncovered (leading column of the PK/index is the wrong
one for the parent-side lookup):

| FK | Action | Parent-side delete scans |
|---|---|---|
| `user_location_follows.locality_id → cities` | CASCADE | full table |
| `user_restaurant_tag_preferences.tag_id → tags` | CASCADE | full table |
| `cities.parent_municipality_id → cities` | SET NULL | full table |
| `list_snapshot_purchases.list_id → lists` | SET NULL | index leads with `buyer_user_id` |

Small tables today; `cities` is not, and a locality delete scans `user_location_follows`.

### 16. Dead code in the schema

- `request_join_list` unconditionally `RAISE EXCEPTION 'join_requests_disabled'`.
  `approve_list_join_request`, `reject_list_join_request`, and the `pending_request`
  value in `list_members_status_check` exist for a flow the `lists.visibility` comment
  says is disabled.
- `assign_restaurant_municipality` has no caller (already noted in `20260721121000`).

Remove, or add a comment saying they're parked deliberately.

### 17. `stripe_events` grows forever

`(id text PK, received_at timestamptz)` — an insert-only idempotency ledger with no
retention. Stripe does not retry beyond ~3 days; anything older than 30 is dead weight.
Add a `pg_cron` job: `DELETE FROM stripe_events WHERE received_at < now() - interval '30 days'`.

### 18. Smaller items

- **`invite_to_list` leaks list existence.** `list_not_found` is raised *before* the
  `only_owner_can_invite` check, so any authenticated user can probe an arbitrary list
  UUID. Low value against UUIDs, but the ownership check should come first.
- **`supabase-admin.js` has no `server-only` guard** and pulls the secret through the
  shared `src/config-global.js:133`. It resolves to `''` in a client bundle (not
  `NEXT_PUBLIC_`), so there's no leak today — but `import 'server-only'` turns a future
  mistake into a build error instead of a silently keyless admin client.
- **One policy breaks the naming convention.** `"buyers can read own snapshots"` is the
  only space-separated policy name and the only one without an explicit `TO` role
  clause; everything else is `snake_case` + `TO authenticated`.
- **`schema-dump.sql` is stale and untracked.** Dumped 2026-07-16, five days behind the
  migrations, and `git log` shows no history for that path. Re-dump after each `db push`
  and commit it, so it's a source of truth rather than a snapshot of unknown age.
- **224 migrations, ~130 of them Portugal CAOP geography seed batches.** They dominate
  the folder and make the schema history unreadable. `supabase migration squash` on
  everything up to the last release tag.

---

## Applying

Migrations are numbered to run in order and are independent of each other except that
`20260722122000` assumes `20260722121000` has run (it special-cases
`upsert_ugc_translation`'s search_path).

```bash
npm run supabase:db:push
```

Ship the app changes **with or before** `20260722120000`: `deleteList` now reads the
money tables with the admin client and returns `has_active_subscriptions`, and the
migration flips those FKs to `RESTRICT`. Old app code against the new schema would show
a raw FK error instead of the friendly message — annoying, not dangerous.

Worth verifying by hand after applying, since none of this ran against a database here:

1. **Finding 3 is the behavioural one.** Exercise the paid-list e2e suite
   (`docs/TEST-PLAN.md`, the B9–B12 money-path cases). Confirm a snapshot buyer sees
   only captured items via a direct `GET /rest/v1/list_items?list_id=eq.<uuid>`, and
   that owners/subscribers/public readers are unaffected.
2. **Finding 2 has a built-in check.** `20260722121000` asserts the SQL hash matches
   `ugcContentHash()` against two known values and aborts if not, so a mismatch cannot
   reach production silently. After deploy, confirm `ugc_translation_cache` still gains
   rows — a stuck row count means writes are being rejected.
3. **Finding 4** — smoke-test one write per revoked table's normal path (restaurant
   ingest, Stripe webhook, sponsored placements) to confirm they still run under the
   service role.
4. **Finding 9 (`20260722126000`) is the highest-blast-radius migration.** It drops and
   recreates every function that returned `municipality_id` — six RPCs the map, discover
   and search surfaces depend on. It replays each function's captured ACL, but confirm
   afterwards that `anon`/`authenticated` still hold EXECUTE:

   ```sql
   SELECT p.oid::regprocedure, p.proacl FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname IN
     ('restaurants_in_bbox','restaurants_for_municipality','saved_restaurants_for_map',
      'following_restaurants_for_map','search_restaurants_by_name');
   ```

   Then exercise map bbox load, discover feed, saved/following map layers, and name
   search — those are the consumers of the renamed output column.
5. Then re-dump: `npm run supabase:db:pull` (finding 18d), which also gives the next
   review a source of truth that is not five days stale, and regenerate types with
   `npm run supabase:types` so `types.ts` reflects `locality_id`.
