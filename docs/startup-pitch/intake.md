# Intake: NomNom

*Skill: startup-pitch | Generated: 26 July 2026*

**Source:** Consolidated from `docs/startup-design/` (intake brief, brainstorm, market, competitors, audience, research gate) plus founder-delegated defaults (“you decide all”) where fields were still `[Unknown]`. Every delegated default is labelled **[Assumption]**.

---

## 2-sentence description (foundation)

NomNom helps people in Lisbon decide where to eat from spots that creators and friends they trust actually saved — not anonymous Google stars. Lists, profiles, and Roulette open from a public link — no app install required.

**Specific example (product, not traction):** A group stuck on “onde jantar?” opens one NomNom list from a creator they follow, filters to their neighbourhood and budget, spins Roulette once, and books — without downloading anything.

**2-sentence test:** A smart friend should paraphrase: *trusted people → real places → shareable without install.* If they say “another restaurant app” or “Portuguese Beli,” the opener failed.

---

## Company context

| Field | Decision | Label |
|---|---|---|
| **Product** | Portugal-first creator-and-friends restaurant discovery; web + Capacitor iOS/Android; v5.7.0; ~613 commits since 28 Mar 2026 | [Data] repo / startup-design brief |
| **Spearhead** | Distribution-first: auth-free lists + group decide (Roulette) + creator `/u/handle` pages. Creators = supply/trust; install = upgrade | [Opinion] brainstorm convergence V2+V5 |
| **Problem** | Saving is solved; returning (and deciding with a group) is not. Stack today: IG/TikTok saves + Maps lists + screenshots + group chats | [Data] PRD + competitor mining |
| **ICP** | Urban PT diners ~23–32, AML first; modal net €950–1,500; weekday lunch > weekend dinner; social/share-first | [Data/Estimate] target-audience |
| **Anti-persona** | One-week tourist / hotel-Tripadvisor optimiser (may buy Snapshot later; must not own the graph) | [Opinion] research gate |

---

## Delegated pitch defaults

### Traction — **pre-launch / pre-revenue** [Assumption]

Treat as **product-built, demand-unproven**:

- No disclosed live MAU, revenue, or seeded Lisbon creator roster in the repo.
- Payment webhooks previously noted as disabled in design brief; Stripe paths exist in codebase but must not be claimed as live GMV.
- Pitch lead: **shipping speed + insight + distribution mechanism**, not vanity metrics.
- Do **not** invent users, waitlists, or creator logos.

### Team — **solo technical founder** [Assumption]

| Claim we can make | Claim we cannot |
|---|---|
| Built a full-stack Portugal-native product (Next.js, Supabase/PostGIS, Mapbox, Cap apps, i18n PT/EN) in ~4 months | Named bio, prior exits, creator network, distribution track record |
| Strong engineering / product-shipping signal | “Dream team” or domain-expertise moat without evidence |

**Yellow flag for pitch:** category dies on distribution, not product quality. Team slide must own the gap: *next hire / co-founder = creator GTM / community*, not another engineer.

Founder name/credentials left as placeholders (`[Founder — fill before external send]`).

### Raise — **€200k pre-seed** [Assumption]

Midpoint of Portugal pre-seed band (€100–300k) from geographic research.

| Use of funds (18 months) | Rough split |
|---|---|
| Lisbon beachhead density — recruit ~40 creators, seed Arroios / Campo de Ourique / Alvalade axis | 35% |
| WTP + interview validation; enable web-first paid Snapshot (VAT/OSS, avoid App Store on first euro) | 25% |
| Distribution polish — shareable OG cards, public creator pages, Roulette, Remotion content | 25% |
| Runway / ops / legal (DPIA, publicidade, tax adviser) | 15% |

**Milestones (18–24 months) [Assumption]:**

1. **M6:** 20–40 Lisbon creators with live public lists; ≥1 self-sustaining cluster signal (~1,000 MAU in one freguesia axis *or* clear kill if empty).
2. **M12:** Documented paid conversion (Snapshot and/or marked sponsorship) — even small € — or explicit model pivot.
3. **M18:** Porto replication test *or* restaurant-side revenue line proven; path to non-dilutive / next cheque clear.

**Not the ask:** “Scale Portuguese Beli to Europe.” Research says consumer-sub ceiling ~€60k/yr platform at national saturation — venture-scale only if model shifts.

### Audience — **PT angels + pre-seed / early seed** [Assumption]

Primary:
- Portuguese angels (food, consumer, marketplace curious)
- Pre-seed funds in the Bynd / Portugal Ventures / local micro-VC band
- Accelerators that fund Iberia consumer (if pitching demo day)

Secondary (later): international consumer angels who already understand Beli/Mapstr — only after Lisbon density proof.

**Avoid as primary:** US Series A consumer VCs underwriting a $50B TAM story — the numbers will not survive their model.

### Formats — **all** [Assumption]

Full narrative, 5-min, 2-min, 1-min, cold email, deck outline, Q&A appendix.

### Business model — **one clear line** [Assumption + Data]

> Creators and locals publish trusted lists; diners use them free via shareable links; NomNom takes a cut when someone buys a **Snapshot** (one-time list) or when a restaurant buys a **marked sponsored placement**. Creator monthly subscriptions are an experiment, not the lead revenue story.

Rationale from research: no documented WTP for resident city lists; €5/mo consumer sub kills modal Inês; sponsored/restaurant pool 5–20× consumer-sub ceiling; Mapstr reviews beg for one-time SKU.

### Unique insight — **pitch thesis** [Opinion synthesised]

1. **Category death cause is distribution, not features.** Zesty (DoorDash) died in ~4 months with unlimited budget. Winning means arriving as a creator’s public list someone opens, not winning App Store vs Google Maps.
2. **Whitespace is a bundle, not a feature.** Creator-sold lists exist (Beli); free creator curation exists in PT (TheFork Feed, Uber Eats Top Eats). Nobody combines *PT-local creator pay + city-you-live-in + auth-free share + Snapshot one-time*.
3. **Do not pitch “reviews are fake.”** Pitch “AI and aggregates won’t show you these walk-in tascas — and your friends already decided together.”

---

## Market building blocks (for later construction)

| Metric | Figure | Confidence |
|---|---|---|
| TAM (PT platform revenue) | ~€28M/yr (range €20–40M) | Low |
| SAM (AML+AMP 24–34) | ~350k users / ~€2.5M/yr | Low–Medium |
| Year-1 SOM (organic) | ~€1k net central | Medium |
| Consumer-sub national ceiling | ~€60k/yr platform | Estimate |
| Paid CAC vs LTV | ~€238 vs €5–15 — paid closed | Estimate |
| Price anchors | Snapshot €3.99–7.99; creator guide ~$3.99/mo global (Beli); Mapstr €59/yr | Data |

**Bottom-up pitch math (use this, not top-down TAM):**  
`~350k metro diners × small paid conversion × €4–8 Snapshot / marked sponsorship ARPU` — and state Year-1 as validation, not revenue.

---

## Competitive frame (pitch-aware)

| Say | Don’t say |
|---|---|
| Google Maps + IG Saved are the default; we win via creators + auth-free share | “No competition” |
| TheFork / Uber Eats ship free curation + own the transaction | “We invented creator lists” |
| Our wedge: walk-in / non-delivery venues + creator GMV + auth-free | Fake stats: “62% never revisit saves”; “Maps caps at 300 and randomly evicts” |
| Beli validates social restaurant apps; they have no PT density | “We’re the Portuguese Beli” as the whole story |

---

## Pitch ordering preview (to confirm in Phase 3)

**Pre-traction + strong product + harsh market honesty →**  
What You Do → **Insight** → Problem → Solution (show the public-list / Roulette flow) → Market (bottom-up, modest) → Business Model → Team (own gaps) → Ask.

Lead element: **insight / distribution thesis**, not traction or TAM.

---

## Flags

**Red Flags:**
- Traction, team bio, and raise are **[Assumption]** until founder confirms — do not send externally without replacing placeholders.
- Research gate was yellow / red-leaning: pitch must not imply venture-scale PT consumer outcome.
- Creator-sold lists are not novel; diligence will check Beli + Uber Eats PT (9 Jul 2026).

**Yellow Flags:**
- Solo technical founder vs distribution-shaped category.
- Locals vs tourists tension: brand = local; money evidence = travel — pitch chooses **resident graph first, Snapshot as visitor monetisation surface**.
- Payment / VAT / App Store waterfall can erase creator economics — ask funds web-first checkout.

## Sources

- `docs/startup-design/00-intake/brief.md`, `brainstorm.md`, `preflight.md`
- `docs/startup-design/01-discovery/market-analysis.md`, `competitor-landscape.md`, `target-audience.md`, `research-gate.md`
- `BRAND.md`, `docs/PRD.md`, `docs/marketing-brief-portugal-ugc.md`
- Founder instruction 26 Jul 2026: “you decide all”
