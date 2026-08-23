/**
 * Resolve operator decisions on an article-list review.json.
 * Pure: no database. The Remotion CLI is a thin wrapper around this.
 */

const DECISIONS = new Set(['accept', 'drop', 'pick']);

/**
 * @param {unknown} row
 * @returns {{ ok: true, restaurantId: string | null } | { ok: false, error: string }}
 */
export function resolveExtractDecision(row) {
  if (!row || typeof row !== 'object') {
    return { ok: false, error: 'extract row is missing' };
  }
  const { decision } = row;
  if (!DECISIONS.has(decision)) {
    return { ok: false, error: `invalid decision ${JSON.stringify(decision)}` };
  }

  const restaurantId = typeof row.restaurant_id === 'string' ? row.restaurant_id : null;
  const pickedId = typeof row.picked_id === 'string' ? row.picked_id : null;
  const candidateIds = new Set(
    (Array.isArray(row.candidates) ? row.candidates : [])
      .map((c) => c?.id)
      .filter((id) => typeof id === 'string' && id)
  );

  if (decision === 'drop') {
    if (restaurantId || pickedId) {
      return {
        ok: false,
        error: `drop must not set restaurant_id or picked_id (${row.name ?? 'row'})`,
      };
    }
    return { ok: true, restaurantId: null };
  }

  if (decision === 'accept') {
    if (!restaurantId) {
      return { ok: false, error: `accept requires restaurant_id (${row.name ?? 'row'})` };
    }
    if (pickedId) {
      return { ok: false, error: `accept must not set picked_id (${row.name ?? 'row'})` };
    }
    return { ok: true, restaurantId };
  }

  if (!pickedId) {
    return { ok: false, error: `pick requires picked_id (${row.name ?? 'row'})` };
  }
  if (restaurantId) {
    return { ok: false, error: `pick must not set restaurant_id (${row.name ?? 'row'})` };
  }
  if (!candidateIds.has(pickedId)) {
    return { ok: false, error: `picked_id is not in candidates (${row.name ?? 'row'})` };
  }
  return { ok: true, restaurantId: pickedId };
}

/**
 * @param {{ list_name?: unknown, confirmed_at?: unknown, extracted?: unknown }} review
 * @param {{ iConfirmed?: boolean }} [opts]
 * @returns {{ ok: true, restaurantIds: string[], listName: string } | { ok: false, error: string }}
 */
export function resolveArticleListConfirm(review, opts = {}) {
  const listName = typeof review?.list_name === 'string' ? review.list_name.trim() : '';
  if (!listName) {
    return { ok: false, error: 'list_name is required' };
  }

  const confirmed =
    opts.iConfirmed === true ||
    (typeof review?.confirmed_at === 'string' && review.confirmed_at.trim().length > 0);
  if (!confirmed) {
    return { ok: false, error: 'set confirmed_at or pass --i-confirmed' };
  }

  const extracted = Array.isArray(review?.extracted) ? review.extracted : null;
  if (!extracted) {
    return { ok: false, error: 'extracted must be an array' };
  }

  const restaurantIds = [];
  for (let i = 0; i < extracted.length; i += 1) {
    const row = extracted[i];
    const resolved = resolveExtractDecision(row);
    if (!resolved.ok) {
      return { ok: false, error: `extracted[${i}]: ${resolved.error}` };
    }
    if (resolved.restaurantId) restaurantIds.push(resolved.restaurantId);
  }

  return { ok: true, restaurantIds, listName };
}
