/**
 * Pure tally helpers for Table voting (unit-testable).
 */

/**
 * @param {Record<string, { up?: number, down?: number, net?: number }> | null | undefined} tallies
 * @param {string[]} restaurantIds
 * @returns {{ restaurantId: string, up: number, down: number, net: number }[]}
 */
export function rankTallies(tallies, restaurantIds) {
  const map = tallies && typeof tallies === 'object' ? tallies : {};
  const ids = Array.isArray(restaurantIds) ? restaurantIds.filter(Boolean).map(String) : [];
  const rows = ids.map((restaurantId) => {
    const t = map[restaurantId] || {};
    const up = Number(t.up) || 0;
    const down = Number(t.down) || 0;
    const net = Number.isFinite(Number(t.net)) ? Number(t.net) : up - down;
    return { restaurantId, up, down, net };
  });
  return rows.toSorted((a, b) => {
    if (b.net !== a.net) return b.net - a.net;
    if (b.up !== a.up) return b.up - a.up;
    return a.restaurantId.localeCompare(b.restaurantId);
  });
}

/**
 * @param {Record<string, { up?: number, down?: number, net?: number }> | null | undefined} tallies
 * @param {string[]} restaurantIds
 * @returns {string | null}
 */
export function pickWinnerId(tallies, restaurantIds) {
  const ranked = rankTallies(tallies, restaurantIds);
  return ranked[0]?.restaurantId ?? null;
}
