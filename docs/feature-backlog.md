# NomNom feature backlog — what makes sense to add

**Date:** 25 July 2026
**Inputs:** `docs/competitor-review-mining.md` (competitor complaint research),
`docs/plan-visited-import-comments.md` (detailed plans for the first three), and a read of the
current codebase.

Everything here is a **gap** — checked against what is already built, so nothing below re-proposes
an existing feature. Effort is rough dev time for one person, excluding design.

---

## 0. What already exists (do not rebuild)

Worth stating, because several "obvious" ideas are already shipped:

Lists (private / public / subscriber-only), collaboration with roles, invites and join requests,
seeded "Must go" / "Visited" lists, Google Maps list import, map with bbox + tag filters + min-rating
+ **natural-language AI search**, NomNom Roulette (incl. a public variant), discover feed with tag
filtering and a lists leaderboard, restaurant reviews (half-star, media up to 6, 2000 chars),
must-try dishes (curated tags + AI signature dishes), AI review consensus, follows (people *and*
localities), suggested creators, public profiles `/u/:handle` and public lists `/lists/:id`,
notifications with in-app + web push + digests + mutes + granular preferences, Stripe subscriptions,
Snapshot purchases, Connect payouts and a freemium gate, admin sponsored placements, PWA install,
Capacitor iOS/Android shells, en/pt i18n, Tina-backed blog.

Restaurant records already carry **opening hours, closed status, price level and price tags** from
ingest — several items below are unlocking data we already have rather than new pipelines.

---

## 1. Close the loop on saves — the core wedge

The category's shared failure: saving is solved, *returning* is not. This is where NomNom can be
genuinely better rather than incrementally better.

| # | Feature | Why | Effort |
|---|---|---|---|
| 1.1 | **Been / to-try state** — type the seeded lists, badge everywhere, filter chips | Google Maps' most-cited gap; users hand-maintain two lists | 3–4 d · *planned* |
| 1.2 | **Imports land as "been"** | Beli users explicitly ask for this; no importer in the category does it | 0.5 d · *planned* |
| 1.3 | **Private notes on a saved spot** | Answers "social pressure corrupts honesty" — a note nobody else can read. `list_items` has no note column today | 1–2 d |
| 1.4 | **Resurface what you saved** — "47 saved · 6 been", a Roulette mode limited to saved-and-unvisited near you, an opt-in monthly digest | The defining failure of Instagram, TikTok and Maps saves alike | 2–3 d |
| 1.5 | **"Open now" filter** | Hours and closed status are already ingested and unused in the UI. Cheapest real win in this document | 1 d |
| 1.6 | **Group decision mode** — shortlist a few spots, share a link, everyone taps, top pick wins | Nobody in the competitive set does group decision-making; every list app stops at the list | 4–5 d |
| 1.7 | **Occasion filters** (date night, quick lunch, group dinner) on discover and map | Tag catalog and filter UI already exist; this is curation, not engineering | 1–2 d |

**1.6 is the one to look hardest at.** It is the only item here with no competitor equivalent, it is
inherently viral (a share link that pulls friends in), and it turns Roulette from a novelty into the
thing people open the app for on a Friday.

---

## 2. Getting spots in — acquisition and migration

| # | Feature | Why | Effort |
|---|---|---|---|
| 2.1 | **Instagram data-export import** (bulk) | The proven demand — four startups exist purely for this. ToS-clean, user-initiated | 4–5 d · *planned* |
| 2.2 | **TikTok single-URL import** | Public documented oEmbed, no auth | 2 d · *planned* |
| 2.3 | **Instagram single-URL import** | Works, but ToS-adverse and fragile — flag it | 2 d · *planned, flagged* |
| 2.4 | **Native share sheet** (iOS Share Extension + Android `ACTION_SEND`) | The highest-retention version of import; save straight from Instagram without opening NomNom | 5–8 d, native |
| 2.5 | **Paste anything** — a WhatsApp message, a blog URL, a screenshot | The real input format for Portuguese restaurant recs is a friend's text message. The LLM plumbing already exists | 3–4 d |

Sequence matters: 2.1 first (durable, bulk, ToS-clean), then 2.2, and treat 2.4 as its own project
rather than a phase of the importer.

---

## 3. Trust — the brand promise made literal

`BRAND.md` promises "picks from people you trust, not algorithms". Right now that lives in copy.
These make it visible in the product, at the moment fake reviews hit ~10% of Google.

| # | Feature | Why | Effort |
|---|---|---|---|
| 3.1 | **Provenance chips** — "saved by 3 people you follow", "from @handle's list, May 2026" | Beli, Tripadvisor and World of Mouth are all distrusted for opaque or influencer-driven ranking | 2–3 d |
| 3.2 | **Paid / gifted disclosure badge** on creator picks | World of Mouth's central criticism is curation that is marketing in disguise. We take money from creators, so we need this before it is asked of us | 2 d |
| 3.3 | **Report a wrong or closed spot**, with a notification back when it is fixed | Data-quality complaints sink Beli and Mapstr — but the real grievance is silence. Feedback exists today but is not restaurant-scoped | 3–4 d |
| 3.4 | **"Locals eat here" signal** | The Portugal wedge. Tripadvisor's rankings route people to tourist traps; locals use heuristics (Portuguese-only menu, off the tourist grid, busy at lunch) that are encodable from who saves a place | 5–7 d |
| 3.5 | **Minimal permissions, asked in context** + a plain-language privacy page | Beli requests contacts, always-on location, microphone and photo library. Asking for less, later, and saying why is free differentiation | 1–2 d |

**3.4 is the most defensible thing in this document.** A booking platform cannot bolt it on, and it
is the answer to the one question every Lisbon visitor and half the residents actually ask.

---

## 4. Social depth — retention

| # | Feature | Why | Effort |
|---|---|---|---|
| 4.1 | **Comments per spot on shared lists** | Flatly absent from Google Maps group lists; turns a list into a thread | 5–7 d · *planned* |
| 4.2 | **Reactions on list items** | A lighter-weight signal than a comment; most people will never write one | 1–2 d |
| 4.3 | **Ask your circle** — "where should I eat in Alfama on Friday?" answered by people you follow | The behaviour already happens in WhatsApp. Follows, notifications and profiles are all built | 5–7 d |

4.2 should ship *with* 4.1 — same surface, a fraction of the cost, and it carries the majority of the
engagement.

---

## 5. Hygiene — the features that prevent one-star reviews

Unglamorous, cheap, and each one directly answers a complaint category that damages competitors.

| # | Feature | Why | Effort |
|---|---|---|---|
| 5.1 | **Export your data** (lists, saves, notes — CSV/JSON) | Nobody in the set offers it. Zomato liquidated its Portuguese arm in 2023; "platforms leave and take your saves" is real, and an export button is the credible answer | 2 d |
| 5.2 | **Cancellation that cancels** — one screen, and account deletion that also ends billing | The most damaging review category for any paid app: "deleting the account didn't stop the charges" | 2–3 d |
| 5.3 | **Never lose a save** — no caps, notes preserved on move/remove, stated on the pricing page | Mapstr's 300-place cap and Maps' random deletion are their loudest complaints. Mostly a promise we can already keep — make it explicit | 1 d |
| 5.4 | **Notification restraint** — digest by default, per-list mute | Mass-duplicate notifications recur across the category. The tables exist; this is a defaults decision plus a settings row | 1–2 d |
| 5.5 | **Support SLA, stated** | "We answer within 24 hours" is a differentiator when TheFork's worst reviews are about no one replying | Ops, not code |

5.1–5.3 together cost about a week and remove three entire complaint categories before we ever earn
them. That is unusually good value.

---

## 6. Creator and revenue — the rails already exist

| # | Feature | Why | Effort |
|---|---|---|---|
| 6.1 | **Creator analytics** — what got saved, what converted, from which list | Creators are the supply side; they will ask, and nothing exists today | 4–5 d |
| 6.2 | **"What's new since your Snapshot"** as a real changelog | `snapshotNewRestaurantCount` already computes the number; showing *which* spots turns a one-off purchase into a repeat one | 2–3 d |
| 6.3 | **Referral without the MLM smell** — reward the inviter, never gate a core feature behind referring | Beli's referral wall on its average-score feature is its most mocked decision. Do the inverse, deliberately | 2–3 d |
| 6.4 | **Restaurant-side claim page** | Only if venue monetisation is ever on the table. TheFork's restaurateur reviews are almost entirely billing failures — that is the bar to clear | Not now |

---

## 7. Recommended sequence

**Now** (~3 weeks, the highest-conviction block)
1.1 visited state → 1.2 import-as-been → 1.5 open now → 5.1/5.2/5.3 hygiene → 4.1 + 4.2 comments

**Next** (~3–4 weeks)
2.1 Instagram export import → 2.2 TikTok → 1.4 resurface saves → 3.1 provenance → 3.3 report a spot

**Then** (differentiation, needs more design)
1.6 group decision → 3.4 locals signal → 4.3 ask your circle → 6.1 creator analytics

**Separate track**
2.4 native share sheet (native work) · 3.2 disclosure badge (ship before creator monetisation scales)

---

## 8. What not to build

Saying no is half of this document.

- **A global ranking ladder.** Beli's forced pairwise comparison — Korean BBQ against a brunch spot —
  is one of its top complaints. If ranking ever happens, rank within an occasion or category, and
  keep it optional.
- **Public comments in v1.** They are a moderation, spam and reporting programme, not a comment box.
  Members-only first.
- **Gamification** — streaks, badges, leaderboards of people. The category's own critique is that
  social pressure makes people log for an audience instead of honestly. The existing *lists*
  leaderboard is fine; a people leaderboard is not.
- **Always-on location.** Foreground only, asked when the map or Roulette needs it.
- **Auto-creating restaurants from imports.** Already policy in the Maps importer. Keep it — a
  caption is not a source of truth.
- **Chasing delivery.** Uber Eats, Glovo and Bolt Food own it, it is a different job, and it would
  undercut the "real people, real places" premise.

---

## 9. Open questions

1. **Who is the priority user — resident or visitor?** It changes the ordering completely. 3.4
   ("locals eat here") and 1.6 (group decision) are resident features; import and provenance skew
   visitor. The Portugal brief implies residents first, but this has never been stated as a
   constraint on the roadmap.
2. **Is creator monetisation the business, or is it consumer subscription?** 6.1–6.3 are only worth
   their cost if creators are the growth engine.
3. **How much moderation appetite is there?** It gates public comments (4.1 v2), reports (3.3), and
   any user-generated venue data.
