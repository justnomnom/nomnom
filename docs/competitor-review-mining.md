# Competitor review mining — what people hate about the alternatives

**Date:** 25 July 2026
**Method:** Web research across App Store / Google Play review aggregators, Trustpilot, Google Maps
community forums, Reddit/Substack commentary and Portuguese press round-ups. Direct scraping of
App Store / Play / Trustpilot was blocked by the network policy, so quotes below come through
search-engine extraction of those pages — treat individual quotes as indicative, and re-verify a
complaint before betting a quarter on it.
**Purpose:** Turn competitors' 1–2 star reviews into a build backlog for NomNom.

---

## 1. The competitive set

NomNom sits at the intersection of three markets, and the credible competitors differ in each.

| Bucket | Who | Why they matter to us |
|---|---|---|
| **Social restaurant lists** (closest to us) | Beli, Mapstr, Truffle, Savor, Crumble, World of Mouth, Rex, Someday Map, Drawer | Same job-to-be-done: keep and share spots, discover through people |
| **Portugal incumbents** | TheFork, Tripadvisor, Mygon, DIG-IN, Time Out / NiT / Lifecooler guides | Own the "where do I eat in Lisbon" query today |
| **The real default** | Google Maps saved lists, Instagram/TikTok saved posts, WhatsApp screenshots | What ~everyone actually uses. The biggest competitor is a Saved folder |

Beli is the sharpest product analogue but is US-centric — its recurring database complaints are about
US and China coverage, and there is no evidence of meaningful Lisbon/Porto depth. That is our opening.

**Zomato is gone from Portugal.** The Portuguese press round-ups still cite it (~700k downloads,
18k restaurants) but Zomato exited all international markets in 2021 and liquidated
*Zomato Media Portugal, Unipessoal Lda* on 21 July 2023, the filing noting it had no active
operations. Treat the download figure as legacy. There is an orphaned Portuguese user base here,
and a cautionary tale worth using in our own copy: platforms leave, and take your saved places with
them.

**The social-list field got crowded in 2025–26.** Beyond Beli and Mapstr: Nomblr, Feast, Shareables,
Savor, Crumble, and Resy's shareable lists. **Nomblr** deserves a look — "a shared place to keep
restaurant recommendations from people you trust", private-first tracking with "trusted crews" — that
is close to our positioning *and* close to our name. Worth a trademark/SEO check before the next
brand push.

---

## 2. Top complaints, by competitor

### Google Maps lists — the incumbent, and it's leaky
The most useful pile of complaints we found, because these are users who already do our job manually.

- **300-item cap per list**, and when it overflows it deletes saved places *at random*, not oldest-first.
- **Places silently disappear**; lists "zero out"; saved places fail to sync between mobile and desktop.
- **Notes are destroyed** when you remove a place from a list.
- **No "want to go" vs "been"** state — users maintain two lists and move pins by hand.
- **No per-place comments on shared/group lists** — collaboration is a dead drop, not a conversation.
- **Saved places don't surface in normal search** unless you go into the list first.
- Representative sentiment: *"I love lists on Google Maps with all my heart, but lord oh lord do they suck."*

### Beli (closest social competitor)
- **Referral wall on a basic feature** — average score is gated behind referring a friend; users call it
  an *"MLM vibe"*.
- **Database gaps** — missing restaurants aren't added promptly; wrong locations even when the correct
  address is supplied; whole categories (e.g. ice-cream shops) absent.
- **No context beyond the venue's own website** — no outward links, so users bounce to Google anyway.
- **Ranking apples against oranges** — forced pairwise comparison of a Korean BBQ against a brunch spot
  feels wrong and makes scores unstable.
- **Rating miscalculation bugs** reported as making the app *"impossible / not worth it to use"*.
- **Photos attached to rankings get dropped**.
- **Spam** — one user reported "a half dozen spam marketing text messages" after signing up.
- Roughly a third of analysed reviews register a negative experience despite the high headline rating.

### Mapstr
- **Hard paywall on volume** — 300 saved places free, then ~$80/yr; users are angry that previously free
  features moved behind Plus.
- **Subscription resentment** — repeated requests for a one-time purchase instead.
- **Bad place data** — wrong coordinates, wrong addresses, wrong restaurant names on saved pins.
- **Photo order scrambles** on its own.
- **Learning curve** — "kinda hard to learn how to use".

### TheFork (the Portugal incumbent)
Consumer side:
- **Bookings that don't exist on arrival** — confirmed reservations at restaurants that were closed, or
  simply not in the restaurant's book.
- **Silent cancellations** — reservations cancelled with no notification and no way to rebook.
- **Data corruption with real consequences** — a party of 2 became a party of 20.
- **Yums loyalty pain** — accounts locked on redemption, users accused of fraud.
- **Support is the top theme** — "awful" customer service, complaints unanswered, discount codes not honoured.

Restaurant side (relevant to our creator/venue monetisation):
- **Incorrect invoices**, billing continuing after contract cancellation, charges for no-shows.
- **Termination requests ignored** while sales tries to upsell.

### Tripadvisor / Google reviews (the trust layer)
- **Fake-review contamination is now structural**: ~10.7% of Google reviews estimated fake (highest of the
  majors), Yelp ~7.1%, Tripadvisor ~5.2%; Google removed 292M policy-violating reviews in 2025;
  AI-generated Tripadvisor reviews up 137% 2019→2024; coordinated campaigns projected at 35–40% of review
  fraud volume in 2026.
- Diners no longer trust instinct *or* the platforms — they cross-check across several before committing.

### World of Mouth
- **Curation is seen as influencer theatre** — "more about being seen than having a great meal",
  "faux friend envy over flavour and history", chef-endorsement lists distrusted.
  A live warning for our creator surfaces.

### Instagram / TikTok saves (the true default behaviour)
- **Saved content is never revisited** — the platforms have no mechanism to bring you back.
- **Saves are buried two taps deep**; many users forget the folder exists.
- **No location filter** — TikTok bookmarks were built for rewatching, not for planning a Saturday.
- An entire cottage industry (Someday Map, Drawer, Rtriv, Stasht) exists purely to bulk-import
  Instagram/TikTok saves into a map. That demand is proven and currently under-served in Portugal.

---

---

## 2b. Second pass — complaint themes the first pass missed

### Permission overreach and privacy
NowSecure's risk profile for Beli iOS lists requests for **contacts, always-on location, foreground
location, microphone, and photo library**, with a noted discrepancy between the declared and actual
component declarations. For an app whose entire premise is "trust me over the algorithm", the
permission sheet is the first trust test — and Beli fails it before a user has saved anything.
*For us: ship with the smallest permission set that works, ask in context rather than at launch, and
say why. It is a genuine differentiator that costs nothing.*

### Onboarding is a chore — and the import is half-built
The complaint worth the most to us: setup is described as "a chore", with users specifically asking
to import their Google Maps lists **and reviews as "been"**, not only as want-to-go. Every importer
in the category dumps everything into one undifferentiated pile.
*This changes the plan: the importer must carry visited state, not just the pin. See idea 15.*

### Social pressure and performative logging
Beli's named downside is "high social pressure". Commentary on the category is blunter: *"Social
pressure corrupts honesty: you're writing for the owner, not yourself"* and *"performance anxiety
kills detail — you're curating an image, not documenting taste."* The invite-only scarcity that
built Beli's cultural capital is the same mechanism that makes people post for an audience.
*For us: private-by-default saves and notes, with sharing as a deliberate act. A "just for me" note
field that never goes public would be a real feature, not an absence of one.*

### Notification spam
Mass duplicate notifications after a glitch (20+ for the same event) recur in app reviews across the
category, and Google's constant "review this place" prompts generate their own support threads from
users trying to switch them off.
*For us: digests over per-event pushes, per-list mutes, and a genuinely granular preferences screen.
The `notification_mutes` and `notification_preferences` tables already exist — the discipline is in
what we choose to send.*

### Subscription cancellation traps
A recurring pattern across paid food apps: deleting your account does **not** cancel the
subscription; cancel controls that are small and greyed-out so users believe they cancelled when
they did not; refund denials.
*Directly relevant — we run Stripe subscriptions and Snapshot purchases. Self-serve cancellation in
one screen, account deletion that cancels billing, and a plain confirmation email. `BRAND.md`
already mandates plain, non-playful billing copy; this is the behavioural half of the same promise.*

### Review bombing and extortion (venue side)
Restaurants report coordinated one-star campaigns and gift-card ransom threats tied to review
manipulation. Warning signs cited: one-star reviews with no text, generic wording, references to
menu items the restaurant does not serve.
*Relevant the moment reviews carry weight on our side. Named, followed humans are structurally
harder to bomb than anonymous crowd ratings — that is a defensible position worth stating.*

### Rankings that surface tourist traps
The Lisbon-specific failure of the incumbents. Tripadvisor's rankings route visitors to exactly the
places locals name as traps, and the standing local advice is heuristic, not algorithmic: menus in
Portuguese only, tascas away from the tourist districts, full of locals at lunch, handwritten daily
menu.
*Those heuristics are encodable. A "locals eat here" signal — derived from who saves a spot and how
often, not from tourist review volume — is the most Portugal-specific product idea in this document
and the hardest for TheFork or Tripadvisor to copy.*

---

## 3. Cross-cutting themes

1. **Data quality is the #1 churn driver.** Every list app is hated for wrong addresses, missing venues,
   and silently deleted saves. Nobody's differentiator is "the data is right" — that's available.
2. **Paywalls placed on the core loop backfire.** Beli's referral gate and Mapstr's 300-place cap generate
   the loudest reviews. Gate depth and creator features, never storage of your own saves.
3. **Trust is the open wound.** Fake reviews on the big platforms, influencer-theatre distrust on the
   curated ones. Our "real people, named sources" positioning is aimed exactly here — but only if the
   provenance is visible in the UI, not just in marketing.
4. **Saving is solved; returning is not.** Nobody has cracked "you saved 200 spots, here's the one for
   tonight". That's the strongest wedge, and Roulette is already half of it.
5. **Sharing is one-directional everywhere.** No competitor supports real conversation on a shared list.
6. **Support failure compounds product failure.** TheFork's worst reviews are about no one replying.

---

## 4. Ideas to implement, ranked

Marked against what already exists in the repo.

### Tier 1 — direct answers to the loudest complaints

**1. "Been" vs "want to go" as first-class state on every saved spot**
Google Maps' most-requested missing feature; users hand-maintain two lists. We have lists and a saved tab
— add a binary visited flag with filtering, plus a "date last visited" so Roulette can prefer new spots.
*Answers: Google Maps' #1 complaint.*

**2. Never lose a save — and say so**
No caps, no random eviction, notes preserved when a spot moves or leaves a list, plus an explicit
"nothing you save is ever deleted" line on the pricing page. Direct contrast with Maps' random deletion
and Mapstr's 300-place cap.
*Cheap to guarantee, and it's a marketing asset.*

**3. Instagram / TikTok save importer**
We already ship `google-maps-import-modal.js` + `google-maps-import-actions.js`. The bigger pool is the
Instagram Saved folder — share-sheet ingest of a Reel/TikTok, parse the venue, match to a restaurant,
drop it in a list. Someday Map, Drawer, Rtriv and Stasht all exist purely for this; none does Portugal well.
*Biggest new-user acquisition wedge and a natural creator tie-in.*

**4. Comments and reactions on shared list items**
Explicitly absent from Google Maps group lists. On a collaborative NomNom list, let people reply per spot
("go for the tasting menu, skip the wine pairing"). Turns a list into a thread.
*Retention + a reason to invite friends.*

**5. Report/fix a spot, visibly resolved**
Beli and Mapstr both bleed reviews over wrong addresses and missing venues that never get fixed. Ship a
one-tap "this is wrong / this closed" on the restaurant page, an admin queue, and a notification back to
the reporter when it's fixed. The feedback loop is the feature — TheFork's worst reviews are silence.

### Tier 2 — trust and differentiation

**6. Provenance chips on every recommendation**
Show *who* and *when* on each card — "saved by 3 people you follow", "from @handle's list, May 2026".
Beli, Tripadvisor and World of Mouth are all distrusted for opaque or influencer-driven ranking; visible
sourcing is our brand promise made literal.

**7. Label paid/gifted creator picks**
World of Mouth's criticism is that curation is marketing in disguise. A mandatory disclosure badge on any
sponsored or comped pick is a genuine moat against the incumbents and cheap insurance for us.

**8. Ranking without forced apples-to-oranges**
Beli's pairwise comparison is a top complaint. If we ever add ranking, rank *within a category or occasion*
(brunch vs date night vs tasca) rather than one global ladder — and let people rank only when they want to.

**9. Never paywall your own data**
Keep unlimited saves and lists free; monetise creator tooling, Snapshot, analytics and discovery depth.
Mapstr's retrofitted paywall is its most-cited grievance.

### Tier 3 — the "return to your saves" wedge

**10. Resurface saved spots**
"You saved 47 spots and have been to 6." A weekly nudge, or a Roulette mode restricted to saved-but-unvisited
spots near you. Directly attacks the "saved content is never revisited" failure that defines Instagram,
TikTok and Google Maps alike.

**11. Group decision mode**
Multi-person Roulette / shortlist voting for "where are we eating tonight". Nobody in the set does group
decision-making; every list app stops at the list.

**12. Offline-safe and shareable outside the app**
A public list URL that works without an account and reads well when pasted into WhatsApp — we already have
`/lists/:id` and `/u/:handle` public routes, so this is polish on the OG/preview layer plus a
copy-as-text option for group chats.

### Tier 4 — commercial notes

**13. If venue-side billing ever lands, over-invest in billing hygiene.** TheFork's restaurateur reviews are
almost entirely invoicing and cancellation failures. Self-serve cancellation, clear invoices, no charges
after termination.

**14. Support SLA as a feature.** "We answer within 24 hours" is a differentiator in this category — the
bar is on the floor.

### Tier 5 — from the second pass

**15. Imports must carry visited state.** The single most actionable line in the research: users ask
to import Google Maps lists *and reviews as "been"*, not just as want-to-go. Our Google Maps
importer already exists and the visited feature is planned — wire them together at build time
rather than shipping the same undifferentiated pile every competitor ships.

**16. Private notes that never go public.** Directly answers the "social pressure corrupts honesty"
critique. A note field on a saved spot that is visibly, permanently viewer-only lets people record
what they actually thought. Nobody in the set offers this credibly.

**17. Minimal permissions, asked in context.** No contacts access, no always-on location, no
microphone. Ask for foreground location at the moment the map or Roulette needs it, with a one-line
reason. Then say so on the marketing site — Beli's permission sheet is a live liability.

**18. Cancellation that actually cancels.** One-screen self-serve cancellation, account deletion
that also ends billing, confirmation email. Prevents the single most damaging review category for
any paid app.

**19. Notification restraint by default.** Digest over per-event, per-list mute, granular
preferences. The tables exist; the discipline is a product decision.

**20. A "locals eat here" signal.** The Portugal-specific wedge. Encode what locals actually use as
heuristics — saved by residents rather than visitors, Portuguese-language menu, off the tourist
grid — into a visible badge or filter. Tripadvisor's ranking sends people to the traps; this is the
inverse, and it is not something a booking platform can bolt on.

---

## 5. What we already have going for us

- Public list and profile routes without auth — Beli and Mapstr are app-walled.
- Roulette — no competitor solves decision fatigue.
- Google Maps import — the migration path off the leakiest incumbent.
- Portugal depth — Beli's coverage complaints are US/China; the PT incumbents (TheFork, Tripadvisor) are
  booking and review platforms, not people-first discovery.
- Named, human provenance as the core brand promise, at the exact moment fake reviews hit ~10% of Google.

---

## Sources

- [Beli — App Store ratings & reviews](https://apps.apple.com/us/app/beli/id1478375386?see-all=reviews&platform=ipad)
- [Beli reviews — JustUseApp](https://justuseapp.com/en/app/1478375386/beli/reviews)
- [Beli — ComplaintsBoard](https://www.complaintsboard.com/beli-b148404/reviews)
- [Beli (app) — Wikipedia](https://en.wikipedia.org/wiki/Beli_(app))
- [Mapstr reviews — JustUseApp](https://justuseapp.com/en/app/917288465/mapstr-save-follow-places/reviews)
- [Mapstr — App Store ratings & reviews](https://apps.apple.com/us/app/mapstr-save-follow-places/id917288465?see-all=reviews)
- [TheFork — Trustpilot](https://www.trustpilot.com/review/thefork.com)
- [TheFork — Trustpilot (UK)](https://uk.trustpilot.com/review/thefork.com)
- [TheFork reviews — JustUseApp](https://justuseapp.com/en/app/424850908/thefork-restaurants-bookings/reviews)
- [TheFork — Northern Portugal forum, Tripadvisor](https://www.tripadvisor.com/ShowTopic-g189169-i597-k14428354-TheFork-Northern_Portugal.html)
- [Google Maps saved places / lists: various problems — Google Maps Community](https://support.google.com/maps/community-guide/255418980/google-maps-saved-places-lists-feature-various-problems?hl=en)
- ["I love Google Maps lists. They suck." — The Rectangle](https://therectangle.substack.com/p/i-love-google-maps-lists-they-suck)
- [6 best Beli alternatives — Crumble](https://crumble.me/guides/beli-alternatives)
- [12 best Beli app alternatives — Savor](https://www.savortheapp.com/blog/food-memories-journaling/beli-app-alternatives/)
- [World of Mouth — App Store](https://apps.apple.com/us/app/world-of-mouth/id1454663016)
- [World of Mouth thread — WineBerserkers](https://www.wineberserkers.com/t/world-of-mouth-app/305450)
- [Truffle: Restaurant Tracker — App Store](https://apps.apple.com/ca/app/truffle-restaurant-tracker/id1553919410)
- [Fake restaurant reviews: hospitality's open secret — Ground Up Projects](https://groundupprojects.co.uk/dispatch/the-fake-review-economy-hospitalitys-open-secret/)
- [Fake AI Tripadvisor reviews up 137% — Originality.AI](https://originality.ai/blog/ai-tripadvisor-reviews-study)
- [Google review statistics 2026 — WiserReview](https://wiserreview.com/blog/google-review-statistics/)
- [As melhores apps para descobrir restaurantes e bares em Portugal — E-konomista](https://www.e-konomista.pt/melhores-apps-para-descobrir-restaurantes-e-bares/)
- [Cinco apps para encontrar restaurantes — Jornal Económico](https://jornaleconomico.sapo.pt/noticias/cinco-apps-para-encontrar-restaurantes-que-vai-querer-instalar-328406/)
- [Someday Map](https://www.somedaymap.com/) · [Drawer](https://apps.apple.com/us/app/-/id582432085) · [Stasht blog](https://stasht.app/blog/how-to-save-recipes-from-instagram-and-tiktok) · [Rtriv](https://rtriv.io/en/blog/how-to-find-saved-posts)
- [Fixing Instagram's saved feature: a UX journey — Medium](https://medium.com/@somyakaushik0911/fixing-instagrams-saved-feature-a-ux-journey-33a3014fd9eb)

### Second pass

- [Beli iOS — NowSecure app risk profile](https://www.nowsecure.com/marc-app/beli-ios/)
- [An ode to Beli — The Harvard Crimson](https://www.thecrimson.com/article/2026/2/26/beli-inquiry/)
- [Best food review apps 2025 — Savor](https://www.savortheapp.com/blog/food-tracking-apps/food-review-app/)
- [Best list-sharing apps for foodies — Savor](https://www.savortheapp.com/blog/cuisine-location-guides/best-list-sharing-app-foodies/)
- [Nomblr — private restaurant tracking](https://nomblr.app/)
- [Feast — Food with Friends, App Store](https://apps.apple.com/us/app/feast-food-with-friends/id1612428783)
- [Resy launches shareable lists](https://blog.resy.com/newsroom/resy-launches-shareable-lists/)
- [Zomato starts liquidation of its Portugal business — Restaurant India](https://www.restaurantindia.in/news/zomato-starts-liquidation-of-its-portugal-biz.n21141)
- [Zomato liquidates Portugal subsidiary — MediaNama](https://www.medianama.com/2023/07/223-zomato-portugal-subsidiary-liquidation-2/)
- [Restaurants sound the alarm over review bombing — Restaurant Business](https://www.restaurantbusinessonline.com/technology/restaurants-sound-alarm-over-review-bombing)
- [Restaurant reputations held for ransom — National Restaurant Association](https://restaurant.org/education-and-resources/resource-library/restaurant-reputations-held-for-ransom/)
- [Getting out of free trials and auto-renewals — FTC Consumer Advice](https://consumer.ftc.gov/getting-out-free-trials-auto-renewals-negative-option-subscriptions)
- [6 hidden restaurants in Lisbon where you can eat with the locals — Devour Tours](https://devourtours.com/blog/lisbon-restaurants-locals-eat/)
- [Lisbon tourist traps to avoid — Gamin Traveler](https://www.gamintraveler.com/2025/10/23/tourist-traps-to-avoid-in-lisbon/)
- [Google keeps asking me to review restaurants — Android Central forum](https://forums.androidcentral.com/threads/google-keeps-asking-me-to-review-restaurants-and-stores-how-do-i-turn-this-crap-off.757052/)
