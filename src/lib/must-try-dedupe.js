/**
 * Normalize for deduping visible chips (same dish in different languages/casing).
 * @param {string} displayLabel
 */
export function mustTryDisplayDedupeKey(displayLabel) {
  if (typeof displayLabel !== 'string') return '';
  return displayLabel.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Drop later rows whose `display_label` matches an earlier row (after normalization).
 * Keeps sort_order order among survivors.
 * @param {Array<{ display_label: string } & Record<string, unknown>>} rows
 */
export function dedupeMustTryDishesByDisplayLabel(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return list.reduce(
    (acc, r) => {
      const key = mustTryDisplayDedupeKey(r?.display_label ?? '');
      if (!key || acc.seen.has(key)) {
        return acc;
      }
      acc.seen.add(key);
      acc.list.push(r);
      return acc;
    },
    { seen: /** @type {Set<string>} */ (new Set()), list: /** @type {typeof rows} */ ([]) }
  ).list;
}
