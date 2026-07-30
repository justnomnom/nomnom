-- API role grants for PostgREST (anon / authenticated / service_role).
-- Idempotent: safe to re-run. Source of truth for `npm run db:audit-grants`
-- and `src/lib/__tests__/api-table-grants.test.mjs`.
--
-- Without these, RLS policies alone are not enough: PostgREST returns
-- "permission denied" and the app sees empty catalogs (e.g. tags), Lists hub
-- failures (`list_subscriptions`), or generic write failures (onboarding).
--
-- Business rules encoded here:
--   * Public catalogs (restaurants, tags, geo, list metadata): anon + authenticated SELECT
--   * User-owned writes (lists, follows, reviews, …): authenticated DML; no anon
--   * Money path (subscriptions / snapshots / payments): authenticated SELECT only;
--     service_role writes (Stripe webhooks). No anon (Stripe ids / PII).
--   * Notifications: authenticated SELECT/UPDATE/DELETE; inserts via service_role
--   * Admin-only tables: service_role only (stripe_events, suggested_creators,
--     sponsored_restaurant_placements — clients use SECURITY DEFINER RPCs / admin UI)

-- ---------------------------------------------------------------------------
-- Geography (public read)
-- ---------------------------------------------------------------------------
GRANT SELECT ON TABLE public.cities TO anon;
GRANT SELECT ON TABLE public.cities TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.cities TO service_role;

GRANT SELECT ON TABLE public.countries TO anon;
GRANT SELECT ON TABLE public.countries TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.countries TO service_role;

GRANT SELECT ON TABLE public.states TO anon;
GRANT SELECT ON TABLE public.states TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.states TO service_role;

-- ---------------------------------------------------------------------------
-- Tags / restaurants (public read; reviews writable by authenticated)
-- ---------------------------------------------------------------------------
GRANT SELECT ON TABLE public.tags TO anon;
GRANT SELECT ON TABLE public.tags TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.tags TO service_role;

GRANT SELECT ON TABLE public.restaurants TO anon;
GRANT SELECT ON TABLE public.restaurants TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.restaurants TO service_role;

GRANT SELECT ON TABLE public.restaurant_tags TO anon;
GRANT SELECT ON TABLE public.restaurant_tags TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.restaurant_tags TO service_role;

GRANT SELECT ON TABLE public.restaurant_images TO anon;
GRANT SELECT ON TABLE public.restaurant_images TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.restaurant_images TO service_role;

GRANT SELECT ON TABLE public.restaurant_reviews TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.restaurant_reviews TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.restaurant_reviews TO service_role;

GRANT SELECT ON TABLE public.ugc_translation_cache TO anon;
GRANT SELECT ON TABLE public.ugc_translation_cache TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.ugc_translation_cache TO service_role;

-- ---------------------------------------------------------------------------
-- Lists (public can read published metadata via RLS; owners mutate)
-- ---------------------------------------------------------------------------
GRANT SELECT ON TABLE public.lists TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.lists TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.lists TO service_role;

GRANT SELECT ON TABLE public.list_items TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.list_items TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.list_items TO service_role;

GRANT SELECT ON TABLE public.list_item_must_try_dishes TO anon;
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.list_item_must_try_dishes TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.list_item_must_try_dishes TO service_role;

-- Memberships: client reads own rows; mutations go through SECURITY DEFINER RPCs.
GRANT SELECT ON TABLE public.list_members TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.list_members TO service_role;

-- Money path: Lists hub + paywall checks read as the signed-in user; Stripe
-- webhooks write as service_role. Never grant anon (subscriber Stripe ids).
GRANT SELECT ON TABLE public.list_subscriptions TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.list_subscriptions TO service_role;

GRANT SELECT ON TABLE public.list_subscription_payments TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.list_subscription_payments TO service_role;

GRANT SELECT ON TABLE public.list_snapshot_purchases TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.list_snapshot_purchases TO service_role;

-- ---------------------------------------------------------------------------
-- Users / social (no anon — public profiles use SECURITY DEFINER RPCs)
-- ---------------------------------------------------------------------------
GRANT INSERT, SELECT, UPDATE ON TABLE public.users TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.users TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.user_follows TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_follows TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.user_location_follows TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_location_follows TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.user_restaurant_tag_preferences TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_restaurant_tag_preferences TO service_role;

-- ---------------------------------------------------------------------------
-- Notifications (inserts are service_role via insertNotifications)
-- ---------------------------------------------------------------------------
GRANT DELETE, SELECT, UPDATE ON TABLE public.notifications TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.notifications TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.notification_preferences TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.notification_preferences TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.notification_mutes TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.notification_mutes TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.push_subscriptions TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.push_subscriptions TO service_role;

-- ---------------------------------------------------------------------------
-- Billing (signed-in Connect / checkout; webhooks use service_role)
-- ---------------------------------------------------------------------------
GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.customers TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.customers TO service_role;

-- ---------------------------------------------------------------------------
-- Service-role only (admin UI / webhooks / SECURITY DEFINER RPC internals)
-- ---------------------------------------------------------------------------
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.stripe_events TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.suggested_creators TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.sponsored_restaurant_placements TO service_role;

-- ---------------------------------------------------------------------------
-- Revoke over-broad grants left by older defaults / least-privilege mistakes.
-- Idempotent: safe when the privilege is already absent.
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE
  public.list_subscriptions,
  public.list_snapshot_purchases,
  public.list_subscription_payments,
  public.list_members,
  public.customers,
  public.users,
  public.user_follows,
  public.user_location_follows,
  public.user_restaurant_tag_preferences,
  public.notifications,
  public.notification_preferences,
  public.notification_mutes,
  public.push_subscriptions
FROM anon;

REVOKE ALL ON TABLE
  public.stripe_events,
  public.suggested_creators,
  public.sponsored_restaurant_placements
FROM anon, authenticated;

REVOKE INSERT ON TABLE public.notifications FROM authenticated;
REVOKE DELETE ON TABLE public.users FROM authenticated;
