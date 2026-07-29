# Lean Canvas — NomNom

**Phase:** 4 — Strategy  
**Date:** 26 July 2026  
**Confidence:** Medium on problem/channels (desk research); **Low** on revenue (no PT diner interviews; Stage A)  
**Grounded in:** `01-discovery/*`, `00-intake/brainstorm.md` (V2+V5 spearhead)

---

## Canvas

### 1. Problem
1. **Group dinner deadlock** — “onde vamos comer?” in WhatsApp ends in veto loops; nobody wants to pick wrong. *Alternatives:* three Maps pins + silence; screenshots of Reels; TheFork “near me.”
2. **Save graveyard** — Instagram/TikTok saves store posts, not usable places; retrieval fails at decision time. *Alternatives:* Google Maps lists; Gobbler/Mapstr/Hold My Pin; give up and Google again.
3. **Trust vacuum** — #pub / gifted creators erode belief in “influencer” picks; stars feel gamed. *Alternatives:* ask a friend; Time Out/NiT; TheFork Feed / Uber Top Eats (free, transaction-tied).

### 2. Customer Segments
- **Primary (beachhead):** Lisbon residents 24–34 on Arroios / Campo de Ourique / Alvalade axis who already save restaurants socially and coordinate dinners on WhatsApp. **[Data]** geography + audience synthesis.
- **Early adopters:** Group organisers (Tiago-type) who must shortlist 3 places by Wednesday; Lisbon food micro-creators (3k–50k) tired of “onde é?” DMs.
- **Secondary monetisation (not graph source):** Short-stay visitors who will buy a one-time curated list (Snapshot). **[Opinion]** money evidence ≠ brand graph.

### 3. Unique Value Proposition
**We help Lisbon friend-groups decide where to eat tonight from spots real people and creators actually saved — via a public list link that works before anyone installs anything.**

### 4. Solution (top 3)
1. **Auth-free shareable NomNom Lists** — rich OG preview, vote/veto or Roulette, zero login to view.
2. **Single-player day-one value** — personal saves + import (Maps / social) so user #1 is not staring at an empty social feed.
3. **Creator `/u/handle` homes** — pre-built, claimable, indexable; supply + distribution in one motion.

### 5. Channels
| Type | Channel | Priority |
|---|---|---|
| Inbound / product | Public list shares (organic) | #1 |
| Supply | Pre-built creator pages → DM “já fiz isto” | #1 |
| Attention magnet | `/roleta/lisboa` + press | #2 |
| Background | Long-tail SEO (not head terms) | #3 |
| **Avoid 90 days** | Paid Meta / ASA | Closed by CAC≫LTV |

### 6. Revenue Streams
**Stack order (research gate):** sponsored / restaurant-side ≥ Snapshot ≫ subscriptions.

| Stream | Price band `[Assumption]` | Role |
|---|---|---|
| Marked sponsored placements | Restaurant / brand pays | Primary path to meaningful € |
| Snapshot (one-time list) | €3.99–7.99 (ceiling €9.99) | Clearest consumer WTP *signal* (Mapstr lifetime demand) |
| Creator / platform sub | ≤ €2.99–3.99/mo if tested | Experiment only — not Year-1 plan |

Payments path currently **off** (`POST /api/webhooks` → 410). VAT deemed-supplier + store cuts must be modelled before take-rate promises. **[Data]** regulatory.

### 7. Cost Structure
- Founder time (dominant)
- Hosting / Supabase / Mapbox / Vercel (low variable)
- Remotion OG generation compute
- Legal (VAT/OSS, publicidade art. 36) — one-time + advisory
- Creator cash sponsorships: **€0** Year 1 — trade product for distribution
- **No paid CAC budget** until LTV evidence

### 8. Key Metrics (AARRR)
| Stage | Metric | 90-day target `[Assumption]` |
|---|---|---|
| Acquisition | Auth-free list opens / week | Rising; track source (WA / creator / roleta) |
| Activation | Opens → “useful action” (save, vote, spin, claim) | ≥25% of opens |
| Retention | D7 return of list creators / organisers | ≥20% |
| Revenue | Paying events (Snapshot or sponsored) | ≥5 real € transactions *or* 1 paid restaurant deal |
| Referral | Opens per share | ≥1.5 |

Vanity to ignore: app installs, follower count, “places in catalogue.”

### 9. Unfair Advantage
**Honest answer:** thin today. Not “we invented creator lists” (false). Plausible advantages to *earn*:
1. Auth-free web distribution Beli/Mapstr structurally lack.
2. Dense Lisbon residential creator + friend graph (local exclusivity).
3. Existing shipped surface (lists, Roulette, Capacitor) — speed of iteration, not moat.

---

## Flags

**Red:** Revenue blocks are hypotheses; local WTP unevidenced; Uber/TheFork already ship free creator curation in PT.  
**Yellow:** UVP narrows away from “Portuguese Beli”; Capacitor investment is secondary to web wedge; unfair advantage must be earned in density, not claimed in decks.

## Sources
`01-discovery/market-analysis.md`, `competitor-landscape.md`, `target-audience.md`, `raw/channels.md`, `00-intake/brainstorm.md`
