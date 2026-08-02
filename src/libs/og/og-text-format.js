/**
 * Pure text formatting for the share cards.
 *
 * Separate from `og-text.js` so it can be unit-tested: that module imports
 * `default-translations`, which imports JSON without an import attribute — fine under
 * webpack, unloadable under Node's ESM loader, and a module-level import fires even when a
 * test only wants the pure helpers. That the real keys exist in both locales is covered by
 * `__tests__/og-locale-parity.test.mjs`, which reads the locale files from disk.
 */

/**
 * Substitute `{{placeholders}}`.
 *
 * An unsupplied placeholder is left intact rather than blanked, so the gap is visible in
 * review instead of silently swallowing a value.
 *
 * @param {unknown} text
 * @param {Record<string, string | number>} [values]
 * @returns {string} empty string for a non-string input.
 */
export function fillPlaceholders(text, values) {
  if (typeof text !== 'string') return '';
  if (!values) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (match, name) =>
    values[name] === undefined ? match : String(values[name])
  );
}

/**
 * i18next-style `_one` / `_other` suffix. Zero takes the plural form, matching i18next.
 *
 * @param {string} baseKey key without the suffix, e.g. `pages.lists.og_followers`.
 * @param {number} count
 * @returns {string}
 */
export function pluralKey(baseKey, count) {
  return `${baseKey}${count === 1 ? '_one' : '_other'}`;
}
