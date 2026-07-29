# Shared Components

> Engineering companion to `DESIGN.md`. Lists the reusable components and hooks extracted from recurring patterns. **Check here before building a new component** — chances are the shape you need already exists.

Last reconciled with the codebase on 2026-06-07.

---

## How to use this doc

When you find yourself about to write any of these patterns, import the shared component instead:

- "Settings row with icon tile, label, and chevron" → `HubNavRow`
- "Tappable row that toggles selected state, with checkmark or chevron" → `SettingsSelectionRow`
- "List row with avatar, name, badges, optional trailing action" → `ProfileListItemRow`
- "Mobile bottom-sheet on small screens, centered dialog on desktop" → `ResponsiveSheet`
- "Skeleton `baseColor` / `highlightColor` from the current theme mode" → `useSkeletonThemeColors`
- "Eye-toggle adornment for password input" → `PasswordVisibilityAdornment`
- "Numeric label that won't reflow as digits change" → spread `tabularNumsSx`

The components live in different folders by domain, but they're all stable extractions used by 2+ existing call sites.

---

## Sheet & dialog primitives

### `ResponsiveSheet`

Path: `src/components/sheet-shell/responsive-sheet.js`
Export: `export { ResponsiveSheet } from 'src/components/sheet-shell'`

Bottom `Drawer` (with `SwipeDismissBottomSheetContent`, grab bar, swipe-to-dismiss) on mobile, centered `Dialog` on desktop. Built-in close button in the header.

```jsx
import { ResponsiveSheet } from 'src/components/sheet-shell';

<ResponsiveSheet
  open={open}
  onClose={onClose}
  titleId="my-sheet-title"
  descId="my-sheet-description"
  title={<Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Heading</Typography>}
  footer={<Button onClick={onClose}>Cancel</Button>}
>
  {bodyContent}
</ResponsiveSheet>
```

Used by: `pwa-install-prompt.jsx`.

**Don't use when** you need fullscreen mode (`delete-dialog.js`), or multi-step flows with custom shells (`create-list-modal`, `save-to-list-sheet`). Those keep their own shells.

### Other sheet-shell helpers

All exported from `src/components/sheet-shell`:

- `SheetHeaderRow` — title row with optional `endAction` slot
- `SheetGrabBarRail` — the pill drag handle for bottom sheets
- `SheetCloseIconButton` — standard close button
- `SwipeDismissBottomSheetContent` — Paper that swipes away on drag
- `mobileBottomSheetDrawerPaperSx` — `PaperProps.sx` for a transparent-shell Drawer
- `sheetStackedContainedGlowSx(color)`, `sheetStackedCancelOutlinedSx`, `sheetStackedDestructiveOutlinedSx` — vertically stacked action button sx

---

## Settings rows (profile section)

### `HubNavRow`

Path: `src/sections/profile/view/settings-hub-view.js`
Export: `export { HubNavRow } from 'src/sections/profile/view/settings-hub-view'`

Tappable nav row with icon tile + title + optional subtitle + chevron. Wrap each row in `<Box sx={hubCardShellSx(theme)}>` so the surrounding card chrome stays consistent.

```jsx
import { HubNavRow } from 'src/sections/profile/view/settings-hub-view';
import { hubCardShellSx } from 'src/sections/profile/view/settings-shell-shared';

<Box sx={hubCardShellSx(theme)}>
  <HubNavRow
    href={paths.dashboard.settingsSupport}
    icon={ic.letterLinear}
    title={t('contact_cta')}
    subtitle={t('contact_subtitle')}     // optional
    danger={false}                        // optional — uses error color
  />
</Box>
```

Used by: `settings-hub-view.js` (×N), `settings-billing.js`, `feedback-view.js`.

### `SettingsSelectionRow`

Path: `src/sections/profile/settings-selection-row.js`

Tappable row with `selected` state. Same visual rhythm as `HubNavRow` but for single-choice option lists — trailing icon swaps between checkmark (selected) and chevron (unselected).

```jsx
import SettingsSelectionRow from 'src/sections/profile/settings-selection-row';

<SettingsSelectionRow
  selected={settings.themeMode === option.value}
  onClick={() => settings.onUpdate('themeMode', option.value)}
  icon={option.icon}
  label={option.label}
  iconWidth={20}                  // optional — default 20
  iconColor="primary.main"        // optional — default 'primary.main'
  iconSx={{ borderRadius: 0.65 }} // optional — extras for the inner Iconify
/>
```

Used by: `settings-appearance-form.js`, `settings-language-form.js`.

### `ProfileListItemRow`

Path: `src/sections/profile/profile-list-item-row.js`

Avatar + name + badges + (optional) subtitle + trailing element. Two trailing modes:

- Pass `username` → row becomes a `RouterLink` to that user's public profile, with a chevron.
- Pass `trailingAction` → row stays static; the action (typically an `IconButton`) sits on the right.

```jsx
import ProfileListItemRow from 'src/sections/profile/profile-list-item-row';

// Link variant (e.g., FollowerRow / FollowingRow)
<ProfileListItemRow
  avatarSrc={row.user?.avatar_url}
  avatarFallback={label.slice(0, 1).toUpperCase()}
  title={label}
  subtitle={username ? `@${username}` : null}
  username={username}                            // → enables link + chevron
  chips={<Chip size="small" label="Following" variant="outlined" />}
/>

// Action variant (e.g., SubscriberRow / MySubscriptionRow)
<ProfileListItemRow
  avatarSrc={row.subscriber?.avatar_url}
  avatarFallback={label.slice(0, 1).toUpperCase()}
  title={label}
  subtitle={secondaryParts.join(' · ')}
  chips={<><Chip /* status */ /><Chip /* category */ /></>}
  trailingAction={
    cancellable && (
      <IconButton onClick={onRemove} sx={{ width: TOUCH_MIN, height: TOUCH_MIN }}>
        <Iconify icon={ic.trashLinear} />
      </IconButton>
    )
  }
/>
```

Used by: `settings-subscribers.js` (×2), `settings-my-subscriptions.js` (×2).

---

## Auth

### `PasswordVisibilityAdornment`

Path: `src/sections/auth/supabase/password-visibility-adornment.js`

Trailing eye-toggle for password `TextField`s. Drop into `InputProps.endAdornment`. Handles its own i18n aria-label.

```jsx
import PasswordVisibilityAdornment from 'src/sections/auth/supabase/password-visibility-adornment';

const passwordVisible = useBoolean();

<RHFTextField
  name="password"
  type={passwordVisible.value ? 'text' : 'password'}
  InputProps={{
    endAdornment: (
      <PasswordVisibilityAdornment
        visible={passwordVisible.value}
        onToggle={passwordVisible.onToggle}
      />
    ),
  }}
/>
```

Used by: `supabase-login-view.js`, `supabase-register-view.js` (×2), `supabase-new-password-view.js` (×2).

---

## Search

### `SearchAiToggleAdornment`

Path: `src/components/search-ai-toggle/search-ai-toggle.js`

Single-line search-bar end adornment that folds the mode switch into the input instead of a separate row. In `'places'` mode it shows an optional clear button plus a `✨ AI` ghost pill that flips the bar into the natural-language agent; in `'ai'` mode it shows an exit button (back to places) plus a filled circular submit button. Pass it as the search field's `InputProps.endAdornment`; pair it with an AI-active outline on the input (`outline: 2px solid primary.main`) so the mode is unmistakable.

Presentational only — the consumer owns the `mode` state and the side effects of changing it (clearing its own AI override, reopening the typeahead, analytics). Labels/aria come from the shared `pages.dashboard.map.search_ai_*` keys, so both call sites read identically.

```jsx
import SearchAiToggleAdornment from 'src/components/search-ai-toggle';

const [searchMode, setSearchMode] = useState('places');

<SearchAiToggleAdornment
  mode={searchMode}
  onModeChange={handleSearchModeChange}
  hasQuery={!!query.trim()}
  onClear={() => setQuery('')}
  onSubmit={() => handleAiSearch()}
  submitting={aiLoading}
/>
```

Used by: `map-view.js`, `discover-view.js`.

---

## Sharing

### `useShareLink` + `ShareFeedbackSnackbar`

Paths: `src/hooks/use-share-link.js`, `src/components/share/share-feedback-snackbar.js`

The only sanctioned way to share a URL. Tries the native share sheet, falls back to a
hardened clipboard copy (works in non-secure contexts), and always surfaces the outcome
via `feedback` — never share silently. `copyLink` skips the native sheet for explicit
"Copy link" actions. Locale keys default to `pages.dashboard.restaurant.share_copied`
/ `share_failed`; override per surface (e.g. profile uses `pages.lists.creator_share_*`).

```jsx
import { useShareLink } from 'src/hooks/use-share-link';
import ShareFeedbackSnackbar from 'src/components/share/share-feedback-snackbar';

const { share, copyLink, feedback, dismissFeedback } = useShareLink();

const handleShare = () => share({ url, title });

// Toast surfaces (lists, discover, shells):
<ShareFeedbackSnackbar feedback={feedback} onClose={dismissFeedback} />
// Inline surfaces (restaurant detail, map sheet) render an <Alert> from `feedback` instead.
```

Used by: `restaurant-detail-view.js`, `list-public-view.js`, `list-manage-view.js`,
`map-spot-sheet-inner.js`, `discover-feed-card.js`, `discover-view.js`,
`dashboard-list-public-view.js`, `user-public-profile-dashboard-shell.js`.

---

## Loading skeletons

### `useSkeletonThemeColors`

Path: `src/theme/use-skeleton-theme.js`

Memoized `baseColor` / `highlightColor` for `react-loading-skeleton`'s `SkeletonTheme`, derived from MUI theme mode. Matches `DESIGN.md` §7 (light: black @ 0.07/0.12, dark: white @ 0.09/0.18).

```jsx
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

function MyLoadingSkeleton() {
  const skeletonTheme = useSkeletonThemeColors();
  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Skeleton ... />
    </SkeletonTheme>
  );
}
```

Used by: 35 files across `src/sections/`, `src/components/`. Never inline the color computation — it's documented in DESIGN.md and centralized here.

### `SettingsListLoadingSkeleton`

Path: `src/sections/profile/settings-list-loading-skeleton.js`

Skeleton shell for avatar + title + badge + subtitle + trailing-action rows (the shape `ProfileListItemRow` renders). Widths are props since they vary slightly between contexts.

```jsx
import SettingsListLoadingSkeleton from 'src/sections/profile/settings-list-loading-skeleton';

<SettingsListLoadingSkeleton
  count={5}
  ariaLabel={t('subscribers.loading')}
  titleWidth={160}
  badgeWidth={72}
  subtitleWidth="68%"
/>
```

Used by: `settings-subscribers-skeleton.js`, `settings-my-subscriptions-skeleton.js`.

---

## Theme tokens (the contract from `DESIGN.md`)

All exported from `src/theme/spacing.js`:

| Token | Type | Use |
|---|---|---|
| `SPACE.xxs` → `SPACE.section` | MUI spacing multipliers | `sx={{ p: SPACE.md }}` instead of inventing `p: 1.75` |
| `RADIUS.tight` (8) / `base` (16) / `loose` (24) / `pill` (9999) | px values | `borderRadius: RADIUS.loose` for non-MUI surfaces; `theme.shape.borderRadius === RADIUS.base` |
| `STEP_RHYTHM.cozy` / `spacious` | `{ xs, sm }` spacing objects | Vertical rhythm in wizards & settings hubs (pick ONE per surface) |
| `HEADER_GAP_SX` | sx object | Toolbar gap — spread into `<Toolbar sx={{ gap: HEADER_GAP_SX }}>` |
| `TOUCH_TARGET_SIZE` (44) | px value | Minimum hit target (Capacitor/iOS requirement) |
| `touchTargetSx` | sx object | `{...touchTargetSx}` — spreads `minWidth: 44, minHeight: 44` |
| `tabularNumsSx` | sx object | Spread onto numeric labels (ratings, counts, table cells) so digits don't reflow |
| `Z_INDEX.belowAppBar` / `mobileBottomSheet` / `dashboardBottomNav` / `navRailToggle` / `searchTypeahead` / `scrollProgress` / `splashScreen` / `routeProgress` / `fullscreenBackdrop` / `fullscreenContent` / `fullscreenDialog` | numbers | App-wide stacking. Never use raw `zIndex: 9999`. |

Responsive button layout helpers from `src/theme/responsive-button-sx.js`:

| Export | Use |
|---|---|
| `mobileStretchButtonSx` | Card/form CTAs — full-width + 44px min-height on `xs`, natural width from `sm` up |
| `dialogActionsMobileSx` | Dialog footers — stacked full-width buttons on `xs`, inline right-aligned on `sm+` |
| `compactPageActionsStackSx` | Centered error/maintenance pages with one or two primary actions |

Settings-specific re-exports from `src/sections/profile/view/settings-shell-shared.js`:

- `ROUNDED_CARD` (= `${RADIUS.loose}px` string) — settings card radius
- `TOUCH_MIN` (= `TOUCH_TARGET_SIZE`) — minimum hit target
- `ICON_TILE` (44) — icon tile size in settings rows
- `SHELL_HUB_ICON` — standard icon width inside settings rows
- `hubCardShellSx(theme)` — card chrome (rounded radius, surface bg, border)
- `settingsShellRowHoverBg(theme)` — hover bg color for tappable rows
- `dashboardSubsectionStackProps`, `dashboardPageSectionStackProps` — Stack prop bundles
- `dashboardPageRootSx`, `dashboardSectionLabelSx`, `dashboardMobileStretchButtonSx`, etc.

---

## When NOT to use a shared component

The shared components above are extracted from genuine cross-file duplication. They are NOT exhaustive — many one-off components deliberately stay local:

- **`SettingsBillingStripeCardSkeleton`** — Stripe-specific shape, only one consumer
- **`HubNavRowSkeleton`** — local to `settings-hub-loading-skeleton.js`
- **Each restaurant card / map row variant** — divergent enough that the abstraction would be heavier than the savings
- **`delete-dialog.js`** — has fullscreen mode + confirmation input that don't fit `ResponsiveSheet`'s simple shell

If you're about to extract a new shared component:

1. Confirm there are ≥2 existing call sites with near-identical structure
2. Make sure the divergences are configurable via 3–5 props max (not 10+)
3. Pick a location matching the consumer domain (`src/sections/profile/` for settings stuff, `src/components/sheet-shell/` for dialog primitives, `src/theme/` for theme-level hooks)
4. Update this doc with the new entry

---

## File checklist for new contributors

Before opening a PR that adds UI, scan for these patterns:

- [ ] Settings row with chevron? → use `HubNavRow`
- [ ] Selection row with checkmark? → use `SettingsSelectionRow`
- [ ] List row with avatar + action? → use `ProfileListItemRow`
- [ ] Responsive bottom-sheet dialog? → use `ResponsiveSheet`
- [ ] Skeleton with `SkeletonTheme`? → use `useSkeletonThemeColors`
- [ ] Password field? → use `PasswordVisibilityAdornment`
- [ ] Inventing `borderRadius: 9999` in a `style` prop? → use `RADIUS.pill` (in `sx`, `borderRadius: 999` is the sanctioned pill shorthand per DESIGN.md §4)
- [ ] `variant="contained"` button? → declare `color` explicitly (`color="primary"` for brand CTAs — theme default is `inherit`, which renders near-black)
- [ ] Inventing `minWidth/minHeight: 44`? → use `touchTargetSx` or `TOUCH_TARGET_SIZE`
- [ ] Inventing `zIndex: 1090` etc.? → use `Z_INDEX.*`
- [ ] Rendering numeric value that might tick? → spread `tabularNumsSx`
