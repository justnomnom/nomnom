import enTranslations from './langs/en.json';
import ptTranslations from './langs/pt.json';

/**
 * Walk a nested locale object by dotted key.
 * @param {object} dict
 * @param {string} key
 */
function lookup(dict, key) {
  return key.split('.').reduce((value, k) => {
    if (value && typeof value === 'object') {
      return value[k];
    }
    return undefined;
  }, dict);
}

/**
 * English fallback for keys that have no viewer-lang string yet. Cache-bust: localizedMeta + mesaNames + spotsNotPlaces + mapEmpty.
 *
 * Returns `''` rather than the raw value for a missing key or a branch node, so
 * the inferred type stays `string` instead of widening to `string | object` with
 * the shape of `en.json`. Without this, every caller that passes the result
 * somewhere typed — `ogText`, the Playwright `getByLabel`/`getByRole` specs —
 * fails `tsc` whenever the locale files gain a nested key.
 *
 * `''` (not the key) is the established contract: `fillPlaceholders` already
 * collapses non-strings to `''`, and `ogText` documents an empty string for a
 * missing key. Echoing the key back would print `pages.foo.bar` onto share cards.
 *
 * @param {string} key dotted locale path, e.g. `pages.contact_us.form.email`.
 * @returns {string} the leaf string, or `''` when missing or not a leaf.
 */
export const getDefaultTranslation = (key) => {
  const value = lookup(enTranslations, key);
  return typeof value === 'string' ? value : '';
};

/**
 * Locale string for server-rendered chrome. Substitutes `{{name}}` vars when provided.
 * @param {'en' | 'pt' | string} lang
 * @param {string} key
 * @param {Record<string, string | number>} [vars]
 * @returns {string}
 */
export function getTranslation(lang, key, vars) {
  const dict = String(lang || '')
    .toLowerCase()
    .startsWith('pt')
    ? ptTranslations
    : enTranslations;
  const raw = lookup(dict, key);
  const enFallback = lookup(enTranslations, key);
  const fromDict = typeof raw === 'string' ? raw : enFallback;
  let text = typeof fromDict === 'string' ? fromDict : key;
  if (vars) {
    text = Object.entries(vars).reduce(
      (acc, [name, value]) => acc.replaceAll(`{{${name}}}`, String(value)),
      text
    );
  }
  return text;
}
