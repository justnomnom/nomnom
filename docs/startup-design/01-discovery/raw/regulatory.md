# Regulatory Landscape: consumer UGC + creator-marketplace app in Portugal / EU

**Agent:** A3 — Regulatory & Compliance
**Date:** 26 July 2026

---

## Corrections to the two "already established" points

Both were checked against primary sources. One holds, one is partly wrong.

**1. `Código da Publicidade` art. 8 — CONFIRMED, and the platform-liability point is stronger than stated.**
Consolidated DL 330/90 art. 34(1)(a) (as amended by Lei 30/2019) sets fines of **€1,750–€3,750 for a natural person and €3,500–€45,000 for a legal person** for breach of art. 8. Art. 36 punishes **as a co-perpetrator** ("são punidos como agentes") the advertiser, the professional, the advertising agency, **the holder of the advertising medium (`titular do suporte publicitário`) or its concessionaire, and any other participant in the emission of the advertising message**. Separately, art. 30 imposes **joint and several civil liability** on the same set of parties for damage to third parties. There is no size threshold and no safe harbour in the Code itself. The older version of art. 34(2) contained a partial negligence carve-out for a medium-holder that merely "materially promotes" diffusion — but that carve-out **expressly excluded art. 8**, and in the current consolidated text it is gone entirely, replaced by a flat "negligence is always punishable". So the platform is exposed for undisclosed creator advertising on it, including negligently.

**2. EU DSA — the notice-and-action half is right; the dark-patterns half is wrong.**
Art. 16 (notice and action) sits in Section 2 (hosting services) and **does** apply at any size. But **art. 25 (dark patterns) sits in Section 3, and art. 19(1) exempts micro and small enterprises from arts. 20–28 — which includes art. 25.** So DSA art. 25 does *not* bind NomNom at launch. This does **not** make dark patterns legal: they remain prohibited under the Unfair Commercial Practices Directive as transposed in the Portuguese `Decreto-Lei n.º 57/2008`, which has no size threshold. The Trustpilot decision below is a live example of a national consumer authority fining a review platform for dark patterns under the UCPD, not the DSA. Practical conclusion unchanged, legal basis different — which matters, because the enforcing authority is the DGC/consumer regulator, not ANACOM.

Also newly relevant and not in the brief: **Portugal's national DSA implementing law, `Lei n.º 12-A/2026` of 15 April 2026, entered into force 20 April 2026** — three months ago. It designates ANACOM as Digital Services Coordinator and sets domestic fines of up to **6% of worldwide annual turnover** for most DSA breaches. See the DSA section.

---

## Summary table

| Obligation | Applies at launch? | Applies at scale? | What to build | Est. cost | Risk if ignored |
|---|---|---|---|---|---|
| Ad disclosure — `Cód. Publicidade` art. 8 (sponsored placements, paid creator content) | **Yes** | Yes | Persistent "Publicidade"/"Patrocinado" label at the *start* of every sponsored item; disclosure field in creator/list schema; T&C clause | ~€2–4k (build + policy) | €3,500–€45,000 per infringement; platform is co-perpetrator |
| DSA arts. 11–14 (contact point, T&Cs, legal rep) | **Yes** | Yes | Published electronic contact point; DSA-compliant T&Cs with content-moderation policy | ~€3–6k legal + 1–2 dev days | Up to 6% worldwide turnover (Lei 12-A/2026) |
| DSA arts. 16–18 (notice & action, statement of reasons, criminal-offence reporting) | **Yes** | Yes | Report button on every UGC surface; ticketed notice queue; templated statements of reasons; appeal path | ~1–2 dev weeks | Same; also loss of art. 6 hosting safe harbour |
| DSA art. 15 transparency reports | **No** (art. 15(2) micro/small exemption) | Yes | Annual public moderation report | ~€1–2k/yr later | — |
| DSA arts. 20–28 (internal complaints, ODR, trusted flaggers, ad transparency, dark patterns, minors) | **No** (art. 19 exemption) | **Yes** | Formal complaint-handling system, ODR referral, ad repository | ~€15–40k later | Deferred |
| DSA arts. 30–32 (trader traceability, marketplace) | **No** (art. 29 exemption) | **Yes**, once paid creators are traders and you exceed micro/small | KYB on creators, trader-info display | ~€10–25k later | Deferred |
| DSA art. 24(3) — MAU on request | **Yes** (survives the exemption) | Yes | Ability to compute average monthly active recipients in the EU | ~1 dev day | Info-breach fine, up to 1% turnover |
| GDPR — location data (Roulette, map, home locality) | **Yes** | Yes | Granular consent, purpose limitation, retention policy, no background collection | ~€3–8k | CNPD fine; reputational |
| GDPR — DPIA | **Yes**, likely triggered | Yes | Written DPIA before launching Roulette/social-graph features | ~€3–6k (or internal) | Fine + order to suspend processing |
| GDPR — records, DSR flows, breach process, DPA with Supabase/PostHog/Sentry/Resend | **Yes** | Yes | Art. 30 register, export/delete self-service, 72h breach runbook, signed DPAs | ~€4–8k | Fine |
| ePrivacy / cookies (`Lei 41/2004`) — PostHog, push | **Yes** | Yes | Opt-in consent banner with equally easy reject; PostHog blocked pre-consent; separate push opt-in | ~€2–4k | CNPD fine |
| **VAT — deemed supplier on creator sales (Impl. Reg. 282/2011 art. 9a)** | **Yes, from first sale** | Yes | Charge VAT at buyer's country rate on the *full* price; OSS registration; VAT-compliant invoices; creator invoices NomNom | ~€4–10k setup + ~€1–3k/yr | Back VAT + interest across all EU states sold into |
| Consumer withdrawal rights (CRD art. 16(m)) | **Yes, from first sale** | Yes | Pre-purchase express consent + acknowledgement of loss of withdrawal, logged; 14-day flow if not obtained | ~€2–4k | Withdrawal period extends 12 months; refund exposure |
| Subscription cancellation / auto-renew transparency | **Yes** (if subs ship) | Yes | In-app cancel in ≤ same number of steps as signup; renewal reminders | ~1 dev week | UCPD enforcement |
| DAC7 platform reporting | **Probably not** — see analysis | **Possibly**, if any commissioned/custom work | Seller TIN/VAT/address collection if in scope | ~€5–15k if triggered | Per-seller penalties |
| Portuguese creator payout mechanics (recibos verdes, retenção na fonte) | **Yes, from first payout** | Yes | Require creator NIF + activity opened; invoice-in/self-billing; withholding logic | ~€3–8k | AT liability for unwithheld IRS |
| **Apple IAP on creator content** | **Yes, at iOS launch** | Yes | Either IAP integration, or EU external-purchase-link entitlement, or web-only purchase | 10–30% of revenue, plus build | App rejection / removal |
| Google Play billing | **Yes, at Android launch** | Yes | Play Billing or EEA alternative billing | 10–15% typical | App removal |
| Google Maps Platform terms (import feature) | **Yes**, if import ships | Yes | Store only `place_id`; ≤30-day coordinate cache; re-fetch names/addresses via API | ~1–2 dev weeks rework | API termination — feature-fatal |
| European Accessibility Act (`DL 82/2022`) | **Probably exempt** as microenterprise providing a service | **Yes**, once ≥10 staff or >€2M | WCAG 2.1 AA, accessibility statement | ~€10–30k retrofit later | Fines + market-withdrawal orders |

---

## Advertising & sponsored content disclosure (Portugal)

### The rule

`Código da Publicidade` (DL 330/90, consolidated) **art. 8(1)**: *"A publicidade tem de ser inequivocamente identificada como tal, qualquer que seja o meio de difusão utilizado."* Advertising must be unequivocally identified as such, whatever the medium. Tier 1 — Diário da República.

The **DGC (Direção-Geral do Consumidor)** is the advertising-monitoring and contraordenação authority and published an updated guide, *"A Publicidade e o Marketing de Influência"*, in **November 2025** (edition dated October 2025). Its operative guidance: any content with commercial purpose, involving consideration or brand editorial control, must be identified **clearly and unequivocally at the very start of the publication**, using `#Pub`, `#Publicidade`, `#Patrocínio` or `#Parceria`. Platform-native tools ("paid partnership" labels) alone are treated as insufficient. Tier 1.

### Enforcement reality

DGC ran a monitoring sweep **8–29 October 2025** across Instagram and TikTok: 417 commercial posts, 10 influencers, 43 brands. Compliance rose to **90% of influencers** (99% of individual posts labelled), up from 66% in 2024 and 5% in 2023; indicia of infringement were found against one influencer. DGC states it will continue regular sweeps. Reported total contraordenação decisions across DGC's remit rose to 94 in 2025, with growing focus on misleading advertising. Tier 1 (DGC via press) / Tier 2.

Read this two ways. The enforcement machine is real and active — but it is currently aimed at *influencers*, not at the platforms hosting them, and the compliance rate is now high enough that DGC's stated strategy is prevention and capability-building rather than punishment.

### Why this lands on NomNom, not only on creators

Art. 36 names the **`titular do suporte publicitário`** — the holder of the advertising medium — as a co-perpetrator of the contraordenação, alongside the advertiser and agency. Art. 30 adds joint and several **civil** liability. NomNom is squarely the medium-holder for:

- **Sponsored restaurant placements** it sells directly — here NomNom is closest to advertiser/agency, not merely medium. Highest exposure.
- **Creator lists containing undisclosed paid placements** — NomNom is the medium; whether it is "punished as co-perpetrator" in practice depends on knowledge and on what systems it provided. No case law found applying art. 36 to a UGC platform for third-party creator content. See Data Gaps.

There is **no dedicated Portuguese influencer statute**. Checked the Assembleia da República: the only influencer-specific bills in the XVII legislature are Projetos de Lei 219–222/XVII on **gambling** advertising by public figures and influencers — irrelevant to restaurants. Regulation comes via the general Advertising Code plus the DSA implementing law. Tier 1 — parlamento.pt.

### What to build

1. A `sponsorship_type` field on restaurant placements and on creator lists (`none` / `paid_placement` / `gifted` / `affiliate`).
2. A **non-dismissible label rendered before the content**, not below it and not inside a "more" fold. Portuguese-language: "Publicidade" or "Patrocinado".
3. A creator-facing declaration step at publish time — "does this list contain paid or gifted placements?" — with the answer stored and auditable. This is the single most valuable artefact if DGC ever asks: it evidences that NomNom operated a system rather than turning a blind eye.
4. T&Cs obliging creators to disclose, plus takedown for repeat failures.

**Cost:** ~€2–4k. **Risk if ignored:** €3,500–€45,000 per infringement against the company, plus accessory sanctions (temporary ban on advertising activity, closure of premises, cancellation of licences).

---

## DSA obligations

### Which tier NomNom is in

NomNom is a **hosting service** and an **online platform** (it stores and disseminates user information to the public — public lists and profiles). It is not a VLOP. Assuming <50 staff and ≤€10M turnover/balance sheet, it is a **small enterprise** under Recommendation 2003/361/EC, which unlocks two exemptions.

### The exemption map — verified against the consolidated text on EUR-Lex (Tier 1)

| DSA section | Articles | Applies to a micro/small platform? |
|---|---|---|
| §1 Intermediary services | 11 contact point for authorities, 12 contact point for recipients, 13 legal rep, 14 T&Cs | **Yes, all of them** |
| §1 | **15 transparency reports** | **No** — art. 15(2) exempts micro/small non-VLOPs |
| §2 Hosting | 16 notice & action, 17 statement of reasons, 18 criminal-offence notification | **Yes, all of them** |
| §3 Online platforms | 20 internal complaints, 21 out-of-court dispute settlement, 22 trusted flaggers, 23 anti-abuse measures, 24(1)–(2) reporting, 25 **dark patterns**, 26 ad transparency, 27 recommender transparency, 28 minors | **No** — art. 19(1) exempts micro/small |
| §3 | **24(3)** — communicate average monthly active recipients on request | **Yes** — expressly carved back in |
| §4 Online marketplaces | 30 trader traceability, 31 compliance by design, 32 right to information | **No** — art. 29(1) exempts micro/small |

Two important tail conditions in art. 19(2)–(3): once you **lose** micro/small status you get a **12-month transition** before §3 bites; and if you were micro/small in the preceding 12 months you keep the benefit for that period. So growth does not create an overnight cliff — but it does create a dated obligation you should track deliberately.

Note also art. 17 (statement of reasons): this applies to hosting providers generally, but art. 17(5) exempts you from the Commission transparency-database submission if the decision was taken by a micro/small platform. You still owe the statement to the affected user.

### Is NomNom an "online marketplace" and are creators "traders"?

Art. 3(l) DSA: an online platform "allowing consumers to conclude distance contracts **with traders**". Art. 3(f): a trader is any natural or legal person acting for purposes relating to their trade, business, craft or profession.

A creator repeatedly selling Snapshot lists and monthly subscriptions for money **is acting for purposes relating to a trade** and will in most cases be a trader. So yes — **once paid creator sales go live, NomNom becomes an online marketplace within the DSA definition.** The consequence is deferred, not avoided: art. 29 exempts micro/small from arts. 30–32 today, but art. 30 (collect and verify trader name, address, phone, email, payment account, trade-register/ID) is the single biggest deferred build in this document. Build the schema for it now even if you do not enforce it yet — retrofitting identity verification onto an existing creator base is materially harder than collecting it at onboarding.

### `Lei n.º 12-A/2026` — the Portuguese enforcement layer

Published in *Diário da República* 1.ª série n.º 73 on **15 April 2026**, in force **20 April 2026**. Revokes DL 20-B/2024, amends DL 7/2004 (e-commerce). Tier 1 — primary text read directly.

- **ANACOM** is the competent administrative authority and **Digital Services Coordinator**; ERC and CNPD hold sectoral competences (content, minors, data).
- Art. 18 lists the contraordenações. Art. 20 sets the amounts: up to **1% of worldwide annual turnover** for information-provision breaches (arts. 9, 10, 51 duties) and up to **6% of worldwide annual turnover** for the substantive breaches — including failure to have a proper contact point, non-compliant T&Cs, and failure to publish moderation reports where owed. Halved for negligence or attempt (art. 20(3)). For a natural person the reference is 1%/6% of the prior year's declared income.
- Arts. 2–4 impose a hard duty to comply with **orders from Portuguese judicial or administrative authorities** to act against illegal content or to provide information about specific recipients, within the deadline in the order, with a prescribed minimum of 10 working days for information requests.
- Appeals go to the Tribunal da Concorrência, Regulação e Supervisão.

The practical point: a percentage-of-turnover cap is not frightening at pre-revenue scale, but the **compliance-order mechanism is**. An ANACOM order arriving at a two-person company with no notice-handling process is an operational emergency.

### Minimum DSA build for a micro/small platform

1. **Single electronic contact point** published in the app and on the web — one email address is sufficient — declared as the point of contact for both authorities (art. 11) and users (art. 12), stating the languages accepted (include Portuguese and English).
2. **T&Cs** (art. 14) stating in plain, intelligible language: what content is restricted, what tools are used for moderation (including whether any algorithmic moderation is used), and the complaint/redress route. Must be in Portuguese for Portuguese users.
3. **Report button on every UGC surface** — lists, list items, notes, profiles, comments — implementing art. 16: electronic submission, must capture a reasoned explanation, the URL, the reporter's name and email, and a good-faith statement; must send a **confirmation of receipt** and notify the reporter of the decision plus available redress.
4. **Statement of reasons** to the affected user on any removal, demotion, demonetisation, or account suspension (art. 17), including the legal or T&C ground, the facts relied on, whether automated means were used, and redress options.
5. **A path to report suspected criminal offences threatening life or safety** to Portuguese authorities (art. 18).
6. **MAU counter** — be able to produce average monthly active recipients in the EU over the last 6 months (art. 24(3)).

**Cost:** ~1–2 dev weeks plus ~€3–6k legal for T&Cs. This is genuinely tractable and should not be deferred — it is also the foundation for the art. 6 hosting safe harbour that protects you from liability for creator content generally.

---

## Data protection (GDPR, ePrivacy, CNPD, DPIA trigger)

### Location data

Precise geolocation is not a special category under art. 9, but it is treated as high-risk by regulators and by the EDPB. For NomNom:

- **Foreground location for the map and Roulette** — the cleanest legal basis is **consent** (GDPR art. 6(1)(a)) obtained through a genuine, granular in-app prompt, not just the OS permission dialog. The OS permission is an access-control gate, not a GDPR consent record. Log your own consent event.
- **Home locality stored on the profile** — user-provided, so consent or contract. Store the *locality*, not coordinates. Resist the temptation to store a precise home point.
- **Do not collect background location.** It is not needed for either feature, it materially raises the DPIA and risk profile, and it triggers additional app-store review scrutiny.
- Retention: define it. Roulette does not need location history at all — use the fix and discard it. If you log location for analytics, that is a separate purpose requiring separate consent, and it is the thing most likely to attract a complaint.

### DPIA — likely mandatory

Art. 35(3) plus the WP248 criteria: a DPIA is required where processing is likely to result in high risk, and specifically for systematic monitoring, evaluation/scoring, and large-scale processing. Location tracking combined with profiling and a social graph hits multiple criteria. National DPA lists — CNPD's included — commonly list processing of location data allowing tracking or profiling as a mandatory-DPIA operation, with a carve-out where the processing is strictly indispensable to a service the user has expressly requested.

Honest assessment: Roulette and the map are arguably within that carve-out, because the user explicitly asks "find me somewhere near here". The **social graph plus creator-following plus location plus behavioural analytics in combination** is what pushes it over. **Do the DPIA.** It is a document, not a system; it costs a few days; and having one is the difference between an argument and a fine if CNPD ever asks.

### CNPD enforcement climate

CNPD has publicly flagged severe resource constraints and its enforcement output has been modest, with a bias toward public-sector and large-scale cases rather than small apps. Tier 2. Do not over-index on this — the practical risk to NomNom is a **user complaint**, which CNPD is obliged to handle regardless of resourcing, far more than a proactive sweep.

### ePrivacy / cookies — Portugal

`Lei n.º 41/2004` art. 5 transposes the ePrivacy Directive: storing information on, or accessing information stored in, a user's terminal equipment requires **prior informed consent**, except where strictly necessary to provide a service explicitly requested. This is independent of GDPR and applies to the web app and to SDK storage on device.

Consequences that are frequently got wrong and are worth stating plainly:

- **PostHog analytics is not "strictly necessary".** It requires opt-in consent before any PostHog cookie or local-storage write and before any event is sent. Ship PostHog behind a consent gate, or use a genuinely cookieless, non-identifying configuration and document the reasoning.
- **Reject must be as easy as accept** — a same-level "Reject all" button on the first layer. No pre-ticked boxes. No cookie walls that condition access on acceptance.
- **Web Push requires consent for the notification permission and, separately, a GDPR basis for the messages sent.** Marketing push to users needs opt-in; transactional push tied to a requested service does not. Keep the two channels separate in the data model or you will not be able to honour the distinction later.
- Sentry: if it captures user identifiers or session replay, it is in scope. Configure scrubbing.

### DPAs

Signed art. 28 data-processing agreements needed with Supabase, PostHog, Sentry, Resend, Mapbox, Stripe (Stripe is generally a controller for payment data, not a processor — check the specific terms). All have standard DPAs; this is administrative, not expensive, but it must actually be done and filed.

**Total data-protection cost:** ~€10–20k at launch if externally supported, considerably less if the DPIA and art. 30 register are done internally against a template.

---

## Money: VAT, DAC7/platform reporting, creator payouts, consumer withdrawal rights

### VAT — the finding that changes the payout model

This is the second-highest-stakes item in this document and it is easy to miss.

**Council Implementing Regulation (EU) 282/2011, art. 9a** (Tier 1, read directly on EUR-Lex): where electronically supplied services are supplied through an interface or portal, the taxable person taking part in that supply is **presumed to act in his own name but on behalf of the provider** — i.e. the platform is the deemed supplier. The presumption is rebuttable only if the underlying provider is explicitly indicated as supplier on the invoice and receipt and in the contract. **But** art. 9a(1) third subparagraph: a taxable person who **authorises the charge to the customer, or authorises delivery of the services, or sets the general terms and conditions** of the supply **shall not be permitted** to indicate another person as supplier. That is an **irrebuttable** deeming.

NomNom will do all three: it sets the T&Cs, it authorises the charge through Stripe, and it controls delivery of the list. The CJEU upheld art. 9a's validity in **Fenix International (C-695/20, 28 Feb 2023)** — the OnlyFans case, factually very close to a creator-content marketplace. Tier 1 (CJEU) corroborated by BDO, Baker McKenzie and Simmons & Simmons analyses (Tier 2).

**What this means concretely:**

- NomNom is **the supplier to the consumer** for VAT. It must charge VAT at the **buyer's member-state rate on the full consumer price**, not on its commission.
- Register for the **Union OSS scheme** in Portugal and file quarterly. The €10,000 cross-border threshold for micro-businesses exists but is low and easily crossed; plan for OSS from the start.
- The **creator supplies a service to NomNom**, not to the consumer. So the flow is: consumer pays gross → NomNom accounts for VAT → NomNom pays creator net of commission against a creator invoice to NomNom.
- Your creator-facing messaging, contracts, receipts and Stripe metadata all have to reflect this. Getting this wrong is not a small mistake: unremitted VAT accrues across every member state you sold into, with interest, and it is not recoverable from creators after the fact.

**This must be settled with a Portuguese tax adviser before the first paid list ships.** It is cheap to get right at design time and expensive to unwind.

### DAC7 — probably out of scope, but verify

Council Directive (EU) 2021/514 defines the reportable "Relevant Activities" as: rental of immovable property, **personal services**, **sale of goods**, and rental of any mode of transport.

- **"Goods" is defined as "any tangible property".** Digital lists are not tangible. Selling a Snapshot is **not** a "sale of goods". Tier 1 — verified in the directive text.
- **"Personal service"** means a service involving time- or task-based work performed by one or more individuals **at the request of a user**, online or offline. A pre-made list sold off-the-shelf to many buyers is not performed at the request of a particular user. A creator making a **bespoke list for a specific customer**, or doing a paid custom itinerary, **would** be a personal service and would drag NomNom into DAC7.

**Assessment: NomNom's planned model (pre-made Snapshots and subscriptions) is most likely outside DAC7.** But the boundary is fact-sensitive, no guidance directly addresses off-the-shelf creator digital content, and the moment you allow commissions or custom requests you are in scope. **Confidence: Medium. Confirm with a tax adviser and re-check before launching any custom/commissioned feature.**

If it is triggered: collect each reportable seller's name, address, TIN, VAT number, date of birth (individuals), report annually by 31 January, and apply due-diligence procedures. ~€5–15k to implement.

### Portuguese creator payouts

Creator income is **Categoria B** (business and professional income) under art. 3 CIRS. Practical obligations that fall partly on NomNom as payer:

- Creators must **open activity** with the AT and issue a **fatura-recibo (recibo verde)** for every payment, including from foreign payers (art. 115 CIRS).
- **VAT:** creators below €15,000 annual turnover are exempt under art. 53 CIVA (threshold per DL 35/2025); above it they must charge VAT — which, given the art. 9a analysis above, means charging VAT to NomNom on their commission-net service.
- **Retenção na fonte:** the standard rate is **23%**, and withholding is required where the **payer has organised accounting** and the creator is not exempt. Creators in the simplified regime under €15,000 in the prior year are exempt under art. 101.º-B CIRS. NomNom, as a company with organised accounting, will be the withholding agent for non-exempt creators — meaning **NomNom must collect each creator's withholding status and withhold and remit correctly.** Getting this wrong makes NomNom liable for the unwithheld tax.
- Creators also owe quarterly Segurança Social declarations — their problem, not NomNom's, but worth surfacing in onboarding.

**Build:** creator onboarding must capture NIF, confirmation of open activity, VAT status (art. 53 exempt or not), and withholding status; payouts must generate the right documentation. Self-billing on the creator's behalf is common and reduces friction, but requires a prior written self-billing agreement.

### Stripe Connect

Platforms paying EU individuals through Connect must ensure KYC on connected accounts. Stripe-hosted onboarding (Express) handles identity verification, document collection and ongoing monitoring, which is why it is the right choice here — API-only onboarding shifts materially more obligation onto NomNom. The platform remains liable for negative balances on connected accounts. Note that Stripe webhooks are currently disabled in the codebase; payout state cannot be reliably tracked without them.

### Consumer withdrawal rights — Snapshot purchases

Directive 2011/83/EU art. 16(m): the 14-day right of withdrawal is lost for supply of **digital content not on a tangible medium** only if **all three** conditions are met:

1. Performance has **begun**;
2. with the consumer's **prior express consent**;
3. and the consumer's **acknowledgement that they thereby lose the right of withdrawal**.

Miss any one and the withdrawal period extends by **up to 12 months** (art. 10 CRD). A single checkbox buried in T&Cs does not satisfy this.

There is a real complication. In **PE Digital (C-641/19)** the CJEU treated a paid dating-service feature as a *service* rather than digital content. If access to a hosted list on NomNom's servers is characterised as a **service** rather than digital content, the applicable provision is art. 16(a) (service fully performed with prior express consent and acknowledgement) — a different and in some readings harder test, and for a subscription giving ongoing access the service is plainly *not* fully performed at purchase, so the withdrawal right may survive with pro-rata payment for what was consumed. **Confidence: Medium.** Safest design:

- Two explicit, separate checkboxes at checkout: "I want access immediately" and "I understand I lose my 14-day right of withdrawal". Timestamp and store both.
- Provide the confirmation on a durable medium (email) within a reasonable time, restating the consent.
- For **subscriptions**, do not rely on the waiver. Allow cancellation any time, effective at period end, and expect to honour a 14-day withdrawal on the first period with pro-rata deduction.
- Cancellation must be **at least as easy as subscribing**, in-app, no email-only cancellation, no retention maze — the Trustpilot decision shows how national authorities now treat interface friction.

---

## App Store / Google Play payment rules

**Treat this as a first-class commercial risk. It can change the unit economics of the entire creator model.**

### Apple

Guideline **3.1.1**: apps unlocking features or functionality within the app — including subscriptions and content — **must use in-app purchase**. Apple's commission is 30%, or 15% under the Small Business Program (<$1M annual proceeds) and on subscriptions after 12 months.

Guideline **3.1.3(d)** ("person-to-person experiences") permits payment outside IAP **only** where the service is **one-to-one and delivered in real time**. A pre-made list sold to many buyers is one-to-many and not real-time. **It does not qualify.** This is the crux: NomNom's Snapshot and Subscription products, if consumable inside the iOS app, look like straightforward digital content that Apple will require to be sold via IAP.

**The EU DMA position (as at July 2026).** Apple has been forced to permit steering and alternative distribution in the EU, but it has restructured its fees rather than removed them. Under the EU business terms Apple applies a layered model: an **initial acquisition fee (~2%)**, a **store services fee** at a lower or higher tier (**~5% or ~13%**, 10% for Small Business Program participants on the higher tier), and a **Core Technology Commission (~5%)** on external purchases. The realistic all-in for an EU app steering users to external payment is roughly **10–20%, plus payment processing** — better than 30%, materially worse than zero. Apple's EU terms have changed repeatedly under Commission pressure and remain subject to ongoing enforcement. **Confidence: Medium on the exact current percentages — verify directly against Apple's EU terms page at the point of implementation, not from any summary including this one.**

### Google Play

More favourable. Service fee is **15% on the first $1M of annual earnings** per developer (30% above), and **15% on subscriptions from day one**. In the EEA, developers may offer **alternative billing**, with the service fee reduced by **~3–4 percentage points** when the user chooses it. Google also permits external offers in the EEA under the DMA. Net: **~11–15%** is achievable on Android in the EU.

### What this actually means for NomNom

The commission is charged on the **gross** consumer price. If Apple takes 15% and NomNom's own take rate is, say, 20%, then on a €5 list the creator's share is squeezed by Apple's cut before NomNom's — or NomNom absorbs it and its margin roughly halves. Layer VAT on top (NomNom is the deemed supplier per art. 9a) and the gross-to-creator-net waterfall gets ugly fast. **Model this properly before setting the take rate.** A take rate that works on web can be unviable on iOS.

**Realistic options, in order of preference:**

1. **Sell on web only; keep the apps read-only for purchased content.** Post-DMA, EU apps may link out to external purchase — but the Core Technology Commission still applies to purchases attributed to app-driven acquisition, and "reader app"-style exemptions are narrow and unlikely to fit a marketplace. Lower fees, worse conversion.
2. **Use IAP on iOS and price accordingly**, with a higher iOS price or a lower creator share on iOS. Simple, compliant, expensive.
3. **Ship the creator marketplace on web first**, validate willingness to pay, and only then decide how to handle iOS with real numbers. **This is the recommendation.** It de-risks the largest commercial unknown at the lowest cost.

**Do not architect the creator revenue model on the assumption that external payment is free in the EU. It is not.**

---

## Third-party data licensing (Google Maps Platform, Mapbox)

### Google Maps Platform — the import feature is the risk

Google Maps Platform Terms of Service §3.2.3 and §3.2.4 prohibit: extracting, copying or storing Google Maps **Content**; scraping; caching beyond narrow limits; and creating a database or dataset from Google Maps content. Specifically:

- **`place_id` may be stored indefinitely** — it is expressly carved out and is the intended persistence mechanism.
- **Latitude/longitude may be temporarily cached for up to 30 days.**
- **Business names, addresses, ratings, reviews, photos and other Place details may not be stored** and must be re-fetched from the API for display.
- Content must be displayed on a Google map where required by the terms — which conflicts directly with rendering imported places on **Mapbox**.

**This is a direct problem for "users import their Google Maps lists".** If the import writes restaurant names, addresses and ratings from Google's API into Supabase and then renders them on a Mapbox map, that is squarely outside the terms. Contract termination is the realistic sanction, and it would be feature-fatal after users have built their lists on it.

**Compliant patterns:**
- Import only the `place_id`, and **re-resolve details via the Places API at display time** — high API cost at scale, but compliant.
- Use the `place_id` to **match against your own independently-sourced venue database** (OpenStreetMap, Foursquare OS Places, a licensed provider, or your own collection) and store only your own record. This is the durable answer.
- Have users import from an **exported file they own** and treat the entries as user-supplied text — legally cleaner as to Google's terms, but data quality is poor.

Mapbox terms are comparatively permissive for display but have their own caching and derived-data restrictions; check the specific plan. Mixing Google-sourced content onto a Mapbox basemap is the specific combination to avoid.

**Cost:** ~1–2 dev weeks to restructure the import to `place_id`-only plus a matching layer. **Do this before the import feature has real usage,** because migrating a populated user-generated database off non-compliant stored content is far worse than building it right.

---

## Accessibility (European Accessibility Act)

Directive (EU) 2019/882, transposed in Portugal by **`Decreto-Lei n.º 82/2022`**, applicable to services placed on the market from **28 June 2025**. E-commerce services — which includes an app selling digital content to consumers — are in scope. The standard in practice is **EN 301 549**, which maps to **WCAG 2.1 level AA**.

**Microenterprise exemption:** the EAA exempts microenterprises (<10 employees **and** ≤€2M annual turnover or balance-sheet total) **that provide services**. The exemption does **not** apply to microenterprises placing *products* on the market. NomNom provides a service, so **at launch it is very likely exempt.**

Two cautions. First, the exemption evaporates the moment you hit 10 employees or €2M — and retrofitting accessibility into a mature UI is one of the more expensive kinds of technical debt (~€10–30k, plus design rework). Second, the exemption is from the Act; it is not a shield against discrimination claims or against Apple's and Google's own accessibility review.

**Recommendation:** do not run a formal EAA compliance programme now. Do enforce the cheap basics from day one — semantic HTML, proper labels on every input, 4.5:1 contrast, keyboard navigability, `Dynamic Type` / text-scaling support, meaningful `alt` text on restaurant photos, and screen-reader labels on icon-only buttons. These cost near-zero at build time and are most of WCAG AA.

---

## Enforcement precedent: review and discovery platforms

**AGCM (Italy) v Trustpilot — €4,000,000, 23 March 2026.** Tier 1, read from the AGCM press release (PS12962), corroborated by Alliance News and Antitrust Intelligence.

The Italian competition authority fined Trustpilot Group Plc, Trustpilot A/S and Trustpilot S.r.l. €4M for unfair commercial practices under arts. 20, 21, 22 and 23(1)(bb-ter) of the Italian Consumer Code. Findings:

1. **Inadequate checks on review authenticity**, including for reviews Trustpilot itself labelled "verified".
2. **Paid review-collection services let businesses choose which customers get review invitations**, skewing the representativeness of displayed ratings.
3. **Failure to give consumers adequate access to information** about how the platform works and about businesses' use of paid services.
4. **Dark-pattern interface design** compounding the above.

The fine was calibrated on the wide diffusion of the conduct and 2024 revenues. Trustpilot has said it will appeal.

**This is the most directly analogous precedent in this document, and it should shape product decisions.** NomNom is a ratings-and-discovery platform that intends to sell **sponsored placements** and to host **paid creator content**. Every one of AGCM's four findings maps onto a decision NomNom is about to make:

- If sponsored placements affect ranking or visibility, that must be **disclosed clearly** — this is also EU Omnibus Directive art. 7(4a) UCPD territory (paid-ranking disclosure), which applies regardless of size.
- If NomNom ever displays aggregate ratings, it must state **what steps it takes to verify** that reviews come from people who actually visited (Omnibus art. 7(6) UCPD — a trader indicating that reviews are from consumers who used the product must disclose how that is checked).
- Selective solicitation of positive reviews — including any future "ask your happy users to rate this" feature — is precisely what got Trustpilot fined.
- Interface friction around disclosure is treated as an aggravating factor.

Note the mechanism: this was a **national consumer authority using the UCPD**, not a DSA action. There is **no micro/small exemption from the UCPD.** So this exposure exists for NomNom from day one.

---

## Minimum viable compliance at launch

Concrete, ordered by risk-adjusted priority. Everything here is buildable in roughly 3–5 developer-weeks plus ~€10–20k of legal and tax input.

**Before public launch (UGC live, no payments):**

1. **Report button on every UGC surface** with confirmation-of-receipt and decision notification (DSA art. 16).
2. **Statement-of-reasons template** sent on every removal/suspension (DSA art. 17).
3. **Published contact point** — a monitored email, declared for authorities and users, languages stated (DSA arts. 11–12).
4. **DSA-compliant T&Cs and content policy in Portuguese and English** (DSA art. 14) — includes the moderation-tools disclosure.
5. **Privacy policy, art. 30 records of processing, and a written DPIA** covering location + social graph + analytics.
6. **Cookie/tracker consent gate with equally prominent reject; PostHog fires only post-consent.** Separate push-notification opt-in.
7. **Signed DPAs** with Supabase, PostHog, Sentry, Resend, Mapbox.
8. **Data export and account deletion** self-service (GDPR arts. 15, 17, 20).
9. **72-hour breach runbook** — one page, named owner.
10. **Sponsored-content labelling system**: schema field, pre-content "Publicidade" label, creator declaration at publish.
11. **Google Maps import restructured to `place_id`-only** with details re-fetched or matched to your own venue records.
12. **MAU counting** capability (DSA art. 24(3)).

**Before the first paid transaction — do not ship payments without these:**

13. **VAT deemed-supplier design signed off by a Portuguese tax adviser**; Union OSS registration; VAT charged at buyer's rate on gross; compliant invoices.
14. **Withdrawal-rights checkout flow**: two separate express consents, timestamped and stored, plus durable-medium confirmation.
15. **Subscription cancellation in-app**, no harder than signing up; renewal reminders.
16. **Creator onboarding capturing NIF, activity status, art. 53 VAT status, withholding status**; correct retenção na fonte logic; Stripe Connect Express with hosted KYC; **re-enable Stripe webhooks**.
17. **Trader-data schema built** (name, address, contact, payment account, registration) even though DSA art. 30 is exempted today.
18. **App-store payment decision made with a modelled P&L** — recommendation: web-first for paid content.

**Explicitly deferred (documented, with a trigger):** DSA art. 15 transparency reports; DSA arts. 20–28; DSA arts. 30–32 enforcement; formal EAA programme. Trigger for all: crossing 50 staff / €10M, or 10 staff / €2M for EAA. Put a calendar reminder against headcount and revenue milestones.

---

## Full compliance at scale

Triggered on crossing the micro/small thresholds (50 employees / €10M) — with the DSA's 12-month grace period under art. 19(2):

- **Internal complaint-handling system** (art. 20) with defined SLAs and human review.
- **Out-of-court dispute settlement** referral and cooperation (art. 21).
- **Trusted flagger** priority handling (art. 22).
- **Anti-abuse measures** — suspension policy for frequent providers of illegal content and frequent submitters of unfounded notices (art. 23).
- **Annual transparency reports**, published (arts. 15, 24).
- **Advertising repository and per-ad transparency** (art. 26) — directly relevant given sponsored placements.
- **Recommender-system parameter disclosure** (art. 27).
- **Minors protection** — no profiling-based ads to minors (art. 28).
- **Trader traceability with verification** (art. 30), compliance by design (art. 31), consumer information on illegal products (art. 32).
- **EAA conformity**: WCAG 2.1 AA, published accessibility statement, conformity documentation.
- **DPO appointment** if large-scale systematic monitoring is reached (GDPR art. 37).
- **DAC7 reporting** if commissioned/custom creator work has been introduced.
- Full VAT compliance across all member states via OSS with proper evidence of customer location (two non-contradictory pieces of evidence).

---

## Regulatory Risk Assessment: **Medium**

**Not Low**, because three distinct obligations bite from the first euro of revenue and each has a material cost of being wrong:

1. **VAT deemed-supplier status** is irrebuttable given NomNom's control over T&Cs, charging and delivery. Unremitted VAT accumulates silently across every member state, cannot be recovered from creators retrospectively, and carries interest. This is a quiet, compounding liability rather than a dramatic one — which is exactly what makes it dangerous for a small team.
2. **App-store commission** is not a compliance risk but a **commercial** one, and it is the risk most likely to invalidate the business model rather than merely cost money. A 15–30% cut on gross, stacked on top of VAT and NomNom's own take, can leave nothing for the creator.
3. **The Google Maps import feature as described is likely outside Google's terms**, and the sanction — API termination — is feature-fatal and gets worse the longer it runs.

**Not High**, because:

- The DSA exemptions are real and substantial: NomNom escapes arts. 15, 20–28 and 30–32 entirely at launch. What remains (arts. 11–14, 16–18) is a genuinely modest build.
- Portugal has **no dedicated influencer statute** and no case law applying `Cód. Publicidade` art. 36 to a UGC platform for third-party creator content. DGC's enforcement is influencer-directed, its stated posture is preventive, and compliance rates are rising.
- CNPD is resource-constrained and not conducting proactive sweeps of small consumer apps.
- The microenterprise EAA exemption applies.
- Nothing here requires a licence, an authorisation, or a regulated entity. There is no gate to entry — only obligations to discharge.

**The risk profile is asymmetric in a useful way:** the compliance obligations are cheap and tractable, while the *commercial* regulatory constraints (app-store fees, VAT on gross) are expensive and structural. Spend the effort on modelling the money, not on fearing the regulator.

**Sequencing that materially lowers risk:** launch UGC-only with the DSA and GDPR basics in place; validate paid creator content **on web**; only then decide on iOS. This defers the two expensive unknowns until you have revenue data to decide with.

---

## Where you need a lawyer, not more research

Five items. Everything else in this document can be actioned from what is written here.

1. **VAT structuring for the creator marketplace — a Portuguese tax adviser, before the first paid list ships.** The art. 9a deemed-supplier analysis is clear in outline but the implementation (OSS registration, invoice flows, creator self-billing, the treatment of the commission, customer-location evidence) is detailed and expensive to unwind. Highest-value professional spend in this document. Budget ~€2–5k.

2. **Creator payout mechanics and withholding — the same adviser, same engagement.** Whether NomNom is the withholding agent, at what rate, per creator status; whether self-billing is viable; what documentation the AT expects. NomNom carries liability for tax it should have withheld and did not.

3. **DAC7 scope confirmation.** My reading is that pre-made digital lists fall outside both "goods" (tangible only) and "personal services" (task-based, at a user's request). Confidence Medium. Get a written view, and re-open it before launching any commissioned or custom-content feature.

4. **Whether NomNom's own liability under `Cód. Publicidade` art. 36 extends to undisclosed sponsorship inside third-party creator lists.** The statute names the `titular do suporte publicitário` as a co-perpetrator with no safe harbour and no size threshold, but there is no found precedent applying it to a UGC platform, and the interaction with the DSA/DL 7/2004 hosting safe harbour is unresolved. A Portuguese advertising/consumer lawyer can scope this in a couple of hours and tell you how much moderation is enough.

5. **Consumer-law review of the checkout and cancellation flows** before payments go live — specifically the digital-content-versus-service characterisation for Snapshot and Subscription, which determines whether art. 16(m) or art. 16(a) CRD applies and therefore whether the withdrawal waiver actually works. The Trustpilot decision shows how closely interface design is now being read.

**Not worth a lawyer:** the DSA micro/small build (well-defined, do it yourself from the checklist above); the DPIA (template-driven); cookie consent (a solved problem); the EAA (exempt); Google Maps terms (an engineering decision, not a legal one — just comply).

---

## Source Quality Assessment

| Claim | Source | Tier | Date |
|---|---|---|---|
| `Cód. Publicidade` art. 8 identifiability; art. 34(1)(a) fines €1,750–€3,750 / €3,500–€45,000; art. 36 co-perpetrator incl. `titular do suporte publicitário`; art. 30 joint & several civil liability | Diário da República, consolidated DL 330/90 (as amended by Lei 30/2019); cross-checked PGDLisboa | 1 | consolidated, current 2026 |
| DGC guide "A Publicidade e o Marketing de Influência", updated edition; #Pub at start of publication | DGC (Direção-Geral do Consumidor) guide PDF | 1 | Oct/Nov 2025 |
| DGC Oct 2025 sweep: 417 contents, 10 influencers, 43 brands, 90% compliance, 1 infringement indication | DGC via press; NOVA Consumer Lab analysis | 1/2 | Nov 2025 |
| No dedicated PT influencer statute; only gambling-advertising bills PJL 219–222/XVII | Assembleia da República, parlamento.pt | 1 | XVII leg., 2025–26 |
| DSA art. 19(1) exempts micro/small from arts. 20–28; art. 24(3) carved back in; art. 19(2) 12-month tail | EUR-Lex, Reg. (EU) 2022/2065 consolidated text | 1 | in force |
| DSA art. 15(2) exempts micro/small from transparency reports | EUR-Lex, Reg. (EU) 2022/2065 | 1 | in force |
| DSA art. 29(1) exempts micro/small marketplaces from arts. 30–32; art. 3(f) trader, 3(l) marketplace definitions | EUR-Lex, Reg. (EU) 2022/2065 | 1 | in force |
| `Lei n.º 12-A/2026` — PT DSA implementation; ANACOM as DSC; art. 20 fines 1%/6% of worldwide turnover, halved for negligence; arts. 2–4 compliance orders; appeals to TCRS | Diário da República 1.ª série n.º 73, primary text read directly; PwC Portugal legal flash | 1 (+2) | 15 Apr 2026, in force 20 Apr 2026 |
| VAT: platform is deemed supplier of electronically supplied services; irrebuttable where it authorises the charge, authorises delivery, or sets T&Cs | EUR-Lex, Council Implementing Reg. (EU) 282/2011 art. 9a, consolidated | 1 | consolidated to 01.07.2021 |
| CJEU upheld validity of art. 9a | Fenix International, C-695/20; BDO, Baker McKenzie, Simmons & Simmons analyses | 1 (+2) | 28 Feb 2023 |
| DAC7 "Goods" = tangible property; "Personal service" = time/task-based work at a user's request | EUR-Lex, Council Dir. (EU) 2021/514, Annex I definitions | 1 | in force |
| PT creator tax: Categoria B; art. 115 CIRS invoicing; art. 53 CIVA €15k threshold (DL 35/2025); 23% withholding; art. 101.º-B exemption | Doutor Finanças, CGD, Santander, Cegid Vendus (all citing CIRS/CIVA articles) | 2/3 | 2025–26 |
| Withdrawal right for digital content — three cumulative conditions | Directive 2011/83/EU art. 16(m); art. 10 (12-month extension) | 1 | in force |
| Service-vs-digital-content characterisation nuance | CJEU PE Digital, C-641/19 | 1 | 8 Oct 2020 |
| ePrivacy consent in Portugal | `Lei n.º 41/2004` art. 5; Directive 2002/58/EC | 1 | in force |
| DPIA mandatory criteria — location tracking, profiling, systematic monitoring | GDPR art. 35(3); WP248 rev.01 criteria; national DPA lists | 1 | in force |
| CNPD resource constraints, limited enforcement output | Portuguese press / legal commentary | 2 | 2025 |
| AGCM v Trustpilot, €4M, unfair commercial practice, dark patterns, review authenticity | AGCM press release PS12962 (IT and EN); Alliance News/MarketScreener; Antitrust Intelligence | 1 (+2) | 23 Mar 2026 |
| Google Maps Platform: no storing Content; `place_id` indefinite; lat/lng ≤30 days | Google Maps Platform Terms of Service §3.2.3–3.2.4 | 1 | current |
| Apple 3.1.1 IAP requirement; 3.1.3(d) one-to-one real-time carve-out | Apple App Review Guidelines | 1 | current |
| Apple EU DMA fee structure: ~2% initial acquisition, 5%/13% store services, ~5% Core Technology Commission | Apple EU business terms; developer press analysis | 1/2 | 2025–26, **volatile** |
| Google Play 15% first $1M, 15% subscriptions; EEA alternative billing with ~3–4pp reduction | Google Play developer policy / help centre | 1 | current |
| EAA transposed by `DL 82/2022`; services from 28 June 2025; microenterprise service exemption (<10 staff, ≤€2M) | Directive (EU) 2019/882 art. 4(5); `DL 82/2022` | 1 | in force 28 Jun 2025 |
| Stripe Connect KYC; Express hosted onboarding; platform liability for negative balances | Stripe Connect documentation | 1 | current |

---

## Data Gaps

1. **Apple's exact EU fee percentages as at July 2026.** Apple's EU business terms have been revised repeatedly under Commission enforcement, and secondary sources disagree on current tiers. The structure (acquisition fee + store services fee + Core Technology Commission) is well-attested; the numbers are not stable enough to plan against from a summary. **Confidence: Medium on structure, Low on exact rates. Verify directly on Apple's EU developer terms page at implementation time.** Do not treat the 10–20% all-in figure in this document as a planning input without re-checking.

2. **Whether `Cód. Publicidade` art. 36 has ever been applied to a UGC platform for undisclosed sponsorship inside third-party user content in Portugal.** Three query variations found no case law, no DGC decision, and no academic treatment of this specific question. The statutory text plainly covers the medium-holder; the practical enforcement posture is unknown, as is the interaction with the DSA/DL 7/2004 hosting safe harbour. **DATA GAP. Confidence: Low. Needs qualified legal advice.**

3. **Whether off-the-shelf creator digital content falls within DAC7 "Relevant Activities".** The directive's definitions appear to exclude it — "Goods" is tangible-only, "Personal service" requires task-based work at a user's request — but no guidance, FAQ or national interpretation addresses pre-made digital content sold to many buyers on a creator marketplace. **Confidence: Medium. Needs tax advice.**

4. **CNPD's current published mandatory-DPIA list and whether consumer-app foreground geolocation for a user-requested feature falls inside the "indispensable to a requested service" carve-out.** The general criteria are clear; CNPD's specific current list and its application to this fact pattern were not conclusively pinned to a primary CNPD publication. Recommendation stands regardless: do the DPIA. **Confidence: Medium.**

5. **Whether a hosted, continuously-accessible creator list is "digital content" or a "service" under the CRD.** This determines whether art. 16(m) or art. 16(a) governs the withdrawal waiver, and PE Digital (C-641/19) pushes toward "service" for access-based products. No directly on-point authority found for creator-marketplace content. **Confidence: Medium. Needs consumer-law advice before payments launch.**

6. **Portuguese-specific guidance on platform obligations for sponsored *ranking* disclosure** (UCPD art. 7(4a) as transposed by `DL 57/2008`) in the specific context of a restaurant discovery app. General EU obligation is clear; Portuguese enforcement practice for this specific pattern was not found. **Confidence: Medium.** Comply with the general rule; it is unambiguous.

7. **No enforcement precedent found for `Lei n.º 12-A/2026`** — it has been in force for three months and ANACOM has not yet built a visible track record as Digital Services Coordinator. How aggressively it will supervise small domestic platforms is genuinely unknown. **Confidence: Low on enforcement posture; High on the text of the obligations.**
