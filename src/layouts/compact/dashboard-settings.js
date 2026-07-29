import { paths } from 'src/routes/paths';

/**
 * Dashboard settings hub + drill-ins under `/dashboard/settings/*`,
 * and in-app public profile under `/dashboard/u/:handle`.
 * Large screens: top AppBar + side nav (no bottom bar). Small screens: same as other dashboard routes (bottom nav, no top bar).
 */
export function isDashboardSettingsRoute(pathname) {
  if (!pathname) return false;
  const root = paths.dashboard.settings;
  const userPrefix = `${paths.dashboard.root}/u`;
  return (
    pathname === root ||
    pathname.startsWith(`${root}/`) ||
    pathname === userPrefix ||
    pathname.startsWith(`${userPrefix}/`)
  );
}

/** Full-bleed dashboard map (no Main `SPACING` padding). */
export function isDashboardMapRoute(pathname) {
  return Boolean(pathname && pathname === paths.dashboard.map);
}

const RESTAURANTS_PREFIX = `${paths.dashboard.root}/restaurants/`;

/**
 * `/dashboard/restaurants/:id` — hero + sheet layout; same Main insets as map (safe-area + nav only).
 */
export function isDashboardRestaurantDetailRoute(pathname) {
  if (!pathname || !pathname.startsWith(RESTAURANTS_PREFIX)) return false;
  const slug = pathname.slice(RESTAURANTS_PREFIX.length);
  return Boolean(slug && !slug.includes('/'));
}
