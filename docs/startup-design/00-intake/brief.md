# Intake Brief — NomNom

**Phase:** 1 — Intake Interview
**Project:** nomnom
**Date:** 26 July 2026
**Confidence:** Medium-High on product, market, and tech (read directly from the codebase and existing docs). **Low on founder, traction, and monetisation intent** — those answers require the founder and are marked below.

---

## 0. How this intake differs from the standard process

The `startup-design` skill assumes a pre-build idea. NomNom is **already built**: v5.7.0, 613 commits since 28 March 2026, a Next.js 16 web app, Supabase schema with PostGIS, Capacitor iOS and Android projects, plus an as-implemented PRD, a binding brand guide, a Portugal marketing brief, and competitor review mining dated 25 July 2026.

Two phases are therefore adapted, and the adaptation is recorded in `PROGRESS.md`:

- **Phase 2 (Brainstorm)** explores *which strategic variation of the existing product to bet on*, not blue-sky alternatives to the idea.
- **Phase 6 (Product)** re-scopes the MVP against what has already shipped, rather than defining one from nothing.

Everything else runs as designed. Where the repo already answers a research question, this process builds on it and cites it rather than re-deriving it.

---

## 1. The idea

**One-liner (from `package.json`):** NomNom — discover restaurants through creators and real people.

**Problem statement [Data, `docs/PRD.md`]:** People discover places through short-form video and friends, but those signals are fragmented across saved posts, maps, and chat threads. There is no single place tying **trusted humans** (creators, locals) to **concrete venues** in their city, with lists that can be reused and shared.

**The sharper version of the same problem [Data, `docs/competitor-review-mining.md`, cross-cutting theme 4]:** *Saving is solved; returning is not.* Nobody has cracked "you saved 200 spots — here's the one for tonight." Instagram and TikTok have no mechanism to bring you back to a save; Google Maps lists cap at 300 items and evict saved places at random when they overflow.

**Proposed solution as built:** A signed-in app centred on the user's home locality, offering:

| Capability | Route / mechanism |
|---|---|
| Suggested creators by city | RPC `get_suggested_creators_for_municipality` |
| Tag-filterable restaurant discovery | RPC `restaurants_for_municipality`, limit 36 |
| Lists, including default favourites and collaboration | `ensure_default_favorites_list`, `lists_collaboration` migration |
| Map exploration with saved overlays | `/dashboard/map`, `restaurants_in_bbox_*` |
| **NomNom Roulette** — random pick to kill decision fatigue | `/dashboard/roulette`, public `/roleta/lisboa` |
| Public, auth-free profiles and lists | `/u/[username]`, `/lists/[id]` |
| Google Maps list import | `google-maps-import-modal.js`, `google-maps-import-actions.js` |

**What triggered the idea:** **[Unknown — founder input required]**

**Existing work:** Substantial. See §5.

---

## 2. The founder(s)

Every field in this section is **[Unknown — founder input required]** and each one changes downstream conclusions materially:

| Question | Why it matters downstream |
|---|---|
| Background and domain expertise | Feeds "Founder Fit" in the final dashboard; determines whether creator-side supply acquisition is credible |
| Solo or co-founded, and each person's strengths | A consumer social product needs distribution skill, not just engineering; 613 commits in four months suggests strong engineering and says nothing about distribution |
| Full-time or side project | Determines whether the Phase 8 experiment cadence is realistic |
| Budget and runway | Determines whether paid creator acquisition is an option at all |
| Unfair advantage — why you, for restaurant discovery in Portugal | The single most important intake answer, given that a funded incumbent already lost this fight (Zesty) |

**[Yellow Flag]** The evidence available points to a **strong engineering signal and an unmeasured distribution signal**. In a category whose documented failure mode is distribution rather than product quality, that asymmetry is the thing to worry about. Build velocity is not the constraint here.

---

## 3. The market

**Geography [Data, `docs/PRD.md` + `docs/marketing-brief-portugal-ugc.md`]:** Portugal. Lisbon and the Área Metropolitana de Lisboa as P0, Porto and the AMP second. Coimbra and Braga conditional on local creator audience. Faro and Lagos noted as seasonal secondary.

**Personas, already defined internally [Data, `docs/marketing-brief-portugal-ugc.md`]:**

| Persona | Profile | Core pain | Verbatim |
|---|---|---|---|
| **Inês, 27** — primary, "social discoverer" (ICP 1, P0) | 24–34, Lisbon/Porto, net household income roughly €1,400–2,800/month | Stories disappear; paid and organic content blur; hours and prices go stale; the WhatsApp group can't decide | "Não quero estrelas no Google — quero ver *mesmo* o prato e *quem* foi lá." |
| **Tiago, 32** — secondary, "the one who organises dinner" (ICP 2, P1) | 28–40, Porto/Lisbon | Too many tabs; generic "top 50" lists; aligning budget across a group | "Preciso de três sítios credíveis até quarta, com política de grupos." |
| **Beatriz, 23** — tertiary, local micro-creator (ICP 3, P2, supply side) | Micro to mid, 3k–150k followers, criterion is *local* engagement | Platforms don't map clip → door; repeated "onde é?" DMs; vague visit attribution | — |

**Anti-persona:** the generic-rankings, hotel-and-TripAdvisor user with no Reels habit.

**Current alternatives (the stack being replaced):** Instagram/TikTok saves + Google Maps saved lists + screenshots + WhatsApp.

**Known competitors [Data, `docs/competitor-review-mining.md`, 25 July 2026]** — grouped by bucket:

- **Social restaurant lists (closest):** Beli, Mapstr, Truffle, Savor, Crumble, World of Mouth, Rex, Nomblr, Feast, Shareables, Someday Map, Drawer, Resy shareable lists
- **Portugal incumbents:** TheFork, Tripadvisor, Mygon, DIG-IN, Time Out / NiT / Lifecooler guides
- **The real default:** Google Maps saved lists, Instagram/TikTok saves, WhatsApp screenshots
- **Departed:** Zomato exited Portugal, subsidiary liquidated July 2023 — leaving an orphaned Portuguese user base

That is **6+ identified direct and adjacent competitors**, which sets the complexity score in Phase 2.5.

**Structural market tailwind [Data, `docs/competitor-review-mining.md`]:** fake reviews are now a structural problem — roughly 10.7% of Google reviews estimated fake, Google removed 292M policy-violating reviews in 2025, AI-generated Tripadvisor reviews up 137% between 2019 and 2024. NomNom's "named, real people" positioning aims precisely at this wound. Requires independent verification in Phase 3.

---

## 4. The business

**Monetisation as designed [Data, `BRAND.md` §5]:**

- **Snapshot** — one-time purchase of a creator's list as it appears today
- **Subscription** — monthly access to all of a creator's subscriber-only lists
- Sponsored placements, marked as such **[Data, `docs/marketing-brief-portugal-ugc.md` guardrails]**

**Monetisation as implemented [Data, `docs/PRD.md`]:** `isSubscriber` UI hooks exist. **`POST /api/webhooks` returns 410. Payment-driven flows are explicitly a non-goal in the current codebase.** Creator "manage mentions" routes to a placeholder.

**[Red Flag]** The brand guide defines the revenue model in binding detail while the payment path is switched off. Either creator-paid-lists is the business and the webhook gap is the single highest-priority engineering item, or it is a placeholder and the actual business model is undecided. Phase 4 cannot produce an honest Lean Canvas without this answer.

**Pricing:** No price points found anywhere in the repo. `BRAND.md` establishes the *format* (`€10`, `€10–25`, `€10/month`) but not the number. **[Unknown — founder input required]**

**Definition of success at 6 / 12 / 36 months:** **[Unknown — founder input required]**

**Baseline success criteria that do exist [Data, `docs/PRD.md`]:** activation (onboarding completed, non-empty discover feed), engagement (adds to lists, returns to saved), shareability (public lists and profiles load without auth), reliability, and instrumented monitoring. All explicitly flagged as needing refinement against product analytics, with concrete dashboards marked TBD.

**[Yellow Flag]** These are activation and engagement proxies with no revenue or retention target among them. `docs/PRD.md` itself flags the dashboards as TBD, so there is no evidence yet that anyone is watching a number that would falsify the idea.

---

## 5. Existing work and traction

**Built [Data, repository at v5.7.0, 613 commits since 28 March 2026]:**

- Next.js 16 App Router, React 19, MUI v7, Tailwind v4, Framer Motion
- Supabase — auth via `@supabase/ssr`, Postgres, RPCs, RLS, PostGIS for localities and municipalities
- Mapbox / `react-map-gl` for map surfaces
- Capacitor iOS and Android projects present, plus a mobile smoke runbook — so `docs/PRD.md`'s "web-first, native apps are a non-goal" is now **stale**
- Resend transactional email; self-hosted notifications with in-app bell and Web Push (VAPID)
- PostHog product analytics, Sentry error monitoring, Vercel analytics
- Portuguese and English locales
- Remotion video pipeline and an Instagram posts directory — marketing production capability already in the repo

**Documented:** as-implemented PRD, binding brand and voice guide, Portugal marketing brief with personas and ICPs, competitor review mining with 20 ranked product ideas, content strategy, analytics tracking matrix, test plan, QA checklist, feature specs (754 lines), feature backlog, Stripe money-path runbook.

**Not built / not live:** payment webhooks (410), creator mention management (placeholder), editorial CMS (stubbed `/api/posts`).

**Real users, real revenue, seeded Lisbon supply, live creators:** **[Unknown — founder input required]**

**[Yellow Flag — anti-pattern watch: "building in stealth too long"]** Four months and 613 commits have produced a broad feature surface — discover, map, lists, collaboration, roulette, profiles, notifications, imports, settings, billing UI — while the documents that would prove anyone wants it (customer interviews) do not exist. `docs/marketing-brief-portugal-ugc.md` §5 says so itself: personas "devem ser validados com entrevistas (5–10)". That validation has not happened.

---

## 6. Constraints and preferences

**Technical:** Portugal-first data model (municipalities, localities via PostGIS). Mapbox and Supabase are load-bearing dependencies with quota and cost exposure. Roulette currently uses a fixed `ROULETTE_PREVIEW_BBOX` rather than the user's home locality — flagged as a UX risk in `docs/PRD.md`.

**Brand and positioning — already decided and binding [Data, `BRAND.md`]:**
- Voice: playful but substantive, trust-first, conversational and direct
- Explicitly *not* anti-tech, smug, or competitor-bashing
- British English; sentence case headings; no superlatives without evidence
- No "no advertising" claims — sponsored spots exist and are marked
- "Verified" only with a clear in-product criterion

**Regulatory:** See `00-intake/preflight.md` §3. Portuguese ad-disclosure law with platform co-liability up to €45,000; DSA notice-and-action at any size; GDPR exposure through location and profile data with a formal DPIA marked TBD in `docs/PRD.md`.

**Customer conversations to date:** **[Unknown — founder input required]** — and this is the highest-value gap in the whole intake. No interview artefacts exist in the repository.

---

## 7. The hard questions

| Question | Status |
|---|---|
| Why are you the right person to build this? | **[Unknown — founder input required]** |
| If a well-funded competitor launched this tomorrow, what would you do? | **[Partially answered by evidence]** — one already did. DoorDash launched Zesty in December 2025 and shut it down in April 2026. The lesson is that funding did not help; distribution and transaction proximity decided it. |
| What is the strongest argument against this idea? | **[Opinion, this analysis]** — Standalone restaurant discovery is a top-of-funnel product competing against a free habit inside apps people already have open. NomNom's differentiators are real but they are *feature* differentiators (never lose a save, visited state, provenance chips, group decisions, locals-eat-here) in a category where the documented cause of death is distribution. Features do not fix distribution. |
| Have you talked to potential customers, and what did they actually say? | **[Unknown — founder input required]** |
| What would make you walk away? | **[Unknown — founder input required]** — Phase 8 will propose explicit kill criteria to make this concrete |

---

## 8. Summary of understanding

NomNom is a **Portugal-first, creator-and-friends-led restaurant discovery app**, already built to v5.7.0 across web and Capacitor mobile, targeting 24–34-year-old urban Portuguese diners who currently discover food on Instagram and TikTok and lose those discoveries in Saved folders. It intends to monetise through creator-sold lists — one-time Snapshot purchases and monthly Subscriptions — with marked sponsored placements. Its differentiation rests on **visible human provenance** at a moment when roughly one in ten Google reviews is estimated fake, and on **solving the return trip** to a saved place, which no competitor has cracked.

The engineering is well ahead of the evidence. Product surface, brand, personas, and competitor intelligence are all documented to a high standard. What is missing is any contact with a customer, a live payment path, and a stated definition of success that could be falsified.

**Founder: please confirm or correct this summary, and fill the `[Unknown — founder input required]` fields.** Research proceeds in the meantime, since Phase 3 depends on market and geography rather than on founder biography.

---

## Flags

**Red Flags:**
- Revenue model is fully specified in `BRAND.md` but structurally disabled in code (`/api/webhooks` returns 410). Phase 4 cannot produce an honest Lean Canvas until the founder confirms whether creator-paid-lists is the real bet.
- Zero customer interview evidence after four months of building, in a category where the closest recent comparable (Zesty) died of demand-side and distribution problems rather than product problems.

**Yellow Flags:**
- Founder profile, runway, and time commitment entirely unknown; "Founder Fit" cannot be scored.
- No price points defined anywhere, so Phase 7 will run as Stage A (assumption-based) by default.
- Success criteria in `docs/PRD.md` are activation and engagement proxies with dashboards marked TBD — nothing currently in place could falsify the idea.
- Anti-pattern detected — **building in stealth too long**: broad feature surface, no customer contact.
- Anti-pattern risk — **boiling the ocean**: discover, map, lists, collaboration, roulette, profiles, notifications, imports, creator monetisation, and an editorial CMS stub all in flight at once, before a single validated user need.
- `docs/PRD.md` is stale on native apps — it lists them as a non-goal while `ios/`, `android/`, and `capacitor.config.ts` exist in the repository.
- **Nomblr** occupies near-identical positioning with a confusable name; trademark and SEO exposure unresolved.

## Sources

- `package.json` (v5.7.0), repository git history (613 commits, first 28 March 2026) — Tier 1, first-party
- `docs/PRD.md` — as-implemented baseline — Tier 1, first-party
- `docs/marketing-brief-portugal-ugc.md` — personas, ICPs, copy brief — Tier 1, first-party
- `docs/competitor-review-mining.md`, 25 July 2026 — competitor complaint analysis, 20 ranked ideas — Tier 2, internal secondary research
- `BRAND.md` — binding brand and voice guide — Tier 1, first-party
- `docs/startup-design/00-intake/preflight.md` — pre-flight findings with external sources
