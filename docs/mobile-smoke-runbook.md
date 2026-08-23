# Mobile (Capacitor) per-release smoke runbook

Covers **TEST-PLAN.md §14**. Run this before every store submission (Android
`cap:android:release`, iOS archive) and after any change to the native shell,
`capacitor.config.ts`, `src/components/capacitor/*`, `src/libs/capacitor/*`, or
the safe-area / bottom-nav layout code.

The native shells are thin: both load the hosted Next.js app through
`server.url` (see [`capacitor.config.ts`](../capacitor.config.ts)), so most UI is
ordinary web behaviour at a phone viewport. That part is automated
(Part A). The genuinely native behaviours — process cold start, session
persistence across a real app kill, OS deep-link delivery, notch insets, Android
hardware back — cannot be exercised by a headless browser and are a manual
on-device pass (Part B).

For viewport widths, touch-target sizes, forms, theme and i18n spot-checks,
**reuse the "Viewports", "Touch & pointer", and "Forms" sections of**
[`qa-app-checklist.md`](./qa-app-checklist.md) rather than repeating them here —
this runbook only adds the Capacitor-specific scenarios.

---

## Coverage matrix

| §14 scenario | Automated (Part A) | Manual on-device (Part B) | Why |
|---|---|---|---|
| Cold start | — | ✅ B1 | Needs a real process launch + splash/StatusBar plugins |
| Auth persists across restart | — | ✅ B2 | Needs a real app kill + Supabase cookie survival in WKWebView/Chrome WebView |
| Deep link into restaurant/list | ⚠️ route renders at mobile viewport (A) | ✅ B3 | Web route is emulatable; OS link delivery + `appUrlOpen` is native |
| Safe-area on notched devices | ⚠️ `viewport-fit=cover` + `env()` wiring present (A) | ✅ B4 | Meta/CSS wiring is emulatable; actual inset rendering needs a notched device |
| Android hardware back | — | ✅ B5 | No browser equivalent for the `backButton` listener |

"⚠️" = the automated check proves the **prerequisite** (route resolves, meta/CSS
present) but not the on-device result; keep the manual check.

---

## Prerequisites

```bash
# 1. Point the native shell at the build you are validating.
#    Store build → your HTTPS deployment; LAN dev → http://<LAN_IP>:3032 + `npm run dev`.
#    Resolved from NEXT_PUBLIC_SITE_URL in .env.local (see scripts/cap-sync.mjs).
npm run cap:sync            # day-to-day
npm run cap:sync:release    # store archives (CAPACITOR_LOGGING=none)

# 2. Open the native IDE and run on a device/emulator.
npm run cap:open:android    # Android Studio → run on a notched device/emulator
npm run cap:open:ios        # Xcode → run on a notched device/simulator (e.g. iPhone 15)
```

Test devices should include **at least one notched/dynamic-island device** and,
for Android, a device with **gesture navigation** and one with the **3-button
bar** (back-button behaviour differs in feel, not in handler).

Have a **known test account** ready (email/password from the E2E user, or a
Google account) and at least one **real restaurant id and list id** from the
target environment (grab from the site, e.g. `/dashboard/restaurants/<id>`).

---

## Part A — Automated emulated-viewport checks (Playwright)

Spec: [`tests/e2e/public/mobile-smoke.spec.ts`](../tests/e2e/public/mobile-smoke.spec.ts).
Runs in the existing `public` project (no auth, no device farm) using Playwright
device presets (Pixel 5 / iPhone 13) and narrow viewports.

```bash
npm run test:e2e -- --project=public mobile-smoke
```

What it asserts, and which §14 scenario it de-risks:

1. **Safe-area wiring** (§14 safe-area): the document `<meta name="viewport">`
   contains `viewport-fit=cover` — the prerequisite that makes
   `env(safe-area-inset-*)` resolve to real notch insets on device (see
   `APP_VIEWPORT` in [`src/config-global.js`](../src/config-global.js)).
2. **No horizontal overflow at 320 px and 390 px** (§14 viewport, reuses the
   qa-checklist 320/390 rows) on the marketing shell and, when the DB has rows,
   on a public restaurant/list page.
3. **Deep-link target routes resolve at a phone viewport** (§14 deep link, web
   half): navigates to a public restaurant and list page and asserts the app
   shell renders — the same destination a native `appUrlOpen` resolves to. Skips
   cleanly when no service-role credentials / no rows (mirrors
   `deep-links.spec.ts`).
4. **Touch targets** (§14 touch, reuses qa-checklist "≥44×44"): the header CTA
   and mobile-nav trigger are ≥ 44×44 (`TOUCH_TARGET_SIZE`).

These are **necessary-but-not-sufficient**: green here means the web layer won't
sabotage the native smoke, not that the native scenario passed. Always run Part B
before shipping.

---

## Part B — Manual on-device runbook

Pass criteria are in **bold**. Log failures against TEST-PLAN.md with the device,
OS version, and build.

### B1 — Cold start

1. Fully quit the app (swipe from recents / not just backgrounded).
2. Launch from the home-screen icon.

**Pass:** app opens onto the parchment background (`#faf7f2`) with **no white
flash** and no lingering splash spinner; first meaningful screen (discover or
login) is interactive within a couple of seconds. The splash is hidden by
`SplashScreen.hide()` in
[`capacitor-init.jsx`](../src/components/capacitor/capacitor-init.jsx) — if it
never hides, that handler failed to run.

> If a white flash appears before content, check `backgroundColor` /
> `SplashScreen` config in [`capacitor.config.ts`](../capacitor.config.ts).

### B2 — Auth persists across restart

1. Sign in (email/password or Google) and land on the dashboard.
2. Fully quit the app (as in B1) and relaunch.

**Pass:** the app returns to an **authenticated** state (dashboard/discover),
**not** the "Continue with Google" gate. This validates that the Supabase
session cookie survives WebView process death. (Note the E2E harness sets the
session cookie `httpOnly: false` precisely because the browser Supabase client
reads sessions from `document.cookie` — see TEST-PLAN.md findings.)

3. Optionally leave the app 30+ min and relaunch to sanity-check token refresh
   (full expiry handling is A10 / manual in TEST-PLAN.md).

### B3 — Deep link into a restaurant / list

Two layers — test both and record which one you exercised:

**B3a. In-app navigation (works today).** From inside the app, navigate to a
restaurant and a list via the UI (discover card → restaurant, profile → list).
**Pass:** detail pages render fully (hero, gallery, map, reviews for a
restaurant; places for a list); back returns to the previous screen.

**B3b. OS-delivered deep link (`appUrlOpen`).** If a same-origin URL is delivered
to the running app, the handler in `capacitor-init.jsx` rewrites it to an in-app
`pushState` navigation. To exercise it you need a link that the OS routes to the
app.

> ⚠️ **Known gap — external App/Universal Links are not configured yet.** Android
> [`AndroidManifest.xml`](../android/app/src/main/AndroidManifest.xml) has only a
> `MAIN`/`LAUNCHER` intent-filter (no `VIEW` + `BROWSABLE` + `autoVerify` for
> `https://<domain>`), and iOS [`Info.plist`](../ios/App/App/Info.plist) has no
> `CFBundleURLTypes` and no associated-domains entitlement. So **tapping a
> `justnomnom.com` restaurant/list link in Mail/Messages will open the mobile
> browser, not the app.** Until those are added, B3b can only be smoke-tested by
> emulator intent:
>
> ```bash
> # Android — simulate a VIEW intent to confirm the handler wiring (once an
> # intent-filter exists). Today this will not resolve to the app.
> adb shell am start -a android.intent.action.VIEW \
>   -d "https://<your-domain>/dashboard/restaurants/<id>" com.nomnom.app
> ```
>
> Treat B3b as **N/A this release** and file the App-Links work as a follow-up
> (see "Follow-ups" below) unless the manifest/entitlement have since landed.

### B4 — Safe-area on notched devices

On a notched / dynamic-island device (portrait **and** landscape):

1. **Top:** the header/app-bar content sits **below** the status bar / notch, not
   under it (`pt: env(safe-area-inset-top)` in
   [`layouts/main/header.js`](../src/layouts/main/header.js) and
   `layouts/dashboard/header.js`).
2. **Bottom:** the dashboard bottom nav and any open bottom sheet clear the home
   indicator (`env(safe-area-inset-bottom)` in
   [`layouts/dashboard/nav-bottom.js`](../src/layouts/dashboard/nav-bottom.js)
   and the sheet-shell components).
3. **Landscape sides:** on a device with a side notch, map controls and the
   restaurant sticky bar respect left/right insets (`env(safe-area-inset-left/right)`).

**Pass:** no content is clipped by the notch or home indicator; no double-gap
(over-padding) either. Reuse the qa-checklist **landscape** row (map, restaurant
detail, roulette).

### B5 — Android hardware / gesture back

Handler: `App.addListener('backButton', …)` in `capacitor-init.jsx` —
`canGoBack ? history.back() : App.exitApp()`. `MainActivity` uses
`launchMode="singleTask"`.

Test on both a gesture-nav and a 3-button device:

1. Navigate two+ levels deep (discover → restaurant → open a bottom sheet).
2. Press back repeatedly.

**Pass:**
- Back with an open sheet/dialog **dismisses the sheet first** (does not skip
  straight to the previous page or exit).
- Back through the navigation stack unwinds screen-by-screen matching the
  in-app back button.
- Back from the **root** screen (discover, no history) **exits the app** — it
  does not get stuck on a blank page or re-enter a redirect loop.
- Back does **not** blank the app (regression guard for commit `d8677b0` /
  TEST-PLAN.md E2).

---

## Follow-ups (not blocking this runbook)

- **Wire OS App Links / Universal Links** so B3b becomes real: Android `VIEW` +
  `BROWSABLE` + `autoVerify` intent-filter for `https://<domain>` and a
  `.well-known/assetlinks.json`; iOS associated-domains entitlement +
  `apple-app-site-association`. Until then, external restaurant/list links open
  the browser, not the app.
- Consider a lightweight **native detox/Maestro flow** for B1/B2/B5 if device
  automation infra becomes available; today they are manual by necessity.
