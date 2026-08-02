/**
 * English copy resolution for share cards and social metadata.
 *
 * Cards and `<meta>` tags are baked once per URL and served to every crawler, so they cannot
 * follow the viewer's language. English is the same choice the roleta page already makes for
 * its own `metadata`. The strings still live in both locale files so they stay reviewable
 * alongside the rest of the copy — `__tests__/og-locale-parity.test.mjs` fails the build if
 * one of them drifts.
 *
 * Plain JS on purpose: imported from both `.js` pages and `.tsx` image routes, and importing
 * `.ts` from ESLint-strict JS is a known snag here (see `src/libs/site-url.js`).
 */

import { getDefaultTranslation } from 'src/locales/default-translations';

import { pluralKey, fillPlaceholders } from './og-text-format';

// ----------------------------------------------------------------------

/**
 * Resolve a locale key and fill `{{placeholders}}`.
 *
 * @param {string} key dotted locale path, e.g. `pages.lists.og_profile_tagline`.
 * @param {Record<string, string | number>} [values]
 * @returns {string} empty string when the key is missing or is not a leaf.
 */
export function ogText(key, values) {
  return fillPlaceholders(getDefaultTranslation(key), values);
}

/**
 * i18next-style `_one` / `_other` plural pick, resolved through {@link ogText}.
 *
 * @param {string} baseKey key without the plural suffix, e.g. `pages.lists.og_followers`.
 * @param {number} count
 * @returns {string}
 */
export function ogPlural(baseKey, count) {
  return ogText(pluralKey(baseKey, count), { count });
}
