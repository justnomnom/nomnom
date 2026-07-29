# App QA checklist (breakpoints, forms, tokens)

Use this before releases or large UI refactors. **Automated:** `npm run lint`, `npm run build`. **Manual:** run through sections below on real devices when possible.

## Viewports

| Width   | Target        | Spot-check |
|--------|---------------|------------|
| 320px  | Small phone   | Discover feed, list manage tabs scroll, save-to-list sheet |
| 390px  | Common phone  | Restaurant detail hero + sheet, map controls |
| 768px  | Tablet        | Dashboard nav, two-column layouts |
| 1024px | Desktop       | Settings drawer, org chart (if used) |
| 1280px+ | Wide         | List grids, stretch-only UI (settings hint at xl) |

Also test **landscape** on phone for: map, restaurant detail, roulette result.

## Forms (happy path + errors)

- **Auth / profile:** sign-in, settings edit (avatar, display name, bio), remove photo control.
- **Lists:** create list, list manage (details / places / people / delete tab), save-to-list sheet (rating, body, media remove), cover upload/remove.
- **Discover / restaurant:** NL search, filters, save sheet from feed card.
- **Roulette:** spin → result → navigation.
- **Admin (if applicable):** sponsored placements table + inline schedule editor.

Per form: required fields, disabled while submitting, error snackbars, keyboard submit where applicable.

## Touch & pointer

- Icon-only controls **≥ 44×44** where we standardized (list cover remove, media remove, avatar remove, tab scroll buttons).
- No **horizontal scroll** on core flows at 320px unless intentional (e.g. chip rows with scroll affordance).

## Theme & tokens

- Toggle **light / dark** (Settings → Appearance): Discover cards, list covers, profile, TipTap editor.
- Prefer **`alpha(theme.palette…)`** over raw `rgba()` in React/MUI code (see lint + code search).

## Motion

- OS **prefers-reduced-motion**: map pin fire badge static; other Framer / CSS respects project hooks where wired.

## i18n

- Switch **EN / PT**: settings page titles, common delete/edit.

## Search / tooling note

- **One** app locale file: `src/locales/langs/en.json` (and `pt.json`). If the IDE lists `src/locales/...` and `src\locales\...`, that is usually the **same path** on Windows, not two copies. `find` / `git ls-files` should show a single path.
- **Optional `.cursorignore`** (repo root) to quiet searches: ignore `node_modules/`, `.next/`, `out/`, `dist/`, `build/`, and `src/_mock/map/` (Mapbox-style JSON legitimately contains `rgba(...)` strings).

```gitignore
node_modules/
.next/
out/
dist/
build/
src/_mock/map/
```

## Optional commands

```bash
npm run lint
npm run build
```
