# Market Sizing: Portugal restaurant discovery (NomNom)

**Agent:** A1 — Market Sizing & Economics
**Date:** 26 July 2026

---

## Executive orientation (read this first)

Three numbers frame everything below:

| Metric | Central estimate | Range | Confidence |
|---|---|---|---|
| **TAM** — annual platform revenue available to *all* restaurant-discovery / creator-commerce products serving Portugal, at category maturity | **€28M/yr** | €20M–€40M | Low |
| **SAM** — Lisbon + Porto metros, 24–34 digital diners | **€2.5M/yr** | €1.5M–€3.5M | Low-Medium |
| **SOM** — NomNom net revenue, Year 1, unfunded, Lisbon-first | **~€1,000** | €0–€3,000 | Medium |

The TAM is small. Portugal's entire restaurant-discovery software and creator-commerce revenue pool is roughly the annual revenue of one mid-sized Lisbon restaurant group. The SAM is smaller. The Year 1 SOM is, in commercial terms, zero — Year 1 is a validation exercise, not a revenue exercise, and the plan should say so explicitly.

The single hardest number in this document is in [Unit Economics](#unit-economics-benchmarks): **paid CAC per paying user works out at roughly €238 against an LTV of €5–15.** Paid acquisition is arithmetically closed for this product at these price points. Everything depends on organic and creator-driven distribution.

---

## TAM (Total Addressable Market)

### The adjacent market (context, NOT NomNom's TAM)

This is the transaction pool NomNom sits beside. It is not revenue NomNom can capture, and it should never be presented as TAM.

| Measure | Value | Year | Source | Tier |
|---|---|---|---|---|
| Portugal restaurant sector (CAE/NACE 561) turnover | **€10,850M** | 2024 | INE via GEE *Síntese Estatística Setorial*, data updated 11 Dec 2025 | 1 |
| Portugal restaurant enterprises (CAE 561) | 35,576 | 2024 | INE via GEE | 1 |
| Portugal restaurant establishments (CAE 561) | 38,105 | 2024 | INE via GEE | 1 |
| Persons employed, CAE 561 | 210,550 | 2024 | INE via GEE | 1 |
| Restaurants & Takeaways market size | €11.6bn | 2026 | IBISWorld (pub. June 2025) | 2 |
| Restaurants & Takeaways businesses | 35,085 (1.8% CAGR 2020–25) | 2025 | IBISWorld | 2 |
| Foodservice **profit sector** (incl. QSR, coffee, bars) | €14.5bn → €17.1bn by 2029 (3.4% CAGR 2024–29) | 2024 | GlobalData (pub. 25 Jul 2025) | 2 |
| Restaurant sector turnover growth | +2.9% nominal 2025 vs 2024 | 2025 | Banco de Portugal Governor Á. Santos Pereira, citing INE/E-fatura | 1 |

**Cross-reference note.** INE's €10,850M (CAE 561 only) and IBISWorld's €11.6bn (2026, same NACE scope, two years later at ~3% growth) reconcile cleanly — €10.85bn × 1.03² ≈ €11.5bn. GlobalData's €14.5bn is *larger scope* (adds coffee & tea shops, pubs/clubs/bars), not a contradiction. **I trust the INE figure** as the base: it is the primary statistical authority, it is the narrowest and best-defined scope, and the other two triangulate to it.

Note also that the sector is *not* in the crisis the trade association (AHRESP) claims: since 2019 restauração grew 69% nominal / 25% real, 4,991 businesses were created in 2025 against 1,307 exits, and credit-overdue ratios sit at 2.1% (Banco de Portugal, Tier 1). Restaurants are not desperate. That matters for whether they will pay for placement.

### TAM proper: platform revenue available in Portugal

Built three ways, then summed. Every step is shown because none of these is a published figure.

**(a) Consumer-side monetisation ceiling**

- Portugal resident population: **11,424,031** (31 Dec 2025, INE — Tier 1). *Discrepancy flagged: Pordata lists 10,694,681 for 2024 (Tier 1, updated 26 Jan 2026). INE's new series implies 2024 ≈ 11.39M. INE revised its series upward for migration; I use the INE 11.42M figure and note that any per-capita derivation carries a ±6% series risk.*
- 0–14 = 12.36% → population 15+ ≈ 10.01M; adults 18+ ≈ 9.6M.
- Instagram users in Portugal: **6.35M** (Meta ad tools, late 2025, via DataReportal Digital 2026 — Tier 2, platform-reported). NapoleonCat reports 7,407,500 for June 2026 (Tier 3). *These disagree by 17%. I trust the Meta-ad-tools figure (6.35M) because NapoleonCat's number exceeds 73% of the entire population including infants, which is implausible.*
- TikTok users 18+: **4.11M**, +15.0% YoY (TikTok ad tools, late 2025 — Tier 2).
- Total social media identities: 7.59M, +1.3% YoY (Kepios/DataReportal, Oct 2025 — Tier 2).
- Mature blended consumer spend on a single niche discovery app: **€2.00/registered user/yr**. Derivation: RevenueCat's median freemium revenue-per-install at Day 60 is $0.38 (2026 SOSA, 115,000 apps — Tier 1-equivalent). Annualising a decaying cohort gives ~$1.20–2.50; Portugal sits below the global average consumer app spend of $25–40/user/yr across *all* apps (Sensor Tower/data.ai — Tier 2), so €2.00 is already an optimistic single-app figure.

→ 6.35M × €2.00 = **€12.7M/yr** at 100% national penetration of Instagram users. *This is a ceiling, not a forecast.*

**(b) Restaurant-advertising side**

- PT restaurant turnover €10,850M (Tier 1).
- Hospitality marketing spend runs ~1–2% of turnover → **€108M–€217M** total pool. *(The 1–2% ratio is a general hospitality heuristic; I could not source a Portugal-specific figure — see Data Gaps.)*
- Digital discovery platforms plausibly capture 5–10% of that at category maturity → **€5M–€22M/yr**.

**(c) Creator-commerce side**

- Portugal influencer marketing investment (Instagram): **€63M in 2024**, up from €59.5M in 2023 (Brinfer *Top Brands 2025* via Marketeer — Tier 2). 285,380 sponsored content pieces in 2024.
- Food vertical ≈ 10–15% of that → €6M–€9M/yr in *sponsored* spend.
- Direct-to-fan creator commerce is a new pool, not a substitution. Assume it could mature to 20–30% of the sponsored pool → €13M–€19M gross, of which a platform takes 20–30% → **€3M–€6M/yr**.

**TAM = (a partial) + (b) + (c).** Since (a) and (c) overlap (consumer payments *are* the creator-commerce GMV), take (a) as the consumer ceiling and count (c) as the platform's share of it:

**TAM ≈ €20M–€40M/yr. Central: €28M/yr. Confidence: Low.**

### Independent cross-check on TAM

- **TheFork** LTM revenue to 31 Mar 2026: **$232M** across 11 countries, adjusted EBITDA $28M; sold by Tripadvisor to American Express for **$700M**, announced 15 June 2026 (Tripadvisor press release — Tier 1). If Portugal is 3–5% of that footprint, the category leader in the *reservation* sub-segment earns roughly **$7M–$12M (€6.5M–€11M)** in Portugal. A €20–40M all-lines TAM is consistent with that. **Two independent methods agree on order of magnitude — this is the strongest single finding in this section.**
- A third source, intelmarketresearch, puts the *entire* European online restaurant reservation market at $145M in 2026 (Tier 3). **I reject this figure**: TheFork alone books $232M in Europe. The report is internally inconsistent and should not be cited.

**Implication:** even total category dominance in Portugal is a €6–11M business. NomNom's realistic ceiling is a fraction of that. Any plan that implies a €50M+ Portuguese opportunity is wrong.

---

## SAM (Serviceable Addressable Market)

Lisbon metro + Porto metro, ages 24–34, dining out regularly, discovering via social.

### Step 1 — Geography

| Area | Population | Year | Source | Tier |
|---|---|---|---|---|
| Área Metropolitana de Lisboa (AML), 18 municipalities | **3,352,939** (29.3% of Portugal) | 2025 | INE/government via Wikipedia AML | 2 (citing Tier 1) |
| City of Lisbon | 658,236 (all-time high since 1991) | 2025 | INE | 1 |
| Área Metropolitana do Porto (AMP), 17 municipalities | **1,818,217** | 2024 | Wikipedia PT citing INE | 2 |
| AMP (official) | 1,802,664 | 2023 | GEE/INE NUTS III profile | 1 |
| City of Porto | 231,962 | 2024 | Wikipedia PT citing INE | 2 |

**AML + AMP ≈ 5,171,000 = 45.3% of Portugal's 11.42M.**

### Step 2 — Restaurant supply in target geography (Tier 1)

From INE/GEE CAE 561, 2024 — **enterprises / turnover (€M) / establishments**:

| Region | Enterprises | Turnover €M | Establishments |
|---|---|---|---|
| Portugal | 35,576 | 10,850 | 38,105 |
| **Grande Lisboa** | **9,096 (25.6%)** | **3,946 (36.4%)** | **9,884** |
| Península de Setúbal | 2,478 (7.0%) | 574 (5.3%) | 2,663 |
| **AML total** | **11,574** | **4,520** | **12,547** |
| Norte (AMP is a subset) | 9,251 (26.0%) | 2,616 (24.1%) | 9,764 |
| Algarve | 4,309 (12.1%) | 2,352* | 4,684 |

\*Algarve turnover listed as 1,190 in the €M column with 11.0% share — the table's column alignment is ambiguous for this row; treat Algarve turnover as ~€1,190M and low-confidence.

AMP is roughly 65% of Norte's population, so **AMP restaurants ≈ 6,000 enterprises, ~€1,700M turnover** (derived, Medium confidence).

**AML + AMP: ~17,600 restaurant enterprises, ~€6.2bn annual turnover, ~56% of national restaurant spend.**

*Conflicting source, rejected:* rentechdigital (Tier 3, scraped) reports only 2,189 "Restaurants in Lisbon District" as of 1 Apr 2026. This is 4× below the INE figure and clearly counts a narrow Google-Maps-style subset. **Use the INE numbers.** A separate academic study (MDPI, 2023, Tier 1) found AML held 39.2% of its restaurant sample — directionally consistent with INE's 36.4% turnover share.

### Step 3 — The 24–34 cohort

INE 2025 resident population estimate (Tier 1):
- 25–29: 723,809
- 30–34: 737,965
- **25–34 total: 1,461,774**
- 20–24: 621,923 → adding one-fifth for the 24-year-olds: +124,385
- **24–34 total ≈ 1,586,000**

*Note the sharp jump vs Census 2021 (25–29 was 548,850, 30–34 was 571,761). The 2022–24 migration surge (+788,105 over three years, INE) landed disproportionately in this age band and in the two metros. This is a genuine tailwind for the target cohort — and it also means a meaningful share of the cohort are recent immigrants, i.e. exactly the people with the least local restaurant knowledge. That is a positioning opportunity A2/A3 should pick up.*

**Metro share:** metros over-index on young adults. National metro share is 45.3%; apply **50%** for the 24–34 band (conservative uplift).

→ 1,586,000 × 0.50 = **793,000 people aged 24–34 in AML + AMP.**

### Step 4 — Filters to reachable users

| Filter | Rate | Basis | Running total |
|---|---|---|---|
| Base: 24–34 in AML+AMP | — | Step 3 | 793,000 |
| Uses Instagram or TikTok | 90% | Instagram reaches 71.8% of *all* PT adults 18+ (Meta ad tools, late 2025 — Tier 2); the 24–34 band indexes far above average | 714,000 |
| Eats at restaurants ≥2×/month AND would use a discovery tool | 50% | **Weak link — see Data Gaps.** Proxies: 41% of PT consumers reduced restaurant visits due to cost of living (idealista/The Portugal News, Sept 2025 — Tier 3); 82.1% of mortgage-holders cutting spending named restaurants as first cut (Intercampus for Negócios/CM, June 2026 — Tier 2) | **357,000** |

**SAM (users) ≈ 350,000 reachable people.** Range 300k–400k. Confidence: Medium-Low (the 50% dining-frequency filter is an assumption, not a measurement).

### Step 5 — SAM in euros, two ways

**Bottom-up:**
- Consumer payments: 350,000 × €2.50/yr mature ARPU = **€875,000/yr**
- Restaurant sponsorship: AML+AMP restaurant turnover €6.2bn × 1.5% marketing ratio = €93M pool; a local discovery app capturing 0.5–1.0% at maturity = **€465,000–€930,000/yr**
- Creator take rate is already inside the consumer payments line.
→ **€1.34M–€1.81M/yr**

**Top-down (proportional cut of TAM):**
- TAM €28M × 56.2% (AML+AMP share of national restaurant turnover) × 22% (24–34 share of dining spend — below-average income but above-average dining-out frequency) = **€3.46M/yr**

**SAM ≈ €1.5M–€3.5M/yr. Central: €2.5M/yr. Confidence: Low-Medium.**

The two methods differ by ~2× but land in the same band. I lean toward the lower end because the top-down method assumes NomNom can address the *whole* discovery category, which it cannot — Google Maps and Instagram Saved already own most of it for free.

### Tourism: sized separately

Tourists are a distinct segment — high willingness to pay, near-zero retention (a visitor uses the app for 4 days and never returns).

| Metric | Value | Year | Source | Tier |
|---|---|---|---|---|
| Non-resident tourists to Portugal | 29.9M (+3.3%) | 2025 | INE | 1 |
| Guests in tourist accommodation | 34.8M; 89.7M overnight stays | 2025 | INE | 1 |
| Average spend per tourist per trip | **€265.1 (−4.2% YoY)** | 2025 | INE | 1 |
| Tourism receipts | €29.1bn (+5.0%) | 2025 | Banco de Portugal / Turismo de Portugal | 1 |
| Lisbon airport arriving passengers | 18.2M (50.4% of national) | 2025 | Turismo de Portugal | 1 |
| **Foreign-card spend in PT restaurants** | **€2,400.5M (+8.4%)** | 2025 | Turismo de Portugal | 1 |
| — of which Grande Lisboa | €867.8M (35.6%) | 2025 | Turismo de Portugal | 1 |
| — of which Algarve | €612.7M (25.1%) | 2025 | Turismo de Portugal | 1 |
| — of which Norte | €435.0M (17.8%) | 2025 | Turismo de Portugal | 1 |

Note the divergence: foreign card spend on **restaurants grew +8.4%** while **accommodation fell −3.3%** (to €1,759.6M). Tourists are spending relatively more on food. That is a genuine tailwind — but it is a tailwind for restaurants, not automatically for a discovery app.

**Tourism SOM arithmetic:** Lisbon receives roughly 9M foreign visitors/yr. At a 0.1% capture rate for a €4 city Snapshot: 9,000 × €4 = **€36,000 gross, ~€24,500 net** of 15% store fee and 20% creator share retained. Real, but it does not compound: every tourist is a fresh acquisition at full cost, with zero retention and zero referral within the target Lisbon-resident graph.

**Recommendation: treat tourism as a cash-generating side channel, not a growth engine. Do not let it distort the core product.**

---

## SOM (Serviceable Obtainable Market)

Pre-launch, likely-solo, unfunded, Lisbon-first, v5.7.0 built but zero confirmed traction.

### Comparable trajectories used

1. **RevenueCat State of Subscription Apps 2025/2026** (115,000+ apps, $16B revenue, >50% of all mobile subscription apps — Tier 1-equivalent primary data): **only 1 in 20 apps makes more than $9,000/month one year after launching.** 95% of subscription apps are below ~€100k ARR at the 12-month mark. 14,000+ new apps launch monthly.
2. **Qraved** (Indonesia/SE Asia restaurant discovery, 2013–~2019, raised $15M from MDI and Gobi — Tier 3 case study): died of "the classic marketplace death spiral: unsustainable unit economics meeting platform commoditization." Restaurants treated online presence as nice-to-have; **consumers had zero switching costs between discovery platforms**. Directly analogous to NomNom's position, in a market with *more* smartphone growth tailwind than Portugal has.
3. **TheFork**: founded 2007 as LaFourchette, acquired by Tripadvisor 2014, reached $232M revenue across 11 countries by 2026 — **19 years and a corporate balance sheet** to build the European category leader.

### Year 1 funnel — explicit arithmetic

**Downloads.** No paid budget. Distribution is creator-seeded + organic.
- A Portuguese food micro-creator with 20,000 followers posting one promotional Reel → ~8,000 follower views → ~2% link-tap rate → 160 taps → ~40% install → **~65 installs per creator promotion.**
- 30 seeded creators × ~150 installs each (assuming 2–3 promotions each over the year) = **4,500 installs**
- Organic, word-of-mouth, PR, App Store browse: **+2,000–7,000**
- **Total Year 1 downloads: 5,000–12,000. Central: 8,000.**

**Retention.** Applying category benchmarks (see next section) — D30 of 5–8% for a lifestyle/social hybrid:
- **Month-12 MAU: 500–1,500. Central: ~800.**

**Paying users.** RevenueCat median freemium Day-35 download-to-paid conversion is **2.1%** (iOS 2.6%, Android 0.9%).
- 8,000 × 2.1% ≈ **170 people who ever pay anything.**

**Revenue.**
- *Snapshot:* 8,000 installs × 3% ever purchase = 240 purchases × €3.50 = €840 gross; ×1.4 repeat = **€1,180**
- *Subscription:* 8,000 × 0.8% = 64 subs × €3.99/mo × 3.5-month average lifetime (72% annual churn, 35% of cancellations in month 1) = **€894**
- *Gross transaction value: ~€2,075*
- Less Apple/Google 15% (Small Business Program) = €1,764
- NomNom take rate 20–30% → **€350–€530**
- *Sponsored placements:* with 800 MAU, a restaurant reaches fewer people than one micro-creator Reel — which costs €200–600 in Portugal. Honest expectation: 0–3 sponsors × €100/mo × 4 months = **€0–€1,200** (and any deals closed in Year 1 are relationship favours, not a repeatable channel).

### **SOM Year 1**

| | Downside | Central | Upside |
|---|---|---|---|
| Downloads | 5,000 | 8,000 | 12,000 |
| Month-12 MAU | 400 | 800 | 1,500 |
| People who ever pay | 90 | 170 | 300 |
| **Net revenue to NomNom** | **€0** | **~€1,000** | **~€3,000** |

Even a strong-outcome Year 1 (50,000 downloads, 5,000 MAU — top-decile for an unfunded solo launch) yields roughly €15,000–€25,000 gross transaction value and **€4,000–€7,000 net**. That is below one month of Portuguese median salary.

**Year 3, conditional on Year 1 finding product-market fit:** 40,000–80,000 cumulative downloads, 4,000–8,000 MAU, €25,000–€60,000 GTV, **€8,000–€20,000 net revenue.** Still not a salary.

**Conclusion, stated plainly:** NomNom cannot be revenue-viable in Year 1 or Year 2 on the Snapshot + Subscription model at Lisbon scale. Year 1's only defensible objective is to prove that (a) users retain past D30 and (b) *any* meaningful fraction will pay for a list. If either fails, the monetisation model must change, not the marketing budget.

---

## Unit Economics Benchmarks

### CAC

| Metric | Value | Source | Tier | Date |
|---|---|---|---|---|
| Global avg iOS CPI, all categories | $5.84 (+19% YoY) | digitalapplied, synthesising Sensor Tower | 3 | 2026 |
| Global avg Android CPI | $1.92 | same | 3 | 2026 |
| Social category CPI | iOS $4.81 / Android $1.62 | same | 3 | 2026 |
| Social/dating healthy CPI band | $3.00–$8.00 | ad-stack | 3 | mid-2026 |
| Social & dating **fully-loaded paid CAC** | $4 low / **$10 median** / $25 high | SEM Nexus, synthesising AppsFlyer + Liftoff | 3 | 2026 |
| Tier-2 Europe (ES, IT, PL) multiplier vs Tier-1 English | **0.4–0.6×** | ad-stack | 3 | 2026 |
| Southern Europe multiplier | 0.3–0.6× | Admiral Media | 3 | 2026 |
| **Meta CPM, Portugal** | €3–6 awareness / €5–10 traffic / €8–15 conversion | PortugalSEO | 3 | 2026 |
| **Meta CPM, Portugal (2nd source)** | €3–8 | Agência ZUM | 3 | 2025 |
| **Meta CPC, Portugal** | €0.15–€0.80 | PortugalSEO *and* Agência ZUM (independent) | 3 | 2025–26 |
| Meta CPC, Portugal hospitality vertical | €0.20; CPL €3–5 | Agência ZUM | 3 | 2025 |
| TikTok ads | $4–13 CPM / $0.30–1.50 CPC | AdManage | 3 | 2026 |

**Cross-reference note:** two independent Portuguese agencies (PortugalSEO, ZUM) converge on €3–8 CPM and €0.15–0.80 CPC. That agreement raises confidence despite both being Tier 3. **All CAC data in this section is Tier 3** — there is no Tier 1 or Tier 2 Portugal-specific CAC source available publicly. Treat the ranges, not the point estimates.

**Derived Portugal CPI for a social/discovery app:** $4.81 iOS × 0.5 Tier-2 multiplier ≈ **€2.10 iOS**; $1.62 × 0.5 ≈ **€0.70 Android**. Blended **~€1.20–€2.00 per install.**

### The killer calculation

Working forward from Portuguese Meta rates:

```
€5.00 CPM  →  1,000 impressions
              × 1.0% CTR          = 10 clicks       (€0.50 CPC — optimistic vs €0.15–0.80 band)
              × 25% install rate  = 2.5 installs    → CPI = €2.00
              × 40% activation    = 1.0 activated   → CAC/activated user = €5.00
              × 2.1% pay          = 0.021 payers    → CAC per PAYING user = €238
```

Against an estimated LTV of **€5–€15** per paying user (€3.50 Snapshot, or €3.99/mo × ~3.5-month subscription lifetime, before the 15% store fee and the creator's 80% share).

**The ratio is roughly 20:1 inverted. Paid acquisition does not work for NomNom at these price points — not marginally, but by an order of magnitude.** Nothing in the creative, the targeting or the funnel closes a 20× gap. The only viable paths are: (1) organic/creator distribution at effectively zero marginal CAC, (2) a monetisation model with a 10–20× higher LTV, or (3) both.

### Retention

Sources disagree by 2–3× because they measure different app universes. I report all three and state which to plan against.

| Category | D1 | D7 | D30 | Source | Tier | Date |
|---|---|---|---|---|---|---|
| All categories (median) | **25.4%** | — | — | Adjust *State of App Growth* | 2 | 2026 |
| All categories (median) | 25% | 8% | **4%** | AppsFlyer via uxcam | 3 | 2026 |
| Cross-category D30 | — | — | 5.4% | Sensor Tower via digitalapplied | 3 | 2026 |
| Social/dating | 32.5% | 17.8% | **10.3%** | Adjust | 2 | 2026 |
| Social & Communication (US) | 31.9% | 12.3% | **5.9%** | MWM | 3 | Q3 2025 |
| **Lifestyle & Well-being (US)** | **23.6%** | **9.6%** | **4.8%** | MWM | 3 | Q3 2025 |
| Food Delivery | 29.1% | 16.4% | 11.2% | Adjust | 2 | 2026 |
| Subscription apps D30 | — | — | 13.8% | Sensor Tower via digitalapplied | 3 | 2026 |

**Which to trust:** Adjust's social/dating D30 of 10.3% is inflated for NomNom's purposes — it is dominated by apps with true network effects (a friend graph you cannot leave). MWM's Lifestyle & Well-being figures (D1 23.6% / D7 9.6% / D30 4.8%) are the closer analogue: episodic, discretionary, no lock-in. NomNom sits between the two because saved lists create *some* switching cost.

**Plan against: D1 25–30%, D7 10–12%, D30 5–7%.** Treat anything above D30 8% as a genuine positive signal worth investing behind.

One useful lever: Adjust found apps achieving 4.2+ sessions/day see **37% higher D30 retention** regardless of category. And apps with in-app purchase flows retain meaningfully better because purchasing signals commitment.

### ARPU, churn, free-to-paid conversion

All from **RevenueCat *State of Subscription Apps* 2025/2026** — 115,000+ apps, $16B revenue, 1B+ transactions, >50% of all mobile subscription apps. This is the highest-quality dataset in this document (Tier 1-equivalent primary data, published 2026).

| Metric | Value | Note |
|---|---|---|
| **Freemium D35 download-to-paid** | **2.1%** | Flat vs 2025 — no improvement |
| Hard paywall D35 download-to-paid | 10.7% | **Down from 12.1% in 2025** — consumer reluctance rising |
| Top 10% of hard-paywall apps | 38.7% | |
| iOS D35 download-to-paid (median) | 2.6% | |
| **Android D35 download-to-paid (median)** | **0.9%** | ~3× worse than iOS |
| Trial-to-paid, once started | iOS 32.6% / Android 32.5% | Identical — the gap is funnel *entry*, not conversion |
| Revenue per install, D14 | Freemium $0.27 / hard paywall $2.32 | |
| **Revenue per install, D60** | **Freemium $0.38** / hard paywall $3.09 | ~8× gap |
| Trial 17–32 days → paid | 42.5% | |
| Trial ≤4 days → paid | 25.5% | Long trials convert **70% better**; yet short trials rose 42.1%→46.5% |
| **Annual subscriptions cancelled within year 1** | **72%** | |
| — of which, cancelled in month 1 | 35% | |
| Yearly subscriber retention after 1 year | Freemium 28% / hard paywall 27% | Statistically identical |
| Higher-priced apps trial conversion | 8.9% vs 4.4% low-priced | ~2× — but they retain worse |
| Trial starts occurring on Day 0 | ~80% | Paywall placement in onboarding is decisive |
| Involuntary churn | 31% of Google Play, 14% of App Store cancellations are billing failures | |
| **Apps earning >$9,000/mo at 12 months post-launch** | **1 in 20** | |

**Direct implications for NomNom:**
1. Freemium at 2.1% is the honest planning number, and it is not improving industry-wide.
2. Android converts at 0.9%. If NomNom's Portuguese audience skews Android (likely, given €1,100–1,350 median net salary), the blended conversion is nearer **1.2–1.5%**, not 2.1%. Model it that way.
3. 72% annual churn means the Subscription product needs continuous creator-side content investment just to stand still.
4. The "free tier keeps unlimited personal saves" decision is a *freemium* choice. It costs ~5× conversion (2.1% vs 10.7%) and ~8× revenue per install ($0.38 vs $3.09). That may still be the right call for a cold-start network — but the price of it should be stated in the plan.
5. Freemium does have one advantage worth noting: at week six, freemium converts 22.9% of that cohort vs 15.3% for hard paywalls. Products with long discovery cycles — which NomNom is — capture users a hard paywall would lose.

### Creator-product conversion (Patreon/Substack-style)

| Metric | Value | Source | Tier |
|---|---|---|---|
| Substack official guidance, free→paid | 5–10% | Substack | 2 |
| **Substack observed median, free→paid** | **3%** | reallygoodbusinessideas (dozens of self-reports, 5 yrs) | 3 |
| Normal range | 2–5% | Multiple independent (yana-g-y, thrivewithcarrie, stevenscesaon) | 3 |
| Publications exceeding 5% | Only 20% of them | reallygoodbusinessideas | 3 |
| Large general-audience publications | 1–3% | bestwriting / stevenscesaon | 3 |
| Specialised/niche publications | 4–10% | bestwriting | 3 |
| **Conversion from in-platform discovery** | **9.3%** | yana-g-y (own data, 3 channels) | 3 |
| Conversion from network/recommendations | 4.4% | same | 3 |
| **Conversion from imported social traffic** | **1.2%** | same | 3 |
| Substack paid subscriptions globally | 5M (up from 2M in 2024) | bestwriting | 3 |

**This is the most important benchmark in the document for NomNom's creator model.** Substack's official 5–10% is not supported by the data. The observed median is 3%. And crucially: **traffic imported from social media converts at 1.2%** — the worst of the three channels by 8×.

NomNom's creator model is, definitionally, imported social traffic. A creator sends Instagram followers to a third-party app to buy a list. **Plan against 1.2%, not 3%, and certainly not 5–10%.**

---

## Creator-side economics

The question a Portuguese food micro-creator will actually ask: *"How much will this pay me, versus what I already earn?"*

### The alternative they already have

| Tier | Feed post | Stories (3×) | Reel | Monthly package |
|---|---|---|---|---|
| Nano (<10k) | €50–150 | €30–80 | €80–200 | €200–500 |
| **Micro (10k–50k)** | **€150–500** | **€80–200** | **€200–600** | **€500–1,500** |
| Mid (50k–500k) | €500–2,000 | €200–800 | €600–2,500 | €1,500–6,000 |

*Source: Pictame (Tier 3, 2026). Cross-checked against Light Internet (Tier 3, 2026): "nano and micro can charge from symbolic exchanges up to €50–500 per post." The two sources agree at the low-mid end. Food-vertical engagement rate in Portugal: 3.5%, with the second-highest save rate of any category at 200–350 saves/post — a useful signal that food content already drives saving behaviour.*

**Baseline to beat: a Portuguese micro-creator can earn €200–€600 for one sponsored Reel, with no ongoing obligation.**

### Scenario A — 25,000-follower Lisbon food micro-creator

**Snapshot (one-time list purchase, €3.99)**

```
Followers                                    25,000
× 1.2% imported-social conversion (Substack)    300  ← lifetime ceiling, multi-year
× 35% achieved in year 1                        105  buyers
× €3.99                                      €419    gross
− 15% Apple/Google (Small Business Program)  €356
− 20% NomNom take                            €285    to the creator
```

**≈ €285/year from Snapshot at 25k followers.**

That is *less than one sponsored Reel*. A creator doing this maths will not prioritise NomNom.

**Subscription (€4.99/mo, subscriber-only lists)**

```
Followers                                    25,000
× 1.2% imported-social conversion               300  ← ceiling
× 35% achieved in year 1                        105  subscribers gross-added
Apply 72% annual churn → steady state ≈          45  active subscribers
× €4.99/mo                                   €225    gross MRR
− 15% store                                  €191
− 20% NomNom take                            €153    to the creator per month
                                          = €1,836   per year
```

**≈ €153/month (€1,836/yr) at steady state from a 25,000-follower account — and only if the creator publishes subscriber-only content every single month.**

To *hold* 45 subscribers against 72% annual churn, the creator must recruit ~32 new subscribers per year just to stand still. That is a permanent, unpaid sales job.

**The creator's actual comparison:**

| Option | Annual income | Ongoing obligation |
|---|---|---|
| 4 sponsored Reels/yr @ €400 | **€1,600** | ~8 hours total |
| 8 sponsored Reels/yr @ €400 | **€3,200** | ~16 hours total |
| NomNom Subscription @ 25k followers | **€1,836** | Monthly content, permanent recruiting |
| NomNom Snapshot @ 25k followers | **€285** | Occasional promotion |

**At 25,000 followers, NomNom Subscription is roughly at parity with 4–5 sponsored Reels while demanding vastly more ongoing work. Snapshot is not competitive at all.** This is the central supply-side problem.

### Scenario B — 100,000-follower creator

```
Followers                                   100,000
× 1.2% conversion                             1,200  ceiling
× 40% achieved in year 1                        480  subscribers
Apply 72% churn → steady state ≈                200  active
× €4.99 × 0.85 store × 0.80 NomNom take      €679    /month to creator
                                          = €8,150   /year
```

**≈ €679/month at 100k followers.** *Now* it is interesting — comparable to a monthly retainer, but recurring and owned by the creator. This is the tier where NomNom's pitch actually lands.

But: 100k-follower Portuguese food creators are rare (probably 20–60 accounts nationally — **DATA GAP**), and they have the strongest existing brand-deal alternatives and agency representation.

### Scenario C — 5,000-follower nano-creator (a genuinely local neighbourhood voice)

```
5,000 × 1.2% × 40% = 24 subscribers → steady state ≈ 10
10 × €4.99 × 0.85 × 0.80 = €34/month
```

**≈ €34/month.** Effectively zero. Nano-creators cannot be monetised on this model — but they *can* be the free content supply that makes the app useful. Do not promise them income.

### What this means strategically

1. **The subscription model only works for creators above ~50k engaged local followers.** Below that, the arithmetic is worse than the status quo.
2. **The 20% take rate is the wrong lever to argue about.** Dropping to 10% moves the 25k creator from €153 to €172/month. It does not change the decision.
3. **The binding constraint is the 1.2% imported-social conversion rate.** Raising that — via in-app creator discovery, so the traffic becomes "in-platform" (9.3%) rather than "imported social" (1.2%) — is worth roughly 8×. That single mechanic is worth more than any pricing change.
4. **Position NomNom as incremental, non-competing income**, not as a replacement for brand deals. A creator who has to choose will choose the Reel.
5. Consider whether the *first* creator cohort should be paid a guarantee rather than a revenue share. At these volumes, a €100/month guarantee to 10 creators (€12,000/yr) buys more supply certainty than any rev-share promise — but it requires capital this project does not appear to have.

---

## Market Headwinds & Risks

Ordered by severity.

**1. Paid acquisition is arithmetically closed (CRITICAL).** €238 CAC per paying user vs €5–15 LTV. No creative, targeting or funnel improvement closes a 20× gap. This means growth must be 100% organic/creator-led, which caps the growth rate at whatever creators will do for free. *Evidence: derived from Portuguese Meta CPM (Tier 3, two independent sources) + RevenueCat 2.1% freemium conversion (Tier 1-equivalent).*

**2. Portuguese consumers are actively cutting restaurant spending (HIGH).** 82.1% of mortgage-holding Portuguese who are cutting expenses named restaurants as the **first** cut — ahead of clothing (73.9%) and travel (67.9%) (Intercampus for Negócios/Correio da Manhã/CMTV/NOW, June 2026 — Tier 2). Separately, 41% of consumers reported reducing restaurant visits due to cost of living (2025 — Tier 3). Average mortgage payment €402, highest since Dec 2024; inflation 3.3% YoY in May 2026. NomNom's core use case is the discretionary spending line consumers cut first.

**3. Low-ARPU market (HIGH).** Portuguese average net monthly salary €1,100–€1,350; median €1,250–€1,400 (INE Q1 2026: €1,611 gross total earnings, ~€1,239 net illustrative — Tier 1/2). US consumer app spend is $150–210/user/yr vs a global average of $25–40 (Sensor Tower/data.ai — Tier 2). Portugal sits at or below the global average. And subscription fatigue is already visible: Marktest BStream Q4 2025 shows streaming *intention to subscribe in the next three months fell 0.7pp YoY* despite penetration hitting a record 53.3% (Tier 2). The subscription wallet in Portugal is full.

**4. Two-sided cold start with zero switching costs (HIGH).** The Qraved post-mortem is nearly a description of NomNom's risk: restaurants viewed online presence as "nice-to-have rather than essential," and "consumers had zero switching costs between discovery platforms." Qraved had $15M and died. *Reforge/Platform Chronicles (Tier 3): "most marketplaces never get past this stage."*

**5. Excellent free substitutes (HIGH).** Google Maps saved lists, Instagram Saved/Collections, WhatsApp group chats and TikTok's own save function all solve ~70% of the stated problem for free, inside apps the user already has open. Instagram food content in Portugal already generates 200–350 saves per post (Pictame — Tier 3), which is evidence the behaviour exists *and* that the incumbent tool is being used for it. The wedge must be the 30% that Saved folders cannot do — organisation, trust, and place-resolution — not the saving itself.

**6. Consumer app market saturation (MEDIUM-HIGH).** 14,000+ new apps launch monthly; only 1 in 20 exceeds $9,000/month one year after launch (RevenueCat 2026 — Tier 1-equivalent). Freemium conversion is flat at 2.1% and hard-paywall conversion is *falling* (12.1% → 10.7%), which RevenueCat reads as "a broader reluctance to convert."

**7. Creator supply churn (MEDIUM).** If a creator earns less from NomNom than one sponsored Reel (true below ~50k followers — see arithmetic above), they will deprioritise it. Creator churn degrades content, which degrades user retention, which further degrades creator earnings. This is the supply-side death spiral and it runs faster than the demand-side one.

**8. No demographic tailwind (MEDIUM).** Portugal's population *fell* 15k in 2025; internet users fell 0.1% YoY; social media identities grew only 1.3% (DataReportal/Kepios — Tier 2). Instagram grew 1.6% YoY. Only TikTok is growing meaningfully (+15.0% YoY, +537k users). There is no rising tide — every user must be taken from an incumbent.

**9. Tourism dependence trap (MEDIUM).** Tourists have the highest willingness to pay (€265.1 average spend per trip) and effectively zero retention. Optimising for them produces flattering early revenue and a product no Lisbon resident wants. Also note average spend per tourist **fell 4.2%** in 2025 and non-resident overnight stays grew only 0.6%.

**10. Platform tax and dependency (LOW-MEDIUM).** 15% Apple/Google fee (Small Business Program) compounds with the creator split: on a €3.99 Snapshot, the creator gets €2.71, NomNom €0.68, the store €0.60. NomNom's margin on a transaction is ~17% of face value.

---

## Source Quality Assessment

| Claim | Source | Tier | Date | Stale? |
|---|---|---|---|---|
| PT restaurant turnover €10,850M; 35,576 enterprises; 38,105 establishments (CAE 561) | INE via GEE *Síntese Estatística Setorial* | 1 | 2024 data, updated 11 Dec 2025 | No |
| Grande Lisboa restaurants: 9,096 enterprises, €3,946M turnover, 9,884 establishments | INE via GEE | 1 | 2024 | No |
| Península de Setúbal: 2,478 enterprises, €574M | INE via GEE | 1 | 2024 | No |
| Norte: 9,251 enterprises, €2,616M | INE via GEE | 1 | 2024 | No |
| PT restaurant turnover +2.9% nominal in 2025; +69% nominal since 2019 | Banco de Portugal Governor, citing INE | 1 | Jan 2026 | No |
| 4,991 accommodation/restaurant businesses created vs 1,307 exits in 2025 | Informa D&B via Banco de Portugal | 1 | 2025 | No |
| PT restaurants & takeaways €11.6bn (2026); 35,085 businesses | IBISWorld | 2 | Pub. June 2025 | No |
| PT foodservice profit sector €14.5bn (2024) → €17.1bn (2029), 3.4% CAGR | GlobalData | 2 | Pub. 25 Jul 2025 | No |
| Household spend on restaurants & accommodation = 8.6% of budget (€2,071/yr); total household expenditure €23,900–24,190 | INE *Inquérito às Despesas das Famílias 2022/2023* | 1 | 2022/23 survey, pub. 2024 | **Yes — >18 months.** Structural, so still usable, but pre-dates the 2025–26 cost-of-living squeeze |
| AML population 3,352,939; Lisbon city 658,236 | INE via Wikipedia | 2 (citing 1) | 2025 | No |
| AMP population 1,818,217 (2024) / 1,802,664 (2023) | Wikipedia PT / GEE-INE | 2 / 1 | 2024 / 2023 | Borderline |
| PT population 11,424,031; +36,809 (0.32%) in 2025 | INE *Destaque* | 1 | 31 Dec 2025 | No |
| Age 25–29: 723,809; age 30–34: 737,965 | INE 2025 estimate via Wikipedia | 2 (citing 1) | 2025 | No |
| Pordata PT population 10,694,681 (2024) — **conflicts with INE 11.42M** | Pordata/INE | 1 | Updated 26 Jan 2026 | No, but series-inconsistent |
| Instagram PT 6.35M users; 71.8% of adults 18+ | Meta ad tools via DataReportal Digital 2026 | 2 | Late 2025 | No |
| TikTok PT 4.11M users 18+; +15.0% YoY | TikTok ad tools via DataReportal | 2 | Late 2025 | No |
| PT social media identities 7.59M (72.9%); +1.3% YoY | Kepios/DataReportal | 2 | Oct 2025 | No |
| Instagram PT 7,407,500 (73.7%) — **conflicts, rejected** | NapoleonCat | 3 | June 2026 | No |
| PT influencer marketing €63M (2024), from €59.5M (2023); 285,380 sponsored posts | Brinfer *Top Brands 2025* via Marketeer | 2 | 2025 | No |
| PT micro-influencer rates: Reel €200–600, feed post €150–500, monthly €500–1,500 | Pictame | 3 | 2026 | No |
| PT nano/micro rates €50–500/post (corroborating) | Light Internet | 3 | 2026 | No |
| PT food-vertical IG engagement 3.5%; 200–350 saves/post | Pictame | 3 | 2026 | No |
| PT tourists 29.9M (+3.3%); 89.7M overnight stays; avg spend/trip €265.1 (−4.2%) | INE *Estatísticas do Turismo 2025*, pub. 9 Jul 2026 | 1 | 2025 | No |
| Tourism receipts €29.1bn (+5.0%); Lisbon airport 18.2M arrivals | Turismo de Portugal / Banco de Portugal | 1 | 2025 | No |
| Foreign-card restaurant spend €2,400.5M (+8.4%); Grande Lisboa €867.8M (35.6%) | Turismo de Portugal via Presstur | 1/2 | 2025 | No |
| TheFork LTM revenue $232M, EBITDA $28M; sold to Amex for $700M | Tripadvisor press release (PRNewswire) | 1 | 15 Jun 2026 | No |
| Europe online reservation market $145M (2026) — **rejected as internally inconsistent** | intelmarketresearch | 3 | 2026 | No |
| Freemium D35 conversion 2.1%; hard paywall 10.7% (down from 12.1%) | RevenueCat *SOSA 2026* (115k apps, $16B) | 1-equiv | 2026 | No |
| Android D35 0.9% vs iOS 2.6%; trial-to-paid 32.5% vs 32.6% | RevenueCat SOSA 2026 | 1-equiv | 2026 | No |
| RPI D60: freemium $0.38 / hard paywall $3.09 | RevenueCat SOSA 2026 | 1-equiv | 2026 | No |
| 72% of annual subs cancelled in year 1; 35% in month 1 | RevenueCat SOSA 2026 | 1-equiv | 2026 | No |
| 1 in 20 apps >$9,000/mo at 12 months post-launch | RevenueCat SOSA 2025 | 1-equiv | 2025 | No |
| Adjust median D1 retention 25.4%; social/dating D1 32.5% / D30 10.3% | Adjust *State of App Growth* via RocketShipHQ | 2 | 2026 | No |
| Lifestyle & Well-being D1 23.6% / D7 9.6% / D30 4.8% | MWM (US data) | 3 | Q3 2025 | No |
| Substack observed median free→paid 3%; range 2–5%; only 20% exceed 5% | reallygoodbusinessideas (aggregated self-reports) | 3 | 2025–26 | No |
| **Imported social traffic converts at 1.2%** vs 9.3% in-platform | yana-g-y (single-author own data) | 3 | 2026 | No — but **n=1**, see Data Gaps |
| Social/dating fully-loaded paid CAC $4/$10/$25 | SEM Nexus (synth. AppsFlyer + Liftoff) | 3 | 2026 | No |
| Tier-2 Europe CPI multiplier 0.4–0.6× | ad-stack | 3 | 2026 | No |
| Meta PT CPM €3–15, CPC €0.15–0.80 | PortugalSEO | 3 | 2026 | No |
| Meta PT CPM €3–8, CPC €0.15–0.80 (independent corroboration) | Agência ZUM | 3 | 2025 | Borderline |
| 82.1% of expense-cutting mortgage holders cut restaurants first | Intercampus for Negócios/CM/CMTV/NOW | 2 | June 2026 | No |
| 41% of PT consumers reduced restaurant visits on cost of living; avg lunch €17.82 | idealista via The Portugal News | 3 | Sept 2025 | No |
| PT avg gross monthly earnings €1,611 (Q1 2026), €1,694 (2025); net ~€1,239 | INE via finorum/anchorless | 2 (citing 1) | Q1 2026 | No |
| PT streaming: 53.3% penetration; intention to subscribe **−0.7pp** YoY | Marktest BStream via Minerva Insights | 2 | Q4 2025 | No |
| US consumer app spend $150–210/user/yr vs global avg $25–40 | Sensor Tower / data.ai via fwctecnologia | 3 | 2026 | No |
| Europe IAP revenue +23–24% YoY; US $52bn (>1/3 of global) | Sensor Tower *State of Mobile* / Q4 2025 Digital Market Index | 2 | 2025–26 | No |
| Qraved failure: marketplace death spiral, zero consumer switching costs | loot-drop case study | 3 | Undated | Unknown — treat as illustrative only |
| AML held 39.2% of a 8,684-restaurant sample | MDPI (peer-reviewed) | 1 | Pub. 2023, 2019–20 data | **Yes — stale.** Used only for directional cross-check |
| 2,189 restaurants in Lisbon District — **rejected** | rentechdigital (scraped) | 3 | Apr 2026 | No, but methodologically unsound |

**Tier distribution of load-bearing claims:** Tier 1 or 1-equivalent for all market-size, demographic, tourism and subscription-benchmark inputs. **Tier 3 for all CAC, CPM and creator-rate inputs** — this is the weakest part of the evidence base and the part the unit economics depend on most.

---

## Data Gaps

Ordered by how much they would change the conclusions.

**1. Portuguese consumer willingness to pay for a curated restaurant list.**
`DATA GAP: could not find any data on PT consumer WTP for creator-curated local content, after 3 query variations. Closest proxy: Marktest BStream streaming subscription data (42% subscribe to ≥1 service, intention falling 0.7pp YoY) and RevenueCat global freemium conversion 2.1%. Confidence: Low.`
**This is the number the entire business rests on and it does not exist publicly.** *How to fill:* spend €50 on a Meta ad in Lisbon driving to a pricing page with a "Buy this list — €3.99" button that captures the click and shows "coming soon." Measure click-to-intent rate. Two days, €50, and it replaces the single largest assumption in this document.

**2. Number and size distribution of Portuguese food creators with local Lisbon/Porto audiences.**
`DATA GAP: could not find a count of PT food micro-creators in the 3k–150k band. Closest proxy: Spain has 207,000+ active IG/TikTok creators (noticiasaominuto, 2024, Tier 3); Portugal at ~1/4.5 of Spain's population implies ~45,000 total creators, of whom Lisbon-focused food micro-creators might be 300–800. Confidence: Low.`
*How to fill:* scrape the hashtag graph for #comerlisboa, #restauranteslisboa, #lisboafood, #comerporto and count accounts with 3k–150k followers whose last 20 posts geotag Portugal. One to two days of scripted work. This is a required input for supply-side planning and NomNom already has the engineering capability.

**3. Reliability of the 1.2% imported-social-traffic conversion rate.**
`DATA GAP: the 1.2% figure comes from a single Substack author's own three-channel data (n=1, Tier 3). No corroborating source found after 3 query variations. Closest proxy: the 3% overall Substack median and RevenueCat's 2.1% freemium figure both bracket it. Confidence: Low.`
This number drives the entire creator-economics section. *How to fill:* it will only be known from NomNom's own data. Instrument creator-attributed installs → purchase from day one, and treat the first three creator campaigns as the measurement.

**4. Portugal-specific app market revenue in euros.**
`DATA GAP: could not find PT app market revenue/ARPU. Statista's App - Portugal Outlook exists but the figures are paywalled; 3 query variations failed to surface them. Closest proxy: Portugal is not broken out in any Sensor Tower public reporting (which covers US, UK, DE, FR, IT, JP, KR only). 42matters confirms 17% of PT Android publishers use IAP vs 10% globally — a developer-behaviour stat, not a revenue stat. Confidence: Low.`
*How to fill:* a single Statista Outlook report (~€500) or the free Sensor Tower country-level top-grossing chart, which at least gives relative ordering.

**5. Restaurant marketing spend per venue in Lisbon.**
`DATA GAP: could not find PT restaurant marketing budget data. The 1–2% of turnover ratio used above is a general hospitality heuristic, not a Portuguese measurement. Confidence: Low.`
This makes the sponsored-placement revenue line (part of SAM) the softest number in the model. *How to fill:* interview 15 Lisbon restaurant owners — ask what they spent on Instagram/Google/influencers last year in euros. A week of work, and it also doubles as customer discovery for the sponsored-placement product.

**6. Dining-out frequency of the 24–34 cohort in AML/AMP.**
`DATA GAP: INE's Household Budget Survey reports restaurant spend by household and by region, but the published tables do not cross-cut by age of reference person and region simultaneously. Closest proxy: national 8.6% of household budget on restaurants+accommodation; Algarve highest at 10.2%. Confidence: Low.`
This drives the 50% filter in SAM Step 4 — arguably the widest error bar in the SAM derivation. *How to fill:* INE publishes IDF microdata on request for research purposes; alternatively, Eurostat HBS gives age-band cross-tabs for Portugal.

**7. Portugal-specific app retention and ARPU.**
`DATA GAP: no Portugal-specific mobile retention or ARPU benchmark exists in any source found. Every retention and conversion number in this document is US- or global-median. Confidence: Low that they transfer cleanly to a €1,239-net-salary market.`
The direction of the bias is knowable even if the magnitude is not: Portuguese conversion and ARPU will be **below** global medians, and Android skew will make it worse. *How to fill:* not fillable externally. Measure in-product from launch and do not plan against global medians without a haircut of at least 30%.

**8. Portuguese smartphone OS split (iOS vs Android).**
`DATA GAP: not searched directly, but it materially changes the blended conversion rate (Android 0.9% vs iOS 2.6% at D35). Confidence: N/A.`
*How to fill:* StatCounter publishes free monthly mobile OS market share by country. Ten minutes of work, and it directly rescales the SOM revenue line.

---

*End of report. Prepared by Agent A1 for the NomNom startup validation process, 26 July 2026.*
