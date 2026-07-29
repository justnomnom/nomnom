# Phase 3 Market Research

| Field | Value |
|---|---|
| **Project** | nomnom |
| **Date** | 26 July 2026 |
| **Confidence** | **Low–Medium** overall — TAM/SAM Low / Low-Medium; Year-1 SOM Medium; unit economics Medium on conversion benchmarks, Low on Portugal CAC; regulatory High on legal text, Medium on commercial fee rates |
| **Synthesised from** | `raw/market-size.md`, `raw/trends.md`, `raw/regulatory.md`, `raw/geographic.md` |
| **Also informed by** | `PROGRESS.md` (logged contradictions) |

Labels used throughout: **[Data]** sourced finding · **[Estimate]** calculated with stated method · **[Assumption]** unverified · **[Opinion]** analytical judgment.

---

## 1. Executive summary

Portugal’s restaurant-discovery / creator-commerce **platform** revenue pool is small — central TAM **€28M/yr** — and NomNom’s realistic Year-1 net take is ~**€1,000**, not a salary. **[Estimate]** (`raw/market-size.md`) Paid CAC per paying user (~**€238**) sits ~**20×** above LTV (€5–15); paid growth is arithmetically closed. **[Estimate]** Lisbon demand for “where locals eat” is real and culturally pre-validated, but tourism must not own the graph, and consumer-subscription alone ceilings around **~€60k/yr** platform revenue at national saturation. **[Estimate]** (`raw/geographic.md`) AI answer surfaces and free save-utilities are annexing top-of-funnel discovery; capital is buying booking rails (Amex/TheFork $700M), not discovery apps. **[Data]** (`raw/trends.md`) Stack VAT on the **full** consumer price (deemed supplier) with App Store cuts and a 20% take rate, and creator economics break before product-market fit is even tested. **[Data]** (`raw/regulatory.md`) Year 1 is a retention-and-WTP validation exercise, not a revenue plan. **[Opinion]**

---

## 2. Market size — TAM / SAM / SOM

### Framing (adjacent market ≠ TAM)

| Measure | Value | Label | Source |
|---|---|---|---|
| Portugal restaurants (CAE **561**) turnover | €10,850M (2024) | [Data] | INE via GEE — `raw/market-size.md` |
| Broader foodservice (CAE **56**) turnover | €15.7bn (2024) | [Data] | GEE/INE — `raw/geographic.md` |
| Restaurant enterprises CAE 561 / establishments | 35,576 / 38,105 | [Data] | `raw/market-size.md` |
| CAE 56 enterprises nationally | 74,524 | [Data] | `raw/geographic.md` |

**Scope note.** A1 sizes narrow restauração (CAE 561); D2 uses broader CAE 56 (includes bars/cafés etc.). Both are Tier 1 INE/GEE. Downstream figures that cite “restaurant turnover” must state which scope. This synthesis uses **CAE 561 for consumer/platform TAM logic** (A1) and notes CAE 56 where geography cites it.

Portugal restaurant sector is **not** in systemic collapse by company-creation metrics: +2.9% nominal turnover 2025; +69% nominal / +25% real since 2019; 4,991 accommodation/restaurant businesses created vs 1,307 exits in 2025. **[Data]** (`raw/market-size.md`, Banco de Portugal / Informa D&B). Separately, **establishment-level** DIG-IN/AHRESP data for Jan–May 2026 shows 6,446 openings vs 9,279 closures (net −2,833) — distress signal for venues, different unit from company creation. **[Data]** (`raw/trends.md`, `raw/geographic.md`; conflict logged in both).

### TAM — platform revenue at category maturity (Portugal)

| | Central | Range | Confidence |
|---|---|---|---|
| **TAM** | **€28M/yr** | €20M–€40M | **Low** |

**Derivation [Estimate]** (`raw/market-size.md`):

1. **Consumer ceiling:** 6.35M Instagram users (PT, Meta ad tools late 2025) × €2.00/registered user/yr mature niche spend ≈ **€12.7M/yr** ceiling.
2. **Restaurant digital discovery slice:** €10,850M turnover × 1–2% marketing heuristic → €108–217M pool; 5–10% to discovery platforms at maturity → **€5–22M/yr**. *(Portugal-specific marketing % is a DATA GAP.)*
3. **Creator-commerce platform take:** influencer spend inputs conflict — Brinfer/Marketeer **€63M** IG investment 2024 vs Primetag **€27M** total 2025 (`raw/trends.md` weights Primetag higher). A1’s creator-commerce path yields **€3–6M/yr** platform take using the higher pool; Primetag implies a harder ceiling (~€2–4M food brand spend nationally — [Estimate] in trends).

**Cross-check [Data]:** TheFork LTM revenue $232M / 11 countries; if PT is 3–5% of footprint → **~$7–12M (€6.5–11M)** for the reservation leader alone. Order-of-magnitude consistent with €20–40M all-lines TAM. intelmarketresearch’s $145M “European reservation market” figure is **rejected** (internally inconsistent with TheFork alone).

**Implication [Opinion]:** Total category dominance in Portugal is a mid-single-digit to low-double-digit million-euro business. Plans implying a €50M+ Portuguese opportunity are wrong.

### SAM — Lisbon + Porto metros, 24–34 digital diners

| | Central | Range | Confidence | Notes |
|---|---|---|---|---|
| **SAM (revenue)** | **€2.5M/yr** | €1.5M–€3.5M | **Low–Medium** | Planning figure |
| **SAM (users) — planning figure** | **~350,000** | 300k–400k | **Medium–Low** | Ages **24–34** AML+AMP (A1) |
| Alt method (C3) | ≈306k AML + ≈155k Porto = **≈460k** | — | Medium | Ages **20–39**; wider band — **not** the planning figure |

**Derivation [Estimate]** (`raw/market-size.md`):

| Step | Result |
|---|---|
| AML + AMP population | ≈ 5.17M (45.3% of PT 11.42M) |
| Ages 24–34 nationally | ≈ 1,586,000 (INE 2025) |
| Metro share of 24–34 (50% uplift vs 45.3%) | ≈ **793,000** |
| Instagram/TikTok users (90%) | ≈ 714,000 |
| Eats out ≥2×/mo **and** would use discovery (50% — **assumption / weak link**) | ≈ **357,000** |
| Bottom-up €: 350k × €2.50 ARPU + local sponsorship €0.47–0.93M | €1.34–1.81M |
| Top-down €: TAM €28M × 56.2% metro restaurant share × 22% age-spend share | €3.46M |

Lean toward the **lower** end: NomNom cannot address the whole discovery category; Google Maps and Instagram Saved already own most of it for free. **[Opinion]**

**Demand confirmation [Data]** (`raw/trends.md`): Marktest TGI — 62.6% of mainland residents 15–74 ate out on weekdays in the last month (2024, 10-year high); **25–34 and Greater Lisbon both index above average**. Beachhead demography is empirically right even if monetisation is not.

### SOM — NomNom Year 1 (unfunded, Lisbon-first, pre-traction)

| | Downside | Central | Upside | Confidence |
|---|---|---|---|---|
| Downloads | 5,000 | 8,000 | 12,000 | Medium |
| Month-12 MAU | 400 | 800 | 1,500 | Medium |
| Ever-payers | 90 | 170 | 300 | Medium |
| **Net revenue to NomNom** | **€0** | **~€1,000** | **~€3,000** | **Medium** |

**Funnel arithmetic [Estimate]** (`raw/market-size.md`): creator-seeded installs (~65/promo × 30 creators) + organic → ~8,000 downloads; D30 5–8% → ~800 MAU; RevenueCat freemium D35 conversion 2.1% → ~170 ever-payers; Snapshot + Subscription GTV ~€2,075 before 15% store fee and 20–30% NomNom take → **~€350–530** from consumer; sponsored placements **€0–1,200** (relationship favours, not a channel). Strong-outcome Year 1 (50k downloads) still ~**€4–7k net**. Year 3 conditional on PMF: **€8–20k net** — still not a salary.

**Comparables [Data/Opinion]:** RevenueCat — 1 in 20 apps >$9k/mo at month 12; TheFork took ~19 years + corporate balance sheet to $232M LTM; Qraved ($15M raised) died on marketplace death spiral + zero switching costs.

**Portugal consumer-subscription ceiling [Estimate]** (`raw/geographic.md`): at full national niche saturation, ~5,000 payers × €48/yr × 25% take ≈ **~€60k/yr** platform revenue. Restaurant-side pool (Grande Lisboa marketing slice) is **5–20×** larger — but sponsored placements erode the trust positioning.

---

## 3. Growth trajectory — drivers and headwinds

### Drivers

| Driver | Evidence | Label |
|---|---|---|
| Eating-out recovery at 10-year high; 25–34 + Greater Lisbon over-index | Marktest TGI 2024 / Jul 2026 | [Data] `raw/trends.md` |
| Migration surge into 24–34 metros → new arrivals with low local knowledge | INE +788k migration 2022–24 | [Data] `raw/market-size.md` |
| Authenticity / anti-tourist-trap discourse mainstream in Lisbon | Time Out, Taste of Lisboa, Vizinhos em Lisboa (~900 cafés mapped), protests Jun 2025 | [Data] `raw/geographic.md`, `raw/trends.md` |
| AI discovery concentrates (83% venues invisible; 3–5 results; rating floors) → human curation gap for independents | Uberall May 2026 | [Data] `raw/trends.md` |
| Foreign-card restaurant spend +8.4% (2025) while accommodation −3.3% | Turismo de Portugal | [Data] `raw/market-size.md` |
| Micro-creator authenticity shift; PT promoted Reels 8.5%→18% of views | Primetag 2026 | [Data] `raw/trends.md` |
| Porto domestic overnight stays +19.5% (May 2026) — PT-travelling-in-PT segment | INE | [Data] `raw/trends.md` |

### Headwinds

| Headwind | Evidence | Label |
|---|---|---|
| **Paid CAC closed (~20× inverted)** | €238 CAC/payer vs €5–15 LTV | [Estimate] `raw/market-size.md` |
| Consumers cut restaurants first | 82.1% of expense-cutting mortgage-holders; 41% reduced visits | [Data] `raw/market-size.md` |
| Low ARPU / subscription fatigue | Net salary ~€1,100–1,350; streaming intent −0.7pp YoY | [Data] `raw/market-size.md` |
| Free substitutes + save-utility swarm | IG Saved, Maps lists; Gobbler, Mapstr, Hold My Pin, etc. | [Data] `raw/trends.md` |
| AI annexing discovery + booking (Google AI Mode, ChatGPT+OpenTable, Yelp→OpenAI) | OpenTable, Google, Axios | [Data] `raw/trends.md` |
| Capital flowing to transactions not discovery | Amex TheFork $700M; Zesty killed Apr 2026 | [Data] `raw/trends.md` |
| Restaurant establishment contraction | Net −2,833 Jan–May 2026 (DIG-IN); ~75% expect flat/worse summer | [Data] `raw/trends.md` |
| Tiny PT influencer pot | Primetag €27M total 2025; food slice ~€2–4M [Estimate] | [Data/Estimate] `raw/trends.md` |
| No demographic tailwind | Social IDs +1.3% YoY; only TikTok +15% | [Data] `raw/market-size.md` |
| Tourism growth decelerating | Arrivals +3.3% (was +9.3%); spend/trip −4.2% | [Data] `raw/trends.md` |

**Trajectory [Opinion]:** Category demand for *eating out* is healthy; demand for a *paid third discovery app* is constrained. Growth for NomNom is capped by organic/creator distribution bandwidth, not by TAM expansion.

---

## 4. Market maturity assessment

| Layer | Stage | Notes |
|---|---|---|
| Social inspiration → restaurant visit | **Mature / mainstream** | Multi-app journey; TikTok-over-Google preference fell 8%→4% (2024→2026) — [Data] Adobe via `raw/trends.md` |
| AI-mediated restaurant discovery | **Early majority, accelerating** | US 44% plan more AI use 2026; CA Gen Z travellers 53%; PT lag ~12–18 months → mainstream ~2027 — [Data/Estimate] `raw/trends.md` |
| “Save Instagram → map pin” utilities | **Early, crowded, commoditising** | ≥9 apps; LLM extraction is table stakes — [Data] `raw/trends.md` |
| Creator-paid local restaurant lists (resident buyer) | **Emerging / unproven** | Priced precedents are travel/tourist context (PROGRESS); no documented “pay for a list in the city you live in” case |
| Portugal consumer restaurant discovery as venture category | **Structurally mature / capital-starved** | Zomato exited; DIG-IN pivoted B2B; Beli ~$5.3M disclosed / ~$12M reported, team of four — [Data] `raw/geographic.md`, `raw/trends.md`, PROGRESS |

**Verdict [Opinion]:** Entering as a generic “creator restaurant discovery app” is late and squeezed. Entering as a **Lisbon residential-cluster, anti-homogenisation curation product** is early enough — if monetisation moves downstream of pure discovery.

---

## 5. Unit economics benchmarks

### CAC — paid acquisition is closed

| Metric | Value | Label | Source |
|---|---|---|---|
| Meta PT CPM / CPC | €3–8 / €0.15–0.80 | [Data] Tier 3, two agencies | `raw/market-size.md` |
| Derived blended CPI | ~€1.20–2.00 | [Estimate] | same |
| **CAC per paying user** | **~€238** | [Estimate] | €5 CPM → 1% CTR → 25% install → 40% activate → 2.1% pay |
| LTV per paying user | **€5–15** | [Estimate] | €3.50 Snapshot or €3.99×~3.5 mo sub, before store + creator share |
| **Ratio** | **~20:1 inverted** | [Estimate] | Load-bearing |

Nothing in creative/targeting/funnel closes a 20× gap. Viable paths: (1) organic/creator CAC ≈ 0, (2) 10–20× higher LTV, (3) both. **[Opinion]**

### Retention (plan against)

| | D1 | D7 | D30 | Basis |
|---|---|---|---|---|
| Plan | **25–30%** | **10–12%** | **5–7%** | Between Adjust social (D30 10.3%) and MWM Lifestyle (D30 4.8%) — NomNom is episodic; lists add weak lock-in |
| Signal threshold | — | — | **>8%** | Treat as investable positive |

All retention figures are US/global medians — **no Portugal-specific ARPU/retention**. Haircut ≥30% for planning. **[Assumption]** (`raw/market-size.md` DATA GAP)

### ARPU, churn, free-to-paid

| Metric | Value | Label | Source |
|---|---|---|---|
| Freemium D35 download→paid | **2.1%** | [Data] | RevenueCat SOSA 2026 |
| Hard paywall D35 | 10.7% (↓ from 12.1%) | [Data] | same |
| Android / iOS D35 | **0.9% / 2.6%** | [Data] | same — PT Android skew → blend **1.2–1.5%** [Estimate] |
| RPI D60 freemium / hard paywall | $0.38 / $3.09 | [Data] | same |
| Annual sub cancel in year 1 | **72%** (35% in month 1) | [Data] | same |
| Apps >$9k/mo at month 12 | **1 in 20** | [Data] | same |

Free unlimited personal saves = freemium choice: ~5× worse conversion and ~8× worse RPI vs hard paywall — may still be right for cold start, but the cost must be explicit. **[Opinion]**

### Creator earnings arithmetic (supply-side gate)

Imported social traffic converts at **1.2%** (single Substack author, n=1, Tier 3) vs 9.3% in-platform / 3% Substack median. **Plan against 1.2%.** **[Data/Assumption]** (`raw/market-size.md`)

| Creator size | Snapshot (~yr 1) | Subscription steady-state | vs status quo |
|---|---|---|---|
| 5k nano | — | **~€34/mo** | Not monetisable; free content only |
| **25k micro** | **~€285/yr** | **~€153/mo (€1,836/yr)** | ≈ 4–5 sponsored Reels (@€200–600/Reel) but far more ongoing work |
| 100k | — | **~€679/mo (€8,150/yr)** | Interesting; rare in PT food |

**Baseline to beat [Data]:** PT micro Reel €200–600 one-shot, no ongoing obligation (Pictame / Light Internet). Take rate 20%→10% moves 25k creator only €153→€172/mo — wrong lever. Binding constraint = **imported-social conversion**; in-app creator discovery (~8×) matters more than pricing. **[Opinion]**

PROGRESS correction: ~**100–200** Lisbon food accounts >10k, of which **30–60** with real local engagement (audience agent) — still a thin supply pool for the ~40-creator cold start.

---

## 6. Regulatory summary

**Overall regulatory risk: Medium** — compliance builds are tractable; **commercial** constraints (VAT + store fees) can invalidate the model. (`raw/regulatory.md`)

### Load-bearing commercial risks

1. **VAT deemed supplier (Impl. Reg. 282/2011 art. 9a; CJEU *Fenix International* C-695/20)**  
   NomNom sets T&Cs, authorises charge, controls delivery → **irrebuttable** deemed supplier. Must charge VAT at **buyer’s member-state rate on the full consumer price**, not on commission; Union OSS; creator invoices NomNom. From **first sale**. Setup ~€4–10k + €1–3k/yr. Unremitted VAT accrues across EU states with interest. **[Data]**  
   → **Tax adviser before first paid list (~€2–5k).**

2. **App Store / Play cuts on gross**  
   iOS: IAP required for in-app digital content (3.1.1); person-to-person carve-out (3.1.3(d)) does **not** fit one-to-many lists. Commission **30%** or **15%** Small Business Program; EU external-purchase path still ~**10–20% + Core Technology Commission** (rates volatile — verify at implementation). Android: ~11–15% achievable in EEA. **[Data]**  
   → Stack: VAT on gross + store cut + NomNom take → creator net can collapse. **Recommendation: web-first for paid content; apps read/consume.** **[Opinion]**

### DSA MVP checklist (micro/small — applies at launch)

| # | Obligation | Build |
|---|---|---|
| 1 | Arts. 11–12 contact point | Monitored email; PT + EN |
| 2 | Art. 14 T&Cs | Moderation policy in plain PT/EN |
| 3 | Art. 16 notice & action | Report on every UGC surface; receipt + decision notify |
| 4 | Art. 17 statement of reasons | Template on removal/suspension |
| 5 | Art. 18 criminal-offence path | Report route to PT authorities |
| 6 | Art. 24(3) MAU | Compute avg monthly active EU recipients |

**Exempt at launch (art. 19 / 15 / 29):** arts. 15, 20–28 (incl. DSA dark patterns), 30–32 marketplace KYB — **but** UCPD dark patterns / paid-ranking disclosure still apply (no size exemption). PT implementing law `Lei 12-A/2026` (in force 20 Apr 2026): ANACOM DSC; fines up to **6% worldwide turnover**. Cost for MVP DSA+labels: ~1–2 dev weeks + €3–6k legal. **[Data]**

### Other launch obligations (abbreviated)

| Area | Key point | Est. cost |
|---|---|---|
| `Cód. Publicidade` art. 8 / 36 | “Publicidade”/“Patrocinado” at **start**; platform = co-perpetrator as medium-holder; fines €3,500–€45,000 legal person | €2–4k |
| GDPR + ePrivacy | Location consent; DPIA (likely); PostHog behind reject-easy banner; DPAs | €10–20k external |
| CRD withdrawal | Dual express consent + acknowledgement for digital content; subs harder (service characterisation — Medium confidence) | €2–4k |
| Creator payouts | NIF, recibo verde, art. 53 VAT, **23% retenção** when applicable | €3–8k |
| Google Maps import | **`place_id` only**; no stored names/addresses on Mapbox — current design likely non-compliant | 1–2 dev weeks |
| EAA | Likely microenterprise exempt; ship cheap WCAG basics anyway | — |
| DAC7 | Pre-made lists likely out of scope; custom commissions would pull in — confirm with adviser | — |

**Trustpilot / AGCM €4M (Mar 2026):** review authenticity, paid solicitation skew, disclosure, dark patterns under UCPD — maps directly onto sponsored placements. **[Data]**

---

## 7. Geographic analysis

### Beachhead (per D2)

**Do not launch “Lisbon.”** Launch one **resident-dense, low-tourism inner-Lisbon cluster** on the **Arroios / Penha de França / Anjos → Campo de Ourique / Estrela → Alvalade / Avenidas Novas** axis; **exclude Baixa / Chiado / Alfama / Santa Maria Maior from user-acquisition and graph scope** (catalogue may still include aspirational venues). Unit of launch = **2,000–10,000 people** who share ~200–400 restaurants — not 658,236 municipality residents. **[Opinion]** grounded in `raw/geographic.md`

| Why | Evidence |
|---|---|
| Resident graph exists outside historic core | Santa Maria Maior −28% residents / ~10 yrs; 23.2% of city AL stock — [Data] |
| Positioning pre-validated | “Locals eat here / hear Portuguese” is mainstream PT dining discourse — [Data] |
| Density math | Peer graph needs ≥15 followed friends (~50% of a bounded cluster); creator graph: **~40 creators × ~50 saves ≈ 2,000 place-entries** for non-empty results — [Estimate] |
| Self-sustaining node | ~**1,000–3,000 MAU** in one cluster + median ≥15 local follows + ≥40% M3 retention — [Estimate] |

**Caveat [Assumption]:** Arroios / Campo de Ourique / Alvalade freguesia demographics were **not verified** with 2025–26 sourced tables — load-bearing gap before commitment (`raw/geographic.md` DATA GAP #2).

### Tourism distortion

| Claim | Value | Label |
|---|---|---|
| Lisboa município tourist share of meals / revenue | ~**24% / ~32%** | [Estimate] from INE nights + assumed meals — citywide **majority resident** |
| Historic core | Resident graph **evacuated** | [Data] Santa Maria Maior / Alfama reporting |
| Tourist WTP | High (AML ADR €155.87; US #1 AML market) | [Data] |
| Tourist retention / graph effect | ~0 / **negative** (trap consensus) | [Opinion] |
| Snapshot vs Subscription | Snapshot = tourist SKU; Subscription = resident SKU | [Opinion] `raw/geographic.md` |

**Sequencing [Opinion]:** Build resident graph first (asset); sell Snapshot as **monetisation surface** to visitors without letting tourists into the graph. Tourism as cash side-channel only — A1 tourism SOM example: 0.1% of ~9M Lisbon visitors × €4 ≈ €36k gross / ~€24.5k net, non-compounding (`raw/market-size.md`).

### Portugal ceiling

| Model | Ceiling | Label |
|---|---|---|
| Consumer subscription (national niche saturation) | ~**€60k/yr** platform revenue | [Estimate] `raw/geographic.md` |
| Restaurant-side (Grande Lisboa 0.5–2% of ~1% marketing on €5.85bn CAE 56) | **€292k–€1.17M/yr** | [Estimate] |
| Venture-scale consumer sub in PT alone | **No** | [Opinion] |
| Lean profitable / B2B-adjacent (DIG-IN path) | **Plausibly yes** | [Opinion] |

Local seed funds often want **€10k–€50k MRR** before seed — consumer model likely cannot hit that in PT. Pre-seed €100–300k + non-dilutive is the realistic path. **[Data]** Tier 3 funding bands — `raw/geographic.md`

**DIG-IN:** Zomato Portugal MBO → consumer discovery not worth a global operator; survived via B2B data. Open lane for creator-social discovery; also a warning that pure consumer discovery did not monetise. **[Data/Opinion]**

---

## 8. Timing assessment

| | Score |
|---|---|
| Enter as generic discovery app | **Mediocre–poor** |
| Enter as Lisbon residential curation / anti-AI-homogenisation | **Defensible if narrowed** |
| Window | **~12–24 months** before AI defaults harden in PT (~2027 mainstream) |

**Enter now if:** ship within 12 months; reposition around “83% of places AI won’t show”; partner Vizinhos-style authenticity movements; treat save-extraction as table stakes; move monetisation toward transactions (booking/deposits/supper-club) or restaurant-side with hard trust separation; web-first paid content. **[Opinion]** from `raw/trends.md`

**Do not bet on:** “Gen Z left Google,” “reviews collapsed so humans win,” sponsored placements as primary Year-1 revenue, or venture-scale Portugal consumer TAM.

**Incumbent timing pressure (PROGRESS):** Uber Eats launched chef/creator-curated collections **in Portugal** (9 Jul 2026); TheFork Feed (Jul 2025) already includes PT — two transaction-owning players shipped creator curation in-market within ~12 months. Raises urgency and competitive bar beyond desk-research timing alone.

---

## 9. Data gaps

Ordered by how much they would change strategy (aggregated from all four raw files + PROGRESS):

1. **Portuguese WTP for a curated restaurant list (resident context)** — no public data; entire consumer revenue line unvalidated. Closest: World of Mouth €3.90–9.90/mo remains small after 8 years. *Fill: €50 Meta → pricing-page intent test.*
2. **Count/distribution of Lisbon/Porto food creators (3k–150k local)** — cold-start supply unknown; “40 creators” is coverage arithmetic not census.
3. **1.2% imported-social conversion** — n=1 Substack author; drives all creator economics.
4. **Freguesia demographics for Arroios / Campo de Ourique / Alvalade** — beachhead unverified at source.
5. **Tourist vs resident restaurant revenue split** — ~24/32% is constructed estimate.
6. **Portugal app market ARPU / OS split / retention** — Statista paywalled; Android mix rescales SOM.
7. **PT restaurant marketing spend per venue** — 1–2% heuristic only; softens sponsorship SAM.
8. **Dining frequency 24–34 × AML/AMP** — 50% SAM filter is assumption.
9. **Food-sector share of Primetag €27M** — €2–4M is apportioned.
10. **PT AI-discovery adoption** — only US/CA proxies; lag 12–18 months is assumption.
11. **Retention of any social restaurant discovery peer (Beli, WoM, Mapstr)** — founders don’t publish DAU/retention.
12. **Apple exact EU fee % (Jul 2026)** — structure known, rates volatile.
13. **DAC7 / CRD digital-content-vs-service / art. 36 UGC platform case law** — need advisers.
14. **Influencer market €63M vs €27M methodology gap** — unresolved; prefer Primetag for planning.
15. **CAE 561 vs CAE 56** — keep scopes explicit in financial models.

---

## 10. Strategic Connections

- **→ Competitor landscape:** Discovery-only is the position Amex/OpenTable/Google are annexing or sidelining; DIG-IN already took the B2B escape hatch; Uber Eats + TheFork Feed mean creator curation in PT is no longer white space. World of Mouth already ships “named human provenance + no sponsored lists” in Europe — thesis validated, ceiling looks low. (See `competitor-landscape.md` when synthesised; PROGRESS Uber Eats 9 Jul 2026.)
- **→ Target audience:** Marktest confirms 25–34 + Greater Lisbon demand; geographic analysis says **not** the tourist-core user for graph-building. Audience synthesis must keep resident vs tourist SKUs separate (PROGRESS strategic tension). Modal income/WTP corrections (PROGRESS: €950–1,500 modal, €5/mo not defensible) tighten SOM further.
- **→ Industry trends:** AI concentration + authenticity backlash are the real timing story; fake-review “trust crisis” is **not** — BrightLocal trust in reviews still 49%, and 40–42% already trust AI recommendations (`raw/trends.md`). Pitch “AI won’t show you these places,” not “reviews are fake.”
- **→ Channels / GTM:** Paid CAC closed → channels synthesis must assume €0 paid for early months; creator `/u/handle` pages and public list share (PROGRESS D1) are load-bearing, not optional.
- **→ Financial / Phase 7:** Model waterfall: consumer price → VAT (full) → store cut → creator 70–80% → NomNom remainder. Year-1 SOM ~€1k means Stage A financials are validation budgets, not P&L ambitions.
- **→ Product:** Multiplayer cold start (empty for user one) vs Beli’s single-player lesson (PROGRESS) is a Phase 6 requirement; Google Maps import must be re-architected before scale.

---

## 11. Flags

### Red flags

1. **Year-1 SOM ~€1k / Year-2 still not salary-viable** on Snapshot + Subscription at Lisbon scale — revenue is not the Year-1 job; if D30 retention or any paid conversion fails, change the model, not the ad budget. (`raw/market-size.md`)
2. **Paid CAC ~€238 vs LTV €5–15 (~20× inverted)** — paid acquisition is closed; growth rate capped by unpaid creator labour. (`raw/market-size.md`)
3. **VAT on full consumer price + App Store 15–30% (or EU ~10–20%+CTC) + platform take** — stacked waterfall can leave creators worse off than one Reel and NomNom with ~17% of face value on a €3.99 Snapshot. (`raw/regulatory.md`, `raw/market-size.md`)
4. **Portugal consumer-sub ceiling ~€60k/yr** at saturation — not venture-scale on diners alone; restaurant-side money contradicts “no sponsored lists” trust thesis. (`raw/geographic.md`)
5. **Funnel position AI and booking platforms are absorbing** — Zesty shutdown rationale applies with high fidelity. (`raw/trends.md`)

### Yellow flags

1. Creator economics unattractive below ~50–100k followers; supply churn → content death spiral. (`raw/market-size.md`)
2. Sponsored-placement pot tiny (€2–4M food [Estimate]) while restaurants close faster than they open (establishment-level). (`raw/trends.md`)
3. Beachhead freguesias unverified; wrong cluster → empty graph → false negative on product. (`raw/geographic.md`)
4. Tourism temptation: high WTP, zero retention, graph poison. (`raw/geographic.md`)
5. Google Maps import ToS risk — feature-fatal if terminated after lists populate. (`raw/regulatory.md`)
6. Influencer-market and restaurant-closure series conflicts (methodology) — do not over-precision in decks. (`raw/trends.md`, `raw/geographic.md`)
7. Local seed MRR gate (€10–50k) vs consumer ARPU — financing path may force B2B or international capital early. (`raw/geographic.md`)
8. Instagram shipping search-in-Saves would kill much of the “return trip” wedge overnight. (`raw/trends.md`)

---

*End of Phase 3 market synthesis. Raw files retained at `01-discovery/raw/`. Verification and research gate pending.*
