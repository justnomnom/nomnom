# Analytics Tracking Matrix

Last updated: 2026-07-17

## Scope

This matrix documents all events currently instrumented for:

- acquisition and onboarding
- discover and map engagement
- restaurant interactions
- list and creator monetization
- list management (creator-side)
- roulette (public + dashboard)
- settings (profile, account, preferences, billing)
- saved + feedback surfaces
- Stripe webhook payment outcomes

## Event Schema Rules

- Event names use `snake_case`.
- Required properties are listed below.
- Missing required properties are tagged at runtime with `_schema_missing_required`.
- Noisy events are deduped in `src/libs/analytics/analytics-provider.js`.
  - Current dedupe rule: `map_filters_updated` (1.5s, same payload).
- All emitted events have a schema entry in `EVENT_SCHEMAS` in
  `src/libs/analytics/analytics-provider.js`. Events without an entry pass through
  untouched (no required-prop validation). A small set of not-yet-emitted events are
  pre-registered and annotated in code — see "Schema coverage" below.

## Core Event Matrix

### Acquisition & Activation

| Event | Funnel Stage | Required Properties | Source |
|---|---|---|---|
| `signup_started` | Acquisition | `source` | `src/libs/analytics/analytics-provider.js` (`trackSignup`) |
| `signup_form_viewed` | Acquisition | — | `src/sections/auth/supabase/supabase-register-view.js` |
| `signup_form_started` | Acquisition | `source` | `src/sections/auth/supabase/supabase-register-view.js` |
| `signup_field_blurred` | Acquisition | `field` | `src/sections/auth/supabase/supabase-register-view.js` |
| `signup_verify_viewed` | Activation | `flow` | `src/sections/auth/supabase/supabase-verify-view.js` |
| `signup_completed` | Activation | `method` | `src/libs/analytics/analytics-provider.js` (`trackSignupComplete`) |
| `signup_session_ready` | Activation | `method` | `src/auth/context/supabase/auth-provider.js`, `supabase-register-view.js` |
| `onboarding_step_viewed` | Activation | `step`, `step_key` | `src/sections/onboarding/onboarding-wizard.js` |
| `onboarding_completed` | Activation | `path`, `from_step` | `src/sections/onboarding/onboarding-wizard.js` |
| `password_reset_completed` | Activation | — | `src/sections/auth/supabase/supabase-new-password-view.js` |

> **`signup_completed` coverage:** emitted for email signups from `signUp()` and for new OAuth
> accounts on first sign-in from `runSessionSetup` (both in
> `src/auth/context/supabase/auth-provider.js`). Login/register failures are captured via
> `trackError` (`context: 'email_password_login'` / `'email_password_register'`), not as funnel
> events.
>
> **Signup micro-funnel:** `signup_form_*` / `signup_verify_viewed` / `signup_session_ready` measure
> form engagement and post-auth readiness before onboarding. `signup_started` fires from
> `trackSignup` (email/Google submit); `signup_completed` from `trackSignupComplete`.

### Homepage CTAs

| Event | Funnel Stage | Required Properties | Source |
|---|---|---|---|
| `homepage_view_dashboard` | Acquisition | — | `src/sections/home/home-hero.js` |
| `homepage_start_plan_generation` | Acquisition | — | `src/sections/home/home-hero.js`, `src/sections/home/home-advertisement.js` |
| `homepage_signup_cta` | Acquisition | — | `src/sections/home/home-hero.js`, `src/sections/home/home-advertisement.js` |

### Discover

| Event | Funnel Stage | Required Properties | Other Properties | Source |
|---|---|---|---|---|
| `discover_ai_search_submitted` | Engagement | `query_length` | `home_locality_id` (nullable), `destination: 'map'` | `src/sections/discover/view/discover-view.js` |
| `discover_search_ai_changed` | Engagement | `mode` (`'places'`/`'ai'`) | — | `src/sections/discover/view/discover-view.js` |
| `discover_search_suggestion_picked` | Engagement | `restaurant_id` | `destination: 'map'` | `src/sections/discover/view/discover-view.js` |
| `discover_feed_load_more` | Engagement | `next_limit` | `home_locality_id` | `src/sections/discover/view/discover-view.js` |
| `discover_vibe_opened_map` | Navigation | `vibe_key` | `tag_slugs` | `src/sections/discover/view/discover-view.js` |
| `discover_map_filters_opened` | Navigation | — | — | `src/sections/discover/view/discover-view.js` |
| `discover_market_changed` | Localization | `market_id` | — | `src/sections/discover/view/discover-view.js` |
| `discover_market_change_failed` | Localization | `market_id` | — | `src/sections/discover/view/discover-view.js` |
| `discover_market_from_location_updated` | Localization | — | — | `src/sections/discover/view/discover-view.js` |
| `discover_market_from_location_failed` | Localization | — | — | `src/sections/discover/view/discover-view.js` |
| `discover_market_from_location_denied` | Localization | — | — | `src/sections/discover/view/discover-view.js` |

> **Discover → Map AI handoff:** Discover no longer runs the AI search inline. On submit it
> emits `discover_ai_search_submitted` and stashes the query for the map (`mapPendingAiQuery`),
> then navigates to the map, which runs the search and emits the `map_ai_search_*` events. The
> `discover_ai_search_completed` / `discover_ai_search_failed` events were removed.

### Map

| Event | Funnel Stage | Required Properties | Other Properties | Source |
|---|---|---|---|---|
| `map_ai_search_submitted` | Engagement | `query_length`, `sort_mode` | `active_chip`, `scoped` | `src/sections/map/view/map-view.js` |
| `map_ai_search_completed` | Engagement | `results_count`, `sort_mode` | `active_chip`, `applied_tag_count`, `applied_min_rating` | `src/sections/map/view/map-view.js` |
| `map_ai_search_failed` | Engagement | `sort_mode` | `active_chip` | `src/sections/map/view/map-view.js` |
| `map_chip_selected` | Engagement | `chip` | — | `src/sections/map/view/map-view.js` |
| `map_filters_updated` | Engagement | `selected_tag_count`, `min_rating`, `sort_mode` | deduped (1.5s, same payload) | `src/sections/map/view/map-view.js` |
| `map_more_filters_opened` | Engagement | — | — | `src/sections/map/view/map-view.js` |
| `map_search_this_area_tapped` | Engagement | — | — | `src/sections/map/view/map-view.js` |
| `map_search_suggestion_picked` | Engagement | `restaurant_id` | `in_view` | `src/sections/map/view/map-view.js` |
| `map_search_location_picked` | Engagement | `locality_id` | — | `src/sections/map/view/map-view.js` |
| `map_search_ai_changed` | Engagement | `mode` (`'places'`/`'ai'`) | — | `src/sections/map/view/map-view.js` |
| `map_marker_selected` | Engagement | `restaurant_id` | — | `src/sections/map/view/map-view.js` |
| `map_marker_deselected` | Engagement | `restaurant_id` | — | `src/sections/map/view/map-view.js` |
| `map_list_spot_selected` | Engagement | `restaurant_id` | — | `src/sections/map/view/map-view.js` |
| `map_list_spot_deselected` | Engagement | `restaurant_id` | — | `src/sections/map/view/map-view.js` |

### Restaurant

| Event | Funnel Stage | Required Properties | Source |
|---|---|---|---|
| `restaurant_detail_viewed` | Engagement | `restaurant_id`, `surface` | `src/libs/analytics/restaurant-analytics.js` |
| `restaurant_feed_impression` | Engagement | `restaurant_id` | `src/sections/discover/view/discover-view.js` (viewport IO; optional `market_label`) |
| `restaurant_maps_clicked` | Engagement | `restaurant_id`, `surface` | `src/libs/analytics/restaurant-analytics.js` |
| `restaurant_phone_clicked` | Engagement | `restaurant_id`, `surface` | `src/libs/analytics/restaurant-analytics.js` |
| `restaurant_photo_viewed` | Engagement | `restaurant_id`, `surface` (+ `index`) | `src/libs/analytics/restaurant-analytics.js` |
| `restaurant_share_clicked` | Engagement | `restaurant_id`, `surface` | `src/libs/analytics/restaurant-analytics.js` |
| `restaurant_save_intent` | Engagement | `restaurant_id` | `src/libs/analytics/restaurant-analytics.js` |
| `restaurant_saved` | Engagement | `restaurant_id` | `src/sections/lists/save-to-list-sheet.js` |
| `restaurant_unsaved` | Engagement | `restaurant_id` | `src/sections/lists/save-to-list-sheet.js` |

### Roulette

| Event | Funnel Stage | Required Properties | Source |
|---|---|---|---|
| `roulette_spin_started` | Engagement | — | `src/sections/roulette/view/public-roulette-view.js`, `src/sections/roulette/view/nom-roulette-view.js` |
| `roulette_spin_completed` | Engagement | `restaurant_id` | `src/sections/roulette/view/public-roulette-view.js`, `src/sections/roulette/view/nom-roulette-view.js` |
| `roulette_spin_empty_pool` | Engagement | — | `src/sections/roulette/view/public-roulette-view.js`, `src/sections/roulette/view/nom-roulette-view.js` |
| `tool_signup_click` | Acquisition | `source` | `src/sections/roulette/view/public-roulette-view.js` |

> Roulette spin events carry shared context props (`ANALYTICS_CONTEXT`) identifying the variant.

### Settings — Profile & Account

| Event | Funnel Stage | Required Properties | Other Properties | Source |
|---|---|---|---|---|
| `profile_updated` | Engagement | — | — | `src/sections/profile/settings-edit-form.js` |
| `profile_update_failed` | Engagement | `reason` | — | `src/sections/profile/settings-edit-form.js` |
| `avatar_uploaded` | Engagement | — | — | `src/sections/profile/settings-edit-form.js` |
| `avatar_removed` | Engagement | — | — | `src/sections/profile/settings-edit-form.js` |
| `avatar_upload_failed` | Engagement | `reason` | — | `src/sections/profile/settings-edit-form.js` |
| `account_deletion_started` | Retention | — | — | `src/sections/profile/view/settings-delete-view.js` |
| `account_deletion_completed` | Retention | — | — | `src/sections/profile/view/settings-delete-view.js` |
| `account_deletion_failed` | Retention | — | `reason` | `src/sections/profile/view/settings-delete-view.js` |

### Settings — Preferences, Appearance & Billing

| Event | Funnel Stage | Required Properties | Source |
|---|---|---|---|
| `appearance_mode_changed` | Engagement | `mode` | `src/sections/profile/settings-appearance-form.js` |
| `tag_preferences_saved` | Engagement | `selected_count` | `src/sections/profile/view/settings-tag-preferences-page.js` |
| `tag_preferences_save_failed` | Engagement | — | `src/sections/profile/view/settings-tag-preferences-page.js` |
| `stripe_connect_started` | Monetization | `status` | `src/sections/profile/settings-billing.js` |
| `stripe_connect_failed` | Monetization | — | `src/sections/profile/settings-billing.js` |

### Saved & Feedback

| Event | Funnel Stage | Required Properties | Source |
|---|---|---|---|
| `saved_view_opened` | Engagement | — | `src/sections/saved/view/saved-view.js` |
| `saved_filter_changed` | Engagement | `filter` | `src/sections/saved/view/saved-view.js` |
| `feedback_opened` | Engagement | — | `src/sections/feedback/view/feedback-view.js` |

### Notifications

| Event | Funnel Stage | Required Properties | Other Properties | Source |
|---|---|---|---|---|
| `notification_open` | Engagement | — | `unread` | `src/components/notifications/notifications-bell.js` |
| `notification_click` | Engagement | `type` | — | `src/components/notifications/notifications-panel.js` |

### Public Pages

| Event | Funnel Stage | Required Properties | Source |
|---|---|---|---|
| `list_viewed` | Engagement | `list_id` | `src/sections/lists/view/list-public-view.js` |
| `creator_profile_viewed` | Engagement | `creator_id` | `src/sections/lists/view/user-public-profile-view.js` |

### List Monetization

| Event | Funnel Stage | Required Properties | Source |
|---|---|---|---|
| `live_list_cta_clicked` | Monetization | `list_id` | `src/sections/lists/view/list-public-view.js` |
| `live_list_checkout_started` | Monetization | `list_id` | `src/sections/lists/view/list-public-view.js` |
| `live_list_checkout_failed` | Monetization | `list_id`, `error_code` | `src/sections/lists/view/list-public-view.js` |
| `live_list_checkout_redirected` | Monetization | `list_id` | `src/sections/lists/view/list-public-view.js` |
| `list_checkout_returned` | Monetization | `list_id`, `checkout_status` | `src/sections/lists/view/list-public-view.js` |
| `snapshot_cta_clicked` | Monetization | `list_id` | `src/sections/lists/view/list-public-view.js` |
| `snapshot_checkout_started` | Monetization | `list_id` | `src/sections/lists/view/list-public-view.js` |
| `snapshot_checkout_failed` | Monetization | `list_id`, `error_code` | `src/sections/lists/view/list-public-view.js` |
| `snapshot_checkout_redirected` | Monetization | `list_id` | `src/sections/lists/view/list-public-view.js` |
| `snapshot_checkout_verified` | Monetization | `list_id` | `src/sections/lists/view/list-public-view.js` |
| `snapshot_checkout_verify_failed` | Monetization | `list_id` | `src/sections/lists/view/list-public-view.js` |
| `freemium_paywall_shown` | Monetization | `list_id` | `src/sections/lists/view/list-public-view.js` |

### Creator Subscriptions

| Event | Funnel Stage | Required Properties | Source |
|---|---|---|---|
| `creator_subscription_checkout_started` | Monetization | `creator_id`, `list_id`, `viewer_id` | `src/sections/lists/view/user-public-profile-view.js` |
| `creator_subscription_checkout_failed` | Monetization | `creator_id`, `list_id`, `error_code` | `src/sections/lists/view/user-public-profile-view.js` |
| `creator_subscription_checkout_redirected` | Monetization | `creator_id`, `list_id`, `viewer_id` | `src/sections/lists/view/user-public-profile-view.js` |
| `creator_checkout_returned` | Monetization | `creator_id`, `checkout_status` | `src/sections/lists/view/user-public-profile-view.js` |
| `creator_subscription_cancel_started` | Retention | `creator_id`, `subscription_row_id` | `src/sections/lists/view/user-public-profile-view.js` |
| `creator_subscription_cancel_failed` | Retention | `creator_id`, `subscription_row_id` | `src/sections/lists/view/user-public-profile-view.js` |
| `creator_subscription_cancel_completed` | Retention | `creator_id`, `subscription_row_id` | `src/sections/lists/view/user-public-profile-view.js` |
| `creator_follow_toggled` | Engagement | `creator_id`, `follow` | `src/sections/lists/view/user-public-profile-view.js` |
| `creator_follow_toggle_failed` | Engagement | `creator_id`, `follow` | `src/sections/lists/view/user-public-profile-view.js` |
| `creator_follow_login_redirected` | Engagement | `creator_id` | `src/sections/lists/view/user-public-profile-view.js` |

### List Management (Creator-side)

| Event | Funnel Stage | Required Properties | Source |
|---|---|---|---|
| `list_created` | Activation | `list_id` | `src/sections/lists/create-list-modal.js` |
| `list_details_saved` | Engagement | `list_id` | `src/sections/lists/view/list-manage-view.js` |
| `list_visibility_changed` | Engagement | `list_id`, `visibility` | `src/sections/lists/view/list-manage-view.js` |
| `list_place_removed` | Engagement | `list_id`, `restaurant_id` | `src/sections/lists/view/list-manage-view.js` |
| `list_deleted` | Retention | `list_id` | `src/sections/lists/view/list-manage-view.js` |

## Server-Side Stripe Events (Webhook)

Captured directly in `src/app/(frontend)/api/webhooks/stripe/route.js` when
`INTEGRATION_FLAGS.posthog` is enabled (same kill switch as the client). Also requires
`NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST`:

- `stripe_webhook_received`
- `stripe_webhook_handler_failed`
- `subscription_payment_recorded`
- `snapshot_purchase_recorded`
- `subscription_status_synced`

These are best-effort and non-blocking for webhook reliability.

## Restaurant Surface Taxonomy

Restaurant events include a `surface` property identifying where the interaction occurred:

| Value | Description |
|---|---|
| `content_hub` | Content hub pages |
| `dashboard` | Authenticated dashboard |
| `map_sheet` | Map spot sheet |
| `discover_feed` | Discover feed cards |
| `public` | Public-facing pages |

## Schema coverage

Every event emitted via `trackEvent` has a matching `EVENT_SCHEMAS` entry, and every
`EVENT_SCHEMAS` entry has a live emitter — the schema and the running code are 1:1, with no
pre-registered or orphaned entries.

Stale entries left behind by renames were removed during reconciliation:

- `discover_vibe_changed` → removed (superseded by `discover_vibe_opened_map`)
- `discover_map_opened` → removed (superseded by `discover_map_filters_opened`)
- `discover_category_changed`, `discover_creator_opened`, `map_chip_cleared` → removed (no emitter)
- `discover_search_mode_changed` → renamed to `discover_search_ai_changed`
- `map_search_mode_changed` → renamed to `map_search_ai_changed`
- `roulette_result_viewed`, `roulette_spin_again_clicked`, `roulette_view_details_clicked`,
  `roulette_gallery_opened` → removed (pre-registered, never emitted)
- `account_deletion_blocked_subscribers` → removed (pre-registered, never emitted)
