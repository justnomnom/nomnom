/**
 * Normalize `review_consensus.signature_dishes` (string[] or `{ label }[]`).
 *
 * @param {unknown} raw
 * @returns {string[]}
 */
export function signatureDishLabelsFromConsensus(raw) {
  if (!raw || typeof raw !== 'object') return [];
  const dishes = /** @type {Record<string, unknown>} */ (raw).signature_dishes;
  if (!Array.isArray(dishes)) return [];

  const seen = new Set();
  return dishes.reduce((out, item) => {
    let label = '';
    if (typeof item === 'string') label = item.trim();
    else if (item && typeof item === 'object' && typeof item.label === 'string') {
      label = item.label.trim();
    }
    if (!label) return out;
    const key = label.toLowerCase();
    if (seen.has(key)) return out;
    seen.add(key);
    out.push(label);
    return out;
  }, []);
}
