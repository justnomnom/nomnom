# Verification Report: nomnom
*Generated: 26 July 2026*

## Summary
- **Critical issues:** 3
- **Warnings:** 8
- **Info:** 6

Phase 3 synthesised deliverables audited: `market-analysis.md`, `competitor-landscape.md`, `target-audience.md`, `industry-trends.md`, `confidence-dashboard.md`, plus `PROGRESS.md` corrections. Raw files were not re-audited (except confirming existence of `raw/customer-voice.md` for the known gap). Phase 4–8 cross-phase checks skipped (files not written).

---

## Critical Issues

Issues that could mislead decision-making. **Pause before Research Gate.**

### 1. SAM user counts contradict across A1 vs C3
- **File(s):** `market-analysis.md` §2; `target-audience.md` §11; `confidence-dashboard.md` §2 (follows A1 only)
- **Section:** Market size / Bottom-up addressable pool
- **Problem:** Same construct (“SAM / qualified metro users”) carries incompatible centrals:
  | Source | Figure | Scope / method |
  |---|---|---|
  | A1 → `market-analysis.md` | **~350,000** (range 300k–400k) | AML+AMP ages **24–34** → IG/TikTok → **50%** “eats out ≥2×/mo and would use discovery” → ~357k |
  | C3 → `target-audience.md` | **≈306k AML + ≈155k Porto = ≈460k** | Ages **20–39**, different filter stack; both-metros SAM **~32% higher** than A1 |
- **Suggested fix:** Pick one canonical SAM definition (age band, geography, filters) in `market-analysis.md` and force `target-audience.md` + `confidence-dashboard.md` to match; or present both as **labelled alternative methods** with an explicit “planning figure = X”. Do not leave both as unqualified “SAM”.

### 2. Mapstr annual price not canonicalised to PROGRESS / C2
- **File(s):** `PROGRESS.md` (pins **€59.00/yr** Tier 1); `industry-trends.md` Flags (**€59/year**); `competitor-landscape.md` matrix + Yellow Flags (**≈ €39.99–59/yr**); `confidence-dashboard.md` §2 (**€39.99–59/yr**, notes PROGRESS pins €59)
- **Section:** Pricing / WTP anchors
- **Problem:** Agent C2 (`raw/demand-signals.md`) verified Mapstr Plus yearly at **€59.00** (App Store NL/LT + FAQ, 26 Jul 2026). Agent B1 observed **~$59.90/yr** US (~€55–60). No Phase 3 raw source supports **€39.99/yr** as Mapstr’s primary annual SKU (€39.99 appears elsewhere as **Nibbl** annual). Synthesis still ships a €39.99–59 band that undercuts the PROGRESS correction and can drag NomNom price ceilings down incorrectly.
- **Suggested fix:** Canonical line everywhere: **Mapstr Plus ≈ €59/yr** (EU Tier 1, 26 Jul 2026); monthly **€5.90–9.90** by region; US **~$59.90/yr**. Drop €39.99 from Mapstr rows unless a dated storefront screenshot proves a regional annual SKU. Keep “agents initially disagreed” only in a footnote, not in the comparison matrix.

### 3. `customer-voice.md` exists but synthesised files still treat it as missing
- **File(s):** `target-audience.md` (header + Data gaps); `confidence-dashboard.md` §1, §5, Red Flags; on disk: `01-discovery/raw/customer-voice.md` (C1, 26 July 2026, ~17 quotes)
- **Section:** Primary voice / Critical unknowns
- **Problem:** Wave-3 synthesis and the confidence meta-layer state that `raw/customer-voice.md` “was not produced.” The file **is present** and dated the same day. Pain hierarchy, language map, and WTP confidence in `target-audience.md` were written without incorporating it. Research Gate would otherwise rubber-stamp an outdated “no primary voice” story.
- **Suggested fix:** Either (a) re-pass `target-audience.md` (+ dashboard Critical unknowns) against `raw/customer-voice.md`, or (b) if voice quality is Tier-3-only / non-PT-interview, document that explicitly and downgrade “missing file” to “file present; PT diner interviews still absent.”

---

## Warnings

### NiT monthly traffic: 8.9M visits vs 2.1–2.6M reach
- **File(s):** `competitor-landscape.md` matrix; `target-audience.md` §9
- **Problem:** Landscape cites **NiT ~8.9M visits/mo**; audience cites **2.1–2.6m monthly reach** (Marktest netAudience). Likely different metrics, but both read as “monthly audience size” without reconciliation.
- **Suggested fix:** One labelled pair: e.g. “Marktest netAudience reach 2.1–2.6M; site visits claim X [tier]” — or drop the unverified 8.9M from the matrix.

### Competitor matrix: many quantitative cells unlabeled
- **File(s):** `competitor-landscape.md` §2
- **Problem:** Traction/funding/pricing cells (e.g. Mapstr 4M+ users, 4.2M sessions/mo, 23% retention; Beli ~80% under 35; Bretagne 1.5M impressions / 30k clicks; ~15% MAU/registered) lack per-claim **[Data]/[Estimate]** labels required by protocol.
- **Suggested fix:** Add labels to matrix footnotes or a column; mark Tier 3 retention/session figures explicitly.

### Confidence dashboard missing dedicated Data Gaps section
- **File(s):** `confidence-dashboard.md`
- **Problem:** Protocol requires a Data Gaps section on every deliverable. Dashboard has §5 Critical unknowns + §7 Flags but no “Data Gaps” heading.
- **Suggested fix:** Rename/add § “Data Gaps” pointing at cross-file gap lists (or mirror top 10 from market-analysis).

### Industry-trends Flags not split Red / Yellow
- **File(s):** `industry-trends.md` §9
- **Problem:** Flags are a severity table (Critical / High / Medium / Resolved), not the required **Red Flags** / **Yellow Flags** sections. Content is strong; structure drifts from protocol.
- **Suggested fix:** Cosmetic regroup into Red / Yellow (map Critical→Red, Medium→Yellow).

### False corroboration risk on TheFork Feed / Uber Top Eats
- **File(s):** `confidence-dashboard.md` §2 (“≥3 corroborating sources”)
- **Problem:** Counts may include PROGRESS + competitive synthesis + the same B1 press cluster — not three independent Tier-1 observations. Presence is still well-supported; the “≥3” framing overstates independence.
- **Suggested fix:** Cite primary launch surfaces / named press once; say “multi-outlet press + product presence,” not “≥3 independent sources,” unless distinct Tier-1 URLs are listed.

### Concurrent-agent “independent” empty WTP searches
- **File(s):** `confidence-dashboard.md` §2 (WTP negative finding); `target-audience.md` §8; `industry-trends.md` §4
- **Problem:** “≥3 agents independently empty” is weakened by concurrent dispatch (PROGRESS: agents could not react to each other). Negative finding remains important; independence claim is soft.
- **Suggested fix:** Rephrase to “multi-agent desk search found zero local-resident purchase cases (same window; not sequential independent replication).”

### Beli narrative occasionally collapses to single $12M figure
- **File(s):** `industry-trends.md` §3 contrast line (“raised ~$12M over five years”); scorecard (“Beli (~$12M / four people)”)
- **Problem:** Contested-funding rule is followed in the table, then casually violated in prose. Landscape + market-analysis stay dual-stated.
- **Suggested fix:** Prose = “$5.3M disclosed Series A; ~$12M total reported” everywhere.

### Mapstr funding band still loose
- **File(s):** `competitor-landscape.md` (~$0.8–2.3M + €1.4M crowd); `industry-trends.md` (~$2.3M reported)
- **Problem:** Minor inconsistency; not load-bearing but unclean for decks.
- **Suggested fix:** One band + “figures disagree” yellow flag (already present) — pick the range as canonical.

---

## Info

- **B2 “nobody pays creators” — correctly corrected false** across `competitor-landscape.md`, `industry-trends.md`, `confidence-dashboard.md`, and `PROGRESS.md`. Surviving claim (no documented **own-city resident** list purchase) is consistent.
- **Beli funding contested — handled correctly** in market-analysis, competitor-landscape matrix/flags, trends table, and dashboard (dual formula). Only soft drift in trends prose (Warning above).
- **Fake-stat bans applied consistently** (“62% saves never revisited”; Google Maps “300 + random eviction”) in landscape, audience, trends, dashboard, PROGRESS.
- **Uber Eats 9 Jul 2026 + TheFork Feed 15 Jul 2025** centred correctly as competitive facts across all synthesised files.
- **Label hygiene is generally strong** in `market-analysis.md`, `target-audience.md`, and `industry-trends.md` (better than landscape matrix).
- **`PROGRESS.md` Phase 3 checklist is stale:** still says only `market-analysis.md` written / synthesis “not yet on disk,” and Phase 3 / 3.5a unchecked — update after this report.

### Known-conflict resolution table (explicit)

| Conflict | Resolution for Research Gate |
|---|---|
| Mapstr €59 (C2) vs €39.99 (B1-attributed in synthesis) | **Prefer €59/yr** (C2 Tier 1 + PROGRESS). €39.99 is not supported as Mapstr Plus annual in raw B1/C2; remove from Mapstr cells. |
| Beli $5.3M vs $12M | **Keep dual wording** — already correct in most files; fix trends prose that picks $12M alone. |
| SAM ~350k (A1) vs ~306k+155k (C3) | **Unresolved — Critical.** Must canonicalise before gate. |
| `customer-voice.md` missing | **File exists; synthesised docs stale — Critical.** Re-ingest or restate gap accurately. |
| B2 “nobody pays creators” | **Resolved false** — do not reintroduce. |

---

## Verification Checklist
- [ ] All quantitative claims labeled — **partial** (landscape matrix weak)
- [ ] No internal contradictions found — **fail** (SAM; Mapstr band; NiT)
- [x] Confidence ratings consistent with evidence — **mostly** (High on shipped incumbents / VAT / Beli Paid Guides existence is warranted; SAM confidence correctly Low–Medium)
- [ ] Data gaps declared in all deliverables — **partial** (dashboard lacks dedicated section)
- [ ] Red/Yellow flags present in all deliverables — **partial** (trends uses severity table)
- [x] No stale data unmarked — **pass with notes** (historical funding rounds Nov 2023 / Jun 2023 are dated; Mapstr France ~15% MAU proxy is old — already treated as proxy)
- [ ] No duplicate-source false corroboration — **soft fail** on “≥3 agents/sources” framing
- [x] Strategy reflects market data (cross-phase) — **N/A** (Phase 4 not written)
- [x] Product reflects customer pains (cross-phase) — **N/A** (Phase 6 not written)
- [x] Financial reflects business model (cross-phase) — **N/A** (Phase 7 not written)
- [x] Validation covers identified risks (cross-phase) — **N/A** (Phase 8 not written)

---

## Recommended fixes before Research Gate

1. **Canonicalise SAM users** — one definition + one central number (or dual methods with one “use for planning” pick); sync market-analysis, target-audience, confidence-dashboard.
2. **Canonicalise Mapstr Plus = €59/yr** — strip €39.99 from Mapstr rows; align landscape + dashboard with PROGRESS/C2/trends.
3. **Reconcile customer voice** — update `target-audience.md` / dashboard against `raw/customer-voice.md` (or accurately restate: file present, PT interviews still missing).
4. **Reconcile NiT audience metric** (8.9M vs 2.1–2.6M).
5. **Label competitor-matrix numbers**; dual-state Beli in all trends prose.
6. **Refresh `PROGRESS.md` Phase 3 / 3.5a status** after fixes.

---

## Verdict: proceed to Research Gate?

**Yes (post-fix, 26 Jul 2026).** The three Critical items were reconciled in-main:

| Critical | Resolution |
|---|---|
| SAM users | Planning figure **~350k** (24–34) in `market-analysis.md`; C3 ≈460k labelled as wider-band alt in `target-audience.md` |
| Mapstr price | Canonical **€59/yr** EU in landscape + dashboard; €39.99 Mapstr annual removed as mis-attribution |
| Customer voice | Docs updated: file **present** (Tier-3 proxies); gap restated as **no PT diner interviews** |

Warnings (NiT metric, matrix labels, trends flag structure) remain open — non-blocking for Research Gate. Gate file: `research-gate.md`.
