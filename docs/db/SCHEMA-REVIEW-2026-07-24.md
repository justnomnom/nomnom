# Database review — 2026-07-24

Scope: `public` schema — RLS posture, grants, `SECURITY DEFINER` bodies, indexes, constraints,
data types, and live data integrity.

**Basis.** Unlike the 2026-07-22 pass, this review ran against the **live production database**
(`jxknitagufcuyeozlazc`, Postgres 17.6) over a direct connection, inside a
`default_transaction_read_only = on` session. Every finding marked *verified* below was
reproduced by querying production, including role impersonation (`SET LOCAL ROLE anon` /
`authenticated`) to test what each role actually sees. No writes were performed.

**Runtime statistics are not usable.** Postgres restarted at `2026-07-23 22:45` and
`pg_stat_statements` was reset at the same moment, so every `idx_scan`, `seq_scan` and
`n_live_tup` reads zero. Nothing here claims an index is unused, and no query-level hot spots
could be identified. Re-run that part after a week of real traffic.

**The database is at pre-launch scale.** 5 restaurants, 3 users, 88 lists, 1 list item, 0
subscriptions, 0 purchases, 0 paid lists. `cities` (3 549 rows / 63 MB of boundary polygons) is
the only table with meaningful volume. This matters twice over: none of the money-path findings
are exploitable *today* for lack of data, and none of the performance findings have shown up
yet because nothing is big enough to be slow. Both change the moment the Portugal scrape lands.

---

## Status — all findings fixed except one that cannot be

Migrations written and dry-run against production inside a rolled-back transaction (all 5
apply cleanly; 12/12 post-condition checks pass). `tsc --noEmit` and `eslint` clean;
`npm test` 847 pass / 0 fail.

| Migration | Closes |
|---|---|
| `20260724120000_revert_locality_rename.sql` | 4 |
| `20260724121000_geography_active_semantics.sql` | 1 |
| `20260724122000_least_privilege_grants.sql` | 2, 5, and documents 3 |
| `20260724123000_list_access_and_ownership.sql` | 6, 7, 8 |
| `20260724124000_integrity_constraints_and_hardening.sql` | 9, 10, 11, 12, 13, 14, 15, 16 |

App changes: `ugc-translate.js` (write moved to service role), and the `locality_id →
municipality_id` rename across `admin-reference-actions.js`, `list-actions.js`,
`ingest/route.js`, `fetch-restaurant-by-id-for-ssr.js`, `discover-view.js`,
`remotion/scripts/fetch-restaurant-props.mjs`, `tests/e2e/support/{seed,supabase-service}.ts`,
and `.cursor/prompts/geography-database-seed.md`.

**Finding 3 is not fixed and cannot be fixed from a migration.** See its section — the
remediation requires Supabase to act as `supabase_admin`.

---

## Summary

| # | Finding | Severity | Verified live |
|---|---|---|---|
| 1 | Every restaurant's city resolves to NULL for all callers | **High** | yes |
| 2 | `anon` can overwrite entries in the shared UGC translation cache | **High** | yes |
| 3 | `spatial_ref_sys`: RLS off + `anon` holds DELETE/TRUNCATE | **High** | yes |
| 4 | `locality_id` now names two different geography tiers | Medium-High | yes |
| 5 | `anon` holds INSERT/UPDATE/DELETE on 14 app tables | Medium | yes |
| 6 | 82 of 88 lists are ownerless and permanently unmanageable | Medium | yes |
| 7 | Snapshot buyers lose access if the creator disables paid access | Medium | code |
| 8 | Draft `public_subscribers` lists readable by any signed-in user | Medium | code |
| 9 | One `auth.users` row has no `public.users` profile | Medium | yes |
| 10 | No length limits on user-writable text columns | Medium | yes |
| 11 | `currency` / `amount_cents` / `restaurants.rating` unconstrained | Low-Medium | yes |
| 12 | `restaurant_images` exposes unmoderated `pending` images | Low-Medium | yes |
| 13 | `sponsored_restaurant_placements.restaurant_id` has no index | Low | yes |
| 14 | 4 tables' policies target `PUBLIC` instead of `authenticated` | Low | yes |
| 15 | `search_restaurants_by_name` does not escape LIKE metacharacters | Low | yes |
| 16 | `idle_in_transaction_session_timeout = 0`, `track_io_timing = off` | Low | yes |

### What is already right

Worth stating, because it is most of the schema. RLS is enabled on every table but one.
**Every** `auth.uid()` call in **every** policy is wrapped as `(SELECT auth.uid())`, so the
initplan optimisation is applied uniformly — this is the single biggest RLS performance factor
and it is done correctly throughout. All 66 app `SECURITY DEFINER` functions set an explicit
`search_path` ending in `pg_temp`, and `PUBLIC` has `USAGE` but **not** `CREATE` on schema
`public`, so the `search_path=public` in those functions is not hijackable. FK coverage is good
(only one genuine gap, #13). The trgm GIN indexes correctly support the leading-wildcard search
the code actually issues. Money-path FKs are `RESTRICT`. `statement_timeout` is set per role
(anon 3 s, authenticated 8 s). Constraint coverage on `restaurant_reviews` (rating range,
half-step, body length, media array shape and length) is genuinely thorough.

---

## 1. Every restaurant's city resolves to NULL for all callers — High

`restaurants.locality_id` references the **municipality** tier of `cities`
(`is_municipality = true`). In production **all 308 municipality rows have `active = false`**,
while all 3 241 locality rows have `active = true`:

| active | is_municipality | count |
|---|---|---|
| true | false | 3 241 |
| false | true | 308 |

The only SELECT policy on `cities` is `cities_read_active USING (active)`. So no municipality row
is visible to `anon` or `authenticated` — and therefore no restaurant's city is either.
Verified by impersonation:

```
SET LOCAL ROLE anon;
SELECT count(*) FROM restaurants r JOIN cities c ON c.id = r.locality_id;  -- 0
SET LOCAL ROLE authenticated;
SELECT count(*) FROM restaurants r JOIN cities c ON c.id = r.locality_id;  -- 0
```

All 5 restaurants are affected (3 in Caldas da Rainha, 2 in Óbidos — both `active = false`).

The user-visible consequence is in [fetch-restaurant-by-id-for-ssr.js:84](src/libs/restaurant/fetch-restaurant-by-id-for-ssr.js:84),
which embeds `home_city:cities!restaurants_locality_id_fkey (name, states (name))` through
`createSupabaseServerClient()` — a session-scoped client, so `anon` or `authenticated`, never
`service_role`. **Restaurant detail pages render with no city and no state, for logged-out and
logged-in visitors alike.**

This is not a data-entry mistake: the ingest route assigns the municipality deliberately
([route.js:434-437](src/app/(frontend)/api/restaurants/ingest/route.js:434)), and the geography
tier design says municipality rows are a grouping tier that is intentionally not user-selectable
— which is presumably why they are `active = false`. The bug is that `active` is doing two jobs:
"selectable as a user's home locality" and "readable at all". The policy enforces the second
using a flag that means the first.

**Fix.** Split the two meanings. Either add a second SELECT policy admitting municipality rows —

```sql
CREATE POLICY cities_read_municipality_tier ON public.cities
  FOR SELECT TO anon, authenticated
  USING (is_municipality);
```

— or, better, stop overloading `active`: introduce `selectable_as_home boolean`, set
`active = true` on municipality rows, and move the onboarding/home-locality filters onto the new
column. The second is more work but removes the trap permanently. Whichever you pick, add an
e2e assertion that a logged-out restaurant page shows its city; nothing currently catches this.

## 2. `anon` can overwrite entries in the shared UGC translation cache — High

`upsert_ugc_translation` is `SECURITY DEFINER` and executable by `anon` (verified:
`has_function_privilege('anon', …, 'EXECUTE') = true`). It writes `public.ugc_translation_cache`,
which `ugc_translation_cache_select USING (true)` exposes to everyone, and which
[ugc-translate.js:35](src/lib/ugc-translate.js:35) reads to render dish names to users.

The function is carefully hardened in most respects — it bounds text to 2 000 chars, bounds
locale to 16, and recomputes `content_hash` from the supplied text rather than trusting the
caller. Its own comment explains the hash check as "what stops one caller from overwriting
another's entry." That is not what it does. The hash is a pure function of `(source_text,
source_locale)`, and source texts are public dish names. Anyone who can see a dish name can
compute its hash, and the `ON CONFLICT … DO UPDATE SET translated_text = EXCLUDED.translated_text`
then lets them replace what every user in that locale sees. The hash prevents *key forgery*, not
*overwriting*. There is no ownership check, no rate limit, and no authentication.

Two consequences: **content injection** — arbitrary attacker-controlled text rendered as the
translated dish name for all users — and **unbounded growth**, since each distinct `source_text`
mints a new row at up to ~4 KB, with no per-caller cap.

**Fix.** The only writer is server-side ([ugc-translate.js:55](src/lib/ugc-translate.js:55),
reached from a server action and the ingest path). Nothing in the browser needs this:

```sql
REVOKE EXECUTE ON FUNCTION public.upsert_ugc_translation(text,text,text,text,text,text)
  FROM anon, authenticated;
```

Then confirm the call sites use a service-role client. If any legitimately runs as the end user,
gate the function body on `auth.uid() IS NOT NULL` and add a per-user insert budget instead.

## 3. `spatial_ref_sys`: RLS off and `anon` holds DELETE/TRUNCATE — High

It is the one table in `public` with `relrowsecurity = false`, and PostGIS's default grants were
never revoked:

| table | rls | anon DELETE | anon TRUNCATE |
|---|---|---|---|
| `spatial_ref_sys` | **off** | true | true |

The write access is real, not theoretical. Probed on production as `anon` inside a rolled-back
transaction:

```
DELETE FROM public.spatial_ref_sys WHERE srid = -999     -> ALLOWED
UPDATE public.spatial_ref_sys SET ... WHERE srid = -999  -> ALLOWED
INSERT INTO public.spatial_ref_sys ...                   -> blocked only by the srid
                                                            range CHECK, not by privileges
```

So an anonymous PostgREST caller can `DELETE FROM spatial_ref_sys` and take out all 8 500 SRID
definitions, breaking every `ST_Transform`, `ST_MakeEnvelope` and geography cast in the app —
that is, the entire map.

**This is the one finding that could not be fixed, and the reason matters.** The table is owned
by `supabase_admin` and the grants were *made by* `supabase_admin`. `REVOKE` only removes grants
issued by the role running it, so a `REVOKE` as `postgres` **succeeds silently and changes
nothing** — worse than not writing it, because it looks fixed. Every alternative is closed too:

```
SET ROLE supabase_admin                               -> permission denied
ALTER TABLE spatial_ref_sys OWNER TO postgres         -> must be owner of table
ALTER TABLE spatial_ref_sys ENABLE ROW LEVEL SECURITY -> must be owner of table
REVOKE as supabase_privileged_role / authenticator / service_role  -> runs, no effect
ALTER EXTENSION postgis SET SCHEMA extensions         -> postgis does not support SET SCHEMA
```

(`postgres` on this project is not a superuser and is not a member of `supabase_admin`.
Relocating PostGIS out of `public` — the usual way to get `spatial_ref_sys` out of PostgREST's
reach — is not available either: PostGIS has never supported `SET SCHEMA`, and dropping and
recreating the extension would drop every geometry and geography column in the database.)

**Remediation — needs Supabase.** Open a support ticket asking them to run, as `supabase_admin`:

```sql
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.spatial_ref_sys FROM anon, authenticated;
```

Until then this is an accepted, documented exposure. `20260724122000` records the full
investigation in a comment so the next reviewer does not repeat it.

`geometry_columns` and `geography_columns` carry the same grants but are `supabase_admin`-owned
views over `pg_catalog` and are not practically writable.

## 4. `locality_id` now names two different geography tiers — Medium-High

Migration `20260722125000_geography_tier_documentation.sql` investigated the proposed
`municipality_id → locality_id` rename and concluded, in its own header:

> "Supersedes finding 9 of the 2026-07-22 schema review (removed; this document supersedes it),
> which proposed renaming restaurants.municipality_id to locality_id. That was WRONG and is not done"

and, specifically: "Renaming municipality_id to locality_id would have collided with
users.home_locality_id and quietly conflated the two."

Migration `20260722126000_rename_municipality_to_locality.sql` — the next one — performed the
rename anyway, and commit `eb5aba0` propagated it across the codebase. The live schema now has:

- `restaurants.locality_id` → **municipality** tier (`is_municipality = true`)
- `users.home_locality_id` → **locality** tier (`is_municipality = false`)
- `user_location_follows.locality_id` → **locality** tier

The live column comments are commendably honest about it — `restaurants.locality_id` is
documented as "MUNICIPALITY tier … Despite the name this is NOT the same tier as
users.home_locality_id" — and the `cities` table comment now ends "since 20260722126000 the
column names no longer distinguish them." That is a correct description of a problem, not a
solution to it. Finding #1 is the first concrete instance of the confusion; the danger is that
the next one is written by someone who reasonably assumes two identically-named columns mean the
same thing.

**Fix.** Revert the rename (`locality_id → municipality_id` on `restaurants` only) unless there
is a product reason for it that supersedes 125000's analysis. If it stays, rename the *other*
side instead so the two tiers never share a name.

## 5. `anon` holds INSERT/UPDATE/DELETE on 14 app tables — Medium

`customers`, `list_item_must_try_dishes`, `list_items`, `lists`, `notification_mutes`,
`notification_preferences`, `notifications`, `push_subscriptions`, `restaurant_reviews`,
`user_follows`, `user_location_follows`, `user_restaurant_tag_preferences`, `users`.

Not currently exploitable — I traced every write policy on these tables and each one requires
`auth.uid()` to match, which is NULL for `anon`, so every predicate evaluates to NULL and the
write is refused. The issue is that RLS is the *only* thing refusing it. Least privilege says an
unauthenticated role should not hold DML on `users` or `lists` at all, so that a future policy
mistake is a bug rather than a breach.

(The 2026-07-22 review reported "Offending write grants to anon/authenticated: 0". That check
must have been narrower than its label; the grants above are present in production now.)

**Fix:** `REVOKE INSERT, UPDATE, DELETE ON <those tables> FROM anon;` — keep them for
`authenticated`, which the policies do meaningfully constrain.

## 6. 82 of 88 lists are ownerless and permanently unmanageable — Medium

`lists_user_id_fkey` is `ON DELETE SET NULL`. 82 rows now have `user_id IS NULL` (all
`visibility = 'public'`, all unpublished — almost certainly e2e users that were deleted).

Both write policies are `USING (user_id = (SELECT auth.uid()))`. `NULL = anything` is NULL, so
these rows can never be updated or deleted by any user, ever. They are immortal, and because
`list_user_can_read_metadata` returns true for `visibility = 'public'` regardless of owner, a
published one would stay publicly visible forever with nobody able to take it down.

**Fix:** change the FK to `ON DELETE CASCADE` (a list without an owner has no meaning), and clean
up the 82 existing rows with a service-role delete.

## 7. Snapshot buyers lose access if the creator disables paid access — Medium

`list_snapshot_grants_item` requires `COALESCE(l.paid_access_enabled, FALSE)` before honouring a
purchase in `list_snapshot_purchases`. A creator who toggles `paid_access_enabled` off
immediately revokes every past buyer's access to content they paid for. No refund is triggered,
and the purchase rows survive (`RESTRICT`), so the money is kept.

Not reachable today (0 paid lists, 0 purchases), but it is on the money path and should be
settled before the first sale. The same function also checks
`l.visibility IN ('public_subscribers','private')` while the
`lists_paid_requires_subscriber_visibility` CHECK makes `private AND paid_access_enabled`
unsatisfiable — so the `'private'` branch is dead code today, and would only come alive through
exactly the toggle described above.

**Fix:** grant on the *existence of the purchase*, not on the list's current paid flag.

## 8. Draft `public_subscribers` lists readable by any signed-in user — Medium

Both `list_user_can_read_live` and `list_user_can_read_metadata` contain:

```sql
l.visibility = 'public_subscribers'
AND ( l.published_at IS NOT NULL OR (SELECT auth.uid()) IS NOT NULL )
```

The right-hand disjunct means "…or the caller is logged in at all", which makes unpublished
drafts readable by every authenticated user — full item contents for free lists (`read_live`
additionally requires `NOT paid_access_enabled`), and name/description/cover/price metadata for
paid ones (`read_metadata` has no paid check on this branch). That reads like a test affordance
that outlived its purpose. No such lists exist today.

**Fix:** drop `OR (SELECT auth.uid()) IS NOT NULL` from both, so `published_at IS NOT NULL`
governs; owners and members are already covered by the earlier disjuncts.

## 9. One `auth.users` row has no `public.users` profile — Medium

`fe81fdb6-866e-4000-b4a9-9713d2b801c0`, created 2026-07-23 14:29, confirmed, has an email — and
no row in `public.users`. The `handle_new_user` trigger should have created one. 1 of 4 auth
users, which is a high miss rate even at this volume.

Every profile read path assumes the row exists, so this account is in a broken state. Worth
checking whether the trigger raised (`handle_new_user` is `SECURITY DEFINER` with a 2.4 KB body
that also seeds default lists and a `customers` row — several places to fail) and whether the
failure was swallowed. Add a reconciliation query to your monitoring; a nightly
`auth.users LEFT JOIN public.users` count should be 0.

## 10. No length limits on user-writable text columns — Medium

`restaurant_reviews.body` has `char_length(body) <= 2000`. Nothing else does. Unbounded and
directly user-writable via RLS UPDATE on their own row:

`users.bio`, `users.display_name`, `users.username`, `users.avatar_url`,
`users.social_{instagram,tiktok,youtube,website}`, `lists.name`, `lists.description`,
`lists.cover_image_url`, `lists.slug`, `list_item_must_try_dishes.label`,
`push_subscriptions.{endpoint,p256dh,auth,user_agent}`.

Postgres will take ~1 GB in a single `text` value. A user can inflate their own row until the
table is unusable, and `users.bio` is returned by public profile RPCs, so it is served to other
users too. Current maxima are tiny (bio 0, username 21, list name 7), so this is prophylactic.

`users.username` deserves particular attention: it is unique on `lower(username)` and used in
profile URLs, but has no length *or* format constraint, so a username containing `/`, `?` or a
few thousand characters is storable.

**Fix:** add `CHECK (char_length(col) <= n)` across the set, and a
`CHECK (username ~ '^[a-z0-9_.]{3,30}$')` on username.

## 11. `currency`, `amount_cents` and `restaurants.rating` unconstrained — Low-Medium

- `currency` is bare `text` with `DEFAULT 'eur'` on `lists`, `list_snapshot_purchases`,
  `list_subscription_payments` — no CHECK, no case enforcement. `'EUR'` and `'eur'` are both
  storable and will not compare equal during Stripe reconciliation.
- `monthly_amount_cents`, `amount_cents`, `amount_paid_cents` are `integer` with no positivity
  CHECK. Negative and zero amounts are storable.
- `restaurants.rating` is `double precision` with **no range constraint**, while
  `restaurant_reviews.rating` is `numeric(4,1)` with range *and* half-step CHECKs. A restaurant
  rating of 47.0 or -3 is currently valid. (Live data is fine: min 4.3, max 4.9.) The type
  mismatch also means the two cannot be compared or aggregated without a cast.

**Fix:** `CHECK (currency = lower(currency) AND char_length(currency) = 3)`,
`CHECK (amount_cents > 0)`, `CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5))`.

## 12. `restaurant_images` exposes unmoderated images — Low-Medium

`restaurant_images_read_all USING (moderation_status <> 'rejected')` — so `'pending'` is public.
Given the column exists at all, the intent was presumably to gate on approval. If images are only
ever inserted by the ingest pipeline this is harmless; if users can ever upload, an image is
public from upload until a moderator rejects it, which inverts the workflow.

**Fix (if user uploads are on the roadmap):** `USING (moderation_status = 'approved')`, plus an
owner-scoped policy so uploaders can see their own pending images.

## 13. `sponsored_restaurant_placements.restaurant_id` has no index — Low

The only genuine FK gap. The other four flagged by a naive check
(`cities.parent_municipality_id`, `list_members.invited_by`,
`list_item_must_try_dishes.tag_id`, `sponsored_restaurant_placements.state_id`) are covered by
partial indexes whose predicate the FK lookup satisfies, so the planner can use them.

Here, `restaurant_id` appears only as the *second* column of two partial unique indexes, so
deleting a restaurant seq-scans the placements table. It is empty today; this only matters once
sponsorships exist. `CREATE INDEX ON sponsored_restaurant_placements (restaurant_id);`

## 14. Four tables' policies target `PUBLIC` instead of `authenticated` — Low

`notifications`, `notification_preferences`, `notification_mutes`, `push_subscriptions` have
`polroles = {0}` (PUBLIC); every other table names roles explicitly. Functionally safe — the
predicates are `(SELECT auth.uid()) = user_id`, which is NULL for `anon` — but it means these
policies are evaluated for `anon` on every request rather than skipped, and it makes the intent
harder to read. Add `TO authenticated` for consistency.

## 15. `search_restaurants_by_name` does not escape LIKE metacharacters — Low

The needle goes into `LIKE '%' || q.needle || '%'` unescaped. Not SQL injection — it is
parameterised, and the function is `STABLE SECURITY DEFINER` reading only public data — but `%`
and `_` in a user's query act as wildcards, so searching `50_` or `%` matches far more than
intended (`%` alone matches everything, up to the `LIMIT 50` cap).

**Fix:** `replace(replace(replace(needle,'\','\\'),'%','\%'),'_','\_')`.

## 16. Session and monitoring settings — Low

- `idle_in_transaction_session_timeout = 0` (disabled). A client that opens a transaction and
  stalls holds its locks and blocks vacuum indefinitely. Set it: `ALTER ROLE authenticated SET
  idle_in_transaction_session_timeout = '30s';` (and the same for `anon`).
- `track_io_timing = off` — without it `pg_stat_statements` cannot attribute time to I/O, which
  is the first thing you will want when the scrape data lands. Turn it on before then.
- Instance sizing for reference: `shared_buffers` 224 MB, `work_mem` 2.1 MB,
  `effective_cache_size` 384 MB, `max_connections` 60, `jit` off. Appropriate now; revisit
  before the Portugal dataset arrives.

---

## Before the Portugal scrape lands

These are not defects — they are the things that stop being free once `restaurants` goes from 5
rows to six figures.

**`restaurants.metadata` is the main risk.** It averages **7.7 KB/row** (max 9.2 KB) today. At
100 k restaurants that is ~800 MB of JSONB before TOAST overhead, in the table that every map and
search query touches. There is no GIN index on it, and `restaurants_in_bbox` /
`search_restaurants_by_name` both return the whole `metadata` blob to the client on every row.
Decide now which keys are actually read at query time; promote those to real columns (`rating`
and `price_level` already were), stop selecting the blob in list/map RPCs, and add
`GIN (metadata jsonb_path_ops)` only if you genuinely filter on it. Shipping 7.7 KB × 50 pins per
map pan is the more immediate cost.

**Re-run the statistics review after real traffic.** Everything in the "unused index" category is
unanswerable right now. Once there is a week of production traffic, check `pg_stat_user_indexes`
for indexes with `idx_scan = 0` — there are 93 indexes and at this schema size several are
probably speculative.

**Confirm autovacuum keeps up on `restaurants`.** No table has custom `reloptions`; defaults
assume moderate churn. A bulk ingest of 100 k rows followed by metadata backfills will generate
dead tuples faster than the default `autovacuum_vacuum_scale_factor = 0.2` reacts to.

---

## Point of intent to confirm — not a defect

`list_has_active_paid_subscription` grants access to a target list if the caller holds *any*
active subscription to *any* paid list **by the same creator**
(`subscribed_list.user_id = target_list.user_id`). One subscription therefore unlocks that
creator's entire paid catalogue. Migration `20260412160000_bundle_creators_subscriber_subscription.sql`
names this as the intent, so it is by design — but it means price is per-creator, not per-list,
and a subscriber to the cheapest list gets the most expensive one. Worth confirming that is still
the commercial model before the first paid list is published.

---

## Suggested order of work

1. **#1** — a user-visible bug on every restaurant page, for every visitor, right now.
2. **#3, #2** — two grant revocations; small, self-contained, and both close live holes.
3. **#5, #14** — the rest of the grant/policy tidy-up, same migration.
4. **#6, #9** — data integrity: FK action plus cleanup, and the profile-creation gap.
5. **#4** — settle the naming before more code is written against it.
6. **#7, #8, #11, #12** — money path and paid-list access, before the first paid list ships.
7. **#10, #13, #15, #16** — hardening; no deadline.

Items 1–4 are all `ALTER`/`REVOKE`/`CREATE POLICY` statements with no data migration, and could
reasonably be one migration.

---

## Method note

Findings were derived from live `pg_catalog` / `information_schema` queries and
`pg_get_functiondef` on production, cross-checked against the migration files and the calling
code in `src/`. Role-visibility claims were tested by impersonation inside a read-only
transaction rather than inferred from policy text. `supabase/migrations/schema-dump.sql` (dated
2026-07-22 21:24) predates migrations `20260722129000` and `20260722129500` and was used only for
orientation, not as evidence.
