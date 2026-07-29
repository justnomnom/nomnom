import { paths } from './paths';

/**
 * Known `?from=` values for restaurant detail — maps to a typed `nav-back` parent.
 * Unknown / missing values fall back to `router.back()`.
 *
 * @param {string | null | undefined} from
 * @param {{ listId?: string | null }} [opts]
 * @returns {string | null}
 */
export function resolveRestaurantNavBackHref(from, opts = {}) {
  switch (from) {
    case 'roleta':
      return paths.site.rouletteLisboa;
    case 'roulette':
      return paths.dashboard.roulette;
    case 'discover':
      return paths.dashboard.discover;
    case 'map':
      return paths.dashboard.map;
    case 'lists':
      return paths.dashboard.lists;
    case 'list':
      return opts.listId ? paths.dashboard.listDetails(opts.listId) : paths.dashboard.lists;
    default:
      return null;
  }
}

/**
 * Appends `from` / `listId` query params for restaurant navigations that should support typed back.
 *
 * @param {string} restaurantPath
 * @param {string | null | undefined} from
 * @param {{ listId?: string | null }} [extra]
 * @returns {string}
 */
export function restaurantHrefWithFrom(restaurantPath, from, extra = {}) {
  if (!from) return restaurantPath;
  const params = new URLSearchParams();
  params.set('from', from);
  if (extra.listId) params.set('listId', String(extra.listId));
  return `${restaurantPath}?${params.toString()}`;
}
