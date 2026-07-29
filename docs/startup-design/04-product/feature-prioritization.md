# Feature Prioritisation — NomNom Spearhead

**Phase:** 6 — Product  
**Date:** 26 July 2026  
**Method:** RICE (Reach = Lisbon beachhead users/quarter affected) + MoSCoW tags

---

## RICE table

| Feature | R | I | C | E (person-mo) | RICE | MoSCoW |
|---|---|---|---|---|---|---|
| Remotion/dynamic OG for list share | 2000 | 3 | 0.8 | 0.5 | **9600** | Must |
| Share analytics (open/activate) | 2000 | 2 | 0.8 | 0.25 | **12800** | Must |
| Vote/veto on auth-free list | 800 | 3 | 0.7 | 0.75 | **2240** | Must |
| Roulette from shared list polish | 800 | 2 | 0.8 | 0.5 | **2560** | Must |
| Single-player saves + empty-state fix | 1500 | 3 | 0.9 | 0.5 | **8100** | Must |
| Creator pre-seed admin / claim flow | 500 | 3 | 0.8 | 0.75 | **1600** | Must |
| Maps import “as been” hygiene | 400 | 2 | 0.6 | 1.0 | **480** | Should |
| Snapshot checkout re-enable | 200 | 2 | 0.5 | 1.0 | **200** | Should |
| Sponsored item + disclosure UI | 100 | 2 | 0.6 | 0.5 | **240** | Should |
| Follow graph / Circle growth | 1000 | 1 | 0.4 | 1.5 | **267** | Could |
| Reel auto-capture accuracy | 600 | 1 | 0.4 | 2.0 | **120** | Could |
| Locals-eat-here badge | 300 | 2 | 0.3 | 2.0 | **90** | Won’t (now) |
| Booking integration | 500 | 1 | 0.3 | 3.0 | **50** | Won’t |
| Paid ads tooling | 0 | 0 | — | — | 0 | Won’t |

*Reach/Impact are `[Assumption]` planning numbers for sequencing, not forecasts.*

---

## Dependencies
```
Analytics ← OG share (instrument the link)
Vote/Roulette ← auth-free list stability
Creator claim ← pre-seed tooling
Snapshot ← Stripe webhooks + VAT posture
Sponsored UI ← disclosure legal review
Locals badge ← density + BRAND criterion
```

---

## Build order (recommended)
1. Analytics + OG share  
2. Empty-state / single-player saves  
3. Vote/veto + Roulette polish on public list  
4. Creator pre-seed + claim  
5. Maps import hardening  
6. Snapshot (only if interviews or strong fake-door)  
7. Sponsored placement UI  

---

## Flags

**Yellow:** RICE will tempt “Circle” because Reach looks high — Confidence is low; defer.  
**Red:** Shipping Snapshot before share loop measures vanity revenue.

## Sources
`04-product/mvp-definition.md`, `02-strategy/go-to-market.md`
