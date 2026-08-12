import { ic } from 'src/assets/icons';

/**
 * Pure list-tile copy/icon helpers — JSX-free for unit tests.
 */

/** Small icon representing the list's visibility state. */
export function listVisibilityIcon(list) {
  if (list?.visibility === 'public_subscribers') return ic.walletMoneyLinear;
  if (list?.visibility === 'public') return ic.globeLinear;
  return ic.lockBold;
}

/** Subtitle line: spot count (same copy everywhere lists appear). */
export function listSpotsVisibilitySubtitle(t, list) {
  const n = list?.item_count ?? 0;
  return t(n === 1 ? 'pages.lists.spot_count_one' : 'pages.lists.spot_count_other', { count: n });
}

/**
 * Optional owner prefix for hubs that mix owned + followed lists (e.g. saved index).
 * Returns null when no owner line should show.
 */
export function listHubOwnerPrefix(t, list) {
  const handle = list?.owner_username?.trim();
  const show = handle || list?.owner_display_name?.trim();
  if (!show) return null;
  const name = handle ? `@${handle}` : list.owner_display_name.trim();
  return t('pages.dashboard.lists.list_owner_line', { name });
}

/** Portrait list tile thumbnail — keep profile skeletons and create tiles in sync. */
export const NOM_NOM_LIST_COMPACT_THUMB_PX = 96;
