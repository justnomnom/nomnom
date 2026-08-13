-- Full application data reset (2026-07-14).
-- Truncates every public app table, then clears auth.users.
-- PostGIS spatial_ref_sys is untouched (system table).
--
-- After wipe, re-seed:
--   npm run geo:pt:reseed && npm run geo:pt:apply -- .tmp/reseed
--   npm run tags:reseed

TRUNCATE TABLE
  public.customers,
  public.night_guests,
  public.night_places,
  public.nights,
  public.list_decide_votes,
  public.list_decide_sessions,
  public.list_item_must_try_dishes,
  public.list_items,
  public.list_members,
  public.list_snapshot_purchases,
  public.list_subscription_payments,
  public.list_subscriptions,
  public.lists,
  public.municipalities,
  public.notification_mutes,
  public.notification_preferences,
  public.notifications,
  public.push_subscriptions,
  public.restaurant_creator_mentions,
  public.restaurant_dish_suggestions,
  public.restaurant_images,
  public.restaurant_reviews,
  public.restaurant_tags,
  public.restaurants,
  public.sponsored_restaurant_placements,
  public.stripe_events,
  public.suggested_creators,
  public.tags,
  public.ugc_translation_cache,
  public.user_cuisine_preferences,
  public.user_follows,
  public.user_location_follows,
  public.user_restaurant_tag_preferences,
  public.users,
  public.cities,
  public.states,
  public.countries
RESTART IDENTITY CASCADE;

DELETE FROM auth.users;
