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

/** Reads English locale for SSR titles and OG text. Cache-bust: contentHub + ui_locale. */
export const getDefaultTranslation = (key) => lookup(enTranslations, key);

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
